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

if (msg.init) {
    set(context, 'answers', msg.payload, 'memory');
    return;
}

// -----------------------------------------

const elasticlunr = require('elasticlunr@0.9.5');
const translit = require('cyrillic-to-translit-js@3.1.0')();

function strip(string) {
    string = string.toLowerCase().replace(/ё/g, 'е');
    return translit.transform(string).trim().split(' ').map((word) => {
        let match = word.match(/[a-zа-я0-9]+/g);
        return match ? match.join('') : '';
    }).join(' ');
}

function choose(list) {
    return list[Math.floor(Math.random() * list.length)]
}

async function main() {
    let query = msg.parsed.query_filtered;
    const answers = await get(context, 'answers', 'memory');

    if (strip(query).length == 0) {
        let examples = [];
    
        while (examples.length < 10) {
            let x = choose(Object.keys(answers));

            if (x.indexOf('/') !== -1) {
                x = choose(x.split('/'));
            }

            if (examples.indexOf(x) === -1) {
                examples.push(x);
            }
        }

        msg.key = null;
        msg.reply = 'примеры запросов: ' + examples.join(' | ');
        return msg;
    }

    elasticlunr.clearStopWords();
    elasticlunr.addStopWords([
        'of', 'the', 'я', 'и', 'с', 'на', 'не', 'из', 'о', 'за', 'в'
    ].map((s) => strip(s)));
    
    const index = elasticlunr();
    index.addField('query');
    index.setRef('id');

    for (let [key, answer] of Object.entries(answers)) {
        if (typeof(answer) == 'object' && answer.regex) {
            let regex = new RegExp(answer.regex, 'ig');

            if (query.match(regex)) {
                query = query.replace(regex, key);
            }
        }

        index.addDoc({
            id: key,
            query: strip(key)
        });
    }
    
    let results = index.search(strip(query));
    
    if (results.length === 0) {
        msg.key = null;
        msg.reply = "пока не знаю KEKWait";
    } else {
        msg.score = results[0].score;
        
        let key = results[0].ref;
        let answer = answers[key];

        if (typeof(answer) == 'object') {
            if (answer.items) {
                msg.key = null;
                msg.reply = answer.prefix + choose(answer.items);
                
                if (answer.suffix) {
                    msg.reply += answer.suffix;
                }
            } else if (answer.answer) {
                msg.key = key;
                msg.reply = answer.answer;
            }
        } else {
            msg.key = key;
            msg.reply = answer;
        }
    }

    return msg;
}

main().then(function (msg) {
    node.send(msg);
});
