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
require('lunr-languages/lunr.stemmer.support')(lunr);
require('lunr-languages/lunr.ru')(lunr);
require('lunr-languages/lunr.multi')(lunr);

const Sugar = require('sugar');
require('sugar/locales/ru');
Sugar.Date.setLocale('ru');

function strip(string) {
    return string.trim().split(' ').map((word) => {
        let match = word.toLowerCase().match(/[a-zа-я0-9]+/g);
        return match ? match.join('') : '';
    }).join(' ');
}

// -----------------------------------------

function short_segment_id(segments, id) {
    // Replace joined id with first free segment
    if (id.indexOf(',') !== -1) {
        let candidates = id.split(',').filter((id) => {
            return !segments[id] || segments[id].games.length === 0;
        });

        if (candidates.length > 0) {
            id = candidates[0];
        }
    }

    return id;
}

if (msg.mode == 'init') {
    async function init() {
        const [categories, segments] = await Promise.all([
            // Source: https://blackufa.thedrhax.pw/data/categories.json
            get(flow, 'blackufa_categories'),
            // Source: https://blackufa.thedrhax.pw/data/segments.json
            get(flow, 'blackufa_segments')
        ]);

        const games = [].concat(...Object.keys(categories).map((key) => {
            let category = categories[key];

            if (category.search === false) {
                return [];
            }

            return [].concat(...category.games.map((game) => {
                game = {...game};
                game.group = category.name;

                if (game.start === undefined) { // game
                    game.url = `bsu.us.to/${game.id}`;
                } else { // segment
                    let short_id = short_segment_id(segments, game.segment);
                    game.url = `bsu.us.to/${short_id}`;

                    if (game.start > 0) {
                        game.url += `?at=${game.start}`;
                    }
                }

                return game;
            }));
        }));

        let counter = 0;
        const index = lunr(function () {
            this.use(lunr.multiLanguage('en', 'ru'));

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

function find_by_id(segments, query) {
    if (!msg.parsed.query_filtered.match(SEGMENT_HASH_REGEX)) {
        return [];
    }

    let segment = segments[query];

    if (!segment || segment.games.length == 0) {
        segment = null;

        if (query.indexOf(',') !== -1) {
            let joined_parts = query.split(',');

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
                .filter((k) => k.split(',').indexOf(query) !== -1);

            if (candidates.length > 0) {
                segment = segments[candidates[0]];
            }
        }
    }

    return segment ? [{
        url: `bsu.us.to/${query}`,
        name: segment.name,
        year: segment.date.substr(0, 4)
    }] : [];
}

function find_by_date(segments, query) {
    let date = Sugar.Date.create(msg.parsed.query_filtered, { past: true });

    if (date == 'Invalid Date') {
        return [];
    }

    date = Sugar.Date.advance(date, { hours: 3 });
    date = Sugar.Date.format(date, '%Y-%m-%d');

    return Object.entries(segments).filter(([key, data]) => {
        return data.date == date && data.games.length > 0;
    }).map(([key, data]) => {
        let id = short_segment_id(segments, key);

        return {
            name: data.name,
            year: data.date.substr(0, 4),
            url: `bsu.us.to/${id}`
        };
    });
}

function find_by_text(index, games, segments, query) {
    query = strip(query);
    let results = index.search(query);
    let max_rank = 0;

    return results.map((x) => {
        let game = {...games[x.ref]};

        let keywords = Object.keys(x.matchData.metadata);

        // Filter results with only numbers as keywords
        if (keywords.filter(x => isNaN(Number(x))).length == 0) {
            return null;
        }

        let rank = keywords.length;
        if (rank > max_rank) {
            max_rank = rank;
        }

        game.score = x.score;
        game.rank = rank;
        return game;
    }).filter(x => x !== null).filter(x => x.rank == max_rank).splice(0, 5);
}

async function main() {
    const [segments, games, index] = await Promise.all([
        // Source: https://blackufa.thedrhax.pw/data/segments.json
        get(flow, 'blackufa_segments'),
        get(context, 'games', 'memory'),
        get(context, 'index', 'memory')
    ]);
    
    if (msg.parsed.query_filtered.startsWith('дай')) {
        msg.results = [games[Math.floor(Math.random() * games.length)]];
        return msg;
    }

    let results = find_by_id(segments, msg.parsed.query_filtered);

    if (results.length > 0) {
        msg.results = results;
        return msg;
    }

    results = find_by_date(segments, msg.parsed.query_filtered);

    if (results.length > 0) {
        msg.results = results;
        return msg;
    }

    msg.results = find_by_text(index, games, segments, msg.parsed.query_filtered);
    return msg;
}

return main();
