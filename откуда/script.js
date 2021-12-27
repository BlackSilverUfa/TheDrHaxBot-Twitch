const { tokenize } = flow.get('func', 'memory');

function strip(string) {
    return tokenize(string).join(' ');
}

function choose(list) {
    return list[Math.floor(Math.random() * list.length)]
}

if (msg.init) {
    lunrStemmer(lunr);
    lunrRu(lunr);
    lunrMulti(lunr);

    const index = lunr(function() {
        this.use(lunr.multiLanguage('en', 'ru'));
        this.pipeline.remove(lunr.stopWordFilter);
        this.pipeline.remove(lunr.ru.stopWordFilter);
        this.field('query');
        this.ref('id');

        Object.entries(msg.payload).forEach(([key, answer]) => {
            this.add({
                id: key,
                query: strip(key)
            });
        });
    });

    node.status(`${Object.keys(msg.payload).length} ответов`);

    context.set('answers', msg.payload, 'memory');
    context.set('index', index, 'memory');
    return;
}

const [answers, index] = context.get(['answers', 'index'], 'memory');

let query = strip(msg.parsed.query_filtered);

if (query.length == 0) {
    const examples = [];

    while (examples.length < 10) {
        let x = choose(Object.keys(answers));

        if (x.indexOf(' / ') !== -1) {
            x = choose(x.split(' / '));
        }

        if (examples.indexOf(x) === -1) {
            examples.push(x);
        }
    }

    msg.key = null;
    msg.reply = 'примеры запросов: ' + examples.join(' | ');
    return msg;
}

Object.entries(answers)
    .filter(([k, a]) => typeof(a) == 'object' && a.regex)
    .forEach(([k, a]) => {
        let regex = new RegExp(a.regex, 'ig');

        if (query.match(regex)) {
            query = query.replace(regex, k);
        }
    });

let max_rank = 0;

const results = index.search(query).map((x) => {
    const keywords = Object.keys(x.matchData.metadata);
    const rank = keywords.length;

    if (rank > max_rank) {
        max_rank = rank;
    }

    return { ref: x.ref, rank };
}).filter((x) => x.rank == max_rank).map((x) => x.ref);

if (results.length === 0) {
    msg.key = null;
    msg.reply = "пока не знаю KEKWait";
} else {
    const key = results[0];
    const answer = answers[key];

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
