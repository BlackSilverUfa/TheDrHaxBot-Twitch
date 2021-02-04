const elasticlunr = require('elasticlunr@0.9.5');
const translit = require('cyrillic-to-translit-js@3.1.0')();

function strip(string) {
    return translit.transform(string).trim().split(' ').map((word) => {
        let match = word.toLowerCase().match(/[a-zа-я0-9]+/g);
        return match ? match.join('') : '';
    }).join(' ');
}

const SEGMENT_HASH_REGEX = /^([0-9]+(\.[0-9]+|,)?)+$/;
const segments = msg.segments;

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

let query = strip(msg.parsed.query_filtered);

elasticlunr.clearStopWords();
elasticlunr.addStopWords(['of', 'the']);

const index = elasticlunr();
index.addField('name');
index.setRef('id');

let games = msg.index;
let counter = 0;

games.map((game) => {
    index.addDoc({
        name: strip(game.name),
        id: counter++
    });
});

let results = index.search(query);

msg.results = results.map((x) => {
    let game = games[x.ref];
    
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
    return game;
}).filter((x) => x.score >= 2).splice(0, 5);

return msg;

