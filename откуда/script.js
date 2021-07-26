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

function tokenize(string) {
    string = string.toLowerCase().replace(/ё/g, 'е').trim();
    return string.split(' ').map((word) => {
        const match = word.match(/[a-zа-я0-9]+/g);
        return match ? match.join('') : null;
    }).filter((x) => x != null);
}

function fts(query, items, lambda) {
    query = tokenize(query);
    let maxRank = 0;

    return items
        .map((item) => {
            const words = tokenize(lambda(item));

            const rank = query.map((queryWord) => (
                words.filter((word) => word.startsWith(queryWord)).length > 0
            )).reduce((a, b) => a + b);

            if (rank > maxRank) {
                maxRank = rank;
            }

        return { item, rank };
    })
    .filter((item) => item.rank === maxRank && item.rank > 0)
    .map((item) => item.item);
}

function choose(list) {
    return list[Math.floor(Math.random() * list.length)]
}

async function main() {
    let query = msg.parsed.query_filtered;
    const answers = await get(context, 'answers', 'memory');

    if (tokenize(query).length == 0) {
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

    for (let [key, answer] of Object.entries(answers)) {
        if (typeof(answer) == 'object' && answer.regex) {
            let regex = new RegExp(answer.regex, 'ig');

            if (query.match(regex)) {
                query = query.replace(regex, key);
            }
        }
    }
    
    let results = fts(query, Object.keys(answers), (x) => x);

    if (results.length === 0) {
        msg.key = null;
        msg.reply = "пока не знаю KEKWait";
    } else {
        let key = results[0];
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
