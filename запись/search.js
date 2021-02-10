function get(context, key, store_name) {
    return new Promise((resolve, reject) => {
        context.get(key, store_name, (err, value) => {
            if (err) {
                reject(err);
            } else {
                resolve(value);
            }
        });
    });
}

function set(context, key, value, store_name) {
    return new Promise((resolve, reject) => {
        context.set(key, value, store_name, (err) => {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        });
    });
}

// -----------------------------------------

const require = global.get('require');
const lunr = require('lunr');
const translit = require('cyrillic-to-translit-js')();

const Sugar = require('sugar');
require('sugar/locales/ru');
Sugar.Date.setLocale('ru');

function strip(string) {
    return translit.transform(string).trim().split(' ').map((word) => {
        let match = word.toLowerCase().match(/[a-zа-я0-9]+/g);
        return match ? match.join('') : '';
    }).join(' ');
}

// -----------------------------------------

if (msg.mode == 'init') {
    async function init() {
        // Source: https://blackufa.thedrhax.pw/data/categories.json
        const categories = await get(flow, 'blackufa_categories');
        
        const games = [].concat(...Object.keys(categories).map((key) => {
            let category = categories[key];
            
            if (category.search === false) {
                return [];
            }
            
            return [].concat(...category.games.map((game) => {
                game = {...game};
                game.group = category.name;
        
                let names = game.name.split(' / ');
        
                if (names.length > 1) {
                    return names.map((name) => {
                        let subref = {...game};
                        subref.name = name;
                        return subref;
                    });
                } else {
                    return game;
                }
            }));
        }));

        let counter = 0;
        const index = lunr(function () {
            this.field('name');
            this.ref('id');
    
            games.map((game) => {
                this.add({
                    name: strip(game.name),
                    id: counter++
                });
            });
        });

        await Promise.all([
            set(context, 'games', games, 'memory'),
            set(context, 'index', index, 'memory')
        ]);

        node.status(`${games.length} игр`);

        return null;
    }
    
    return init();
}

// -----------------------------------------

const SEGMENT_HASH_REGEX = /^([0-9]+(\.[0-9]+|,)?)+$/;

async function main() {
    const [segments, games, index] = await Promise.all([
        // Source: https://blackufa.thedrhax.pw/data/segments.json
        get(flow, 'blackufa_segments'),
        get(context, 'games', 'memory'),
        get(context, 'index', 'memory')
    ]);

    if (msg.parsed.query_filtered.match(SEGMENT_HASH_REGEX)) {
        let segment = segments[msg.parsed.query_filtered];

        if (!segment || segment.games.length == 0) {
            segment = null;

            if (msg.parsed.query_filtered.indexOf(',') !== -1) {
                let joined_parts = msg.parsed.query_filtered.split(',');

                for (let i = 0; i < joined_parts.length; i++) {
                    let part = joined_parts[i];

                    if (Object.keys(segments).indexOf(part) !== -1) {
                        segment = segments[part];
                        break;
                    }
                }
            } else {
                let candidates = Object.keys(segments)
                    .filter((k) => k.indexOf(',') !== -1)
                    .filter((k) => k.split(',').indexOf(msg.parsed.query_filtered) !== -1);

                if (candidates.length > 0) {
                    segment = segments[candidates[0]];
                }
            }
        }

        if (segment) {
            msg.results = [{
                id: msg.parsed.query_filtered,
                name: segment.name,
                year: segment.date.substr(0, 4)
            }];

            return msg;
        }
    }
    
    let parsed_date = Sugar.Date.create(msg.parsed.query_filtered);

    if (parsed_date) {
        parsed_date = Sugar.Date.advance(parsed_date, {hours: 3});
        parsed_date = Sugar.Date.format(parsed_date, '%Y-%m-%d');
        // parsed_date = parsed_date.toISOString().substr(0, 10);

        msg.results = Object.entries(segments).filter(([key, data]) => {
            return data.date == parsed_date
        }).filter(([key, data]) => {
            return data.games.length > 0;
        }).map(([key, data]) => {
            let id = key;

            // Replace joined id with first free segment
            if (id.indexOf(',') !== -1) {
                let candidates = id.split(',').filter((id) => {
                    return !segments[id] || segments[id].games.length === 0;
                });
    
                if (candidates.length > 0) {
                    id = candidates[0];
                }
            }
            
            return {
                name: data.name,
                year: data.date.substr(0, 4),
                id: id
            };
        });

        return msg;
    }

    let query = strip(msg.parsed.query_filtered);
    let results = index.search(query);
    let max_rank = 0;

    msg.results = results.map((x) => {
        let game = {...games[x.ref]};

        let rank = Object.keys(x.matchData.metadata).length;
        if (rank > max_rank) {
            max_rank = rank;
        }

        // Replace joined id with first free segment
        if (game.id.indexOf(',') !== -1) {
            let candidates = game.id.split(',').filter((id) => {
                return !segments[id] || segments[id].games.length === 0;
            });

            if (candidates.length > 0) {
                game.id = candidates[0];
            }
        }

        game.score = x.score;
        game.rank = rank;
        return game;
    }).filter((x) => x.rank == max_rank).splice(0, 5);

    return msg;
}

return main();
