const { tokenize, choose, renderTemplate } = flow.get('func', 'memory');

if (msg.init) {
    const index = new MiniSearch({
        fields: ['id'],
        searchOptions: {
            prefix: true,
            fuzzy: 0,
            // combineWith: 'AND',
        },
        tokenize,
    });

    index.addAll(Object.keys(msg.payload).map((key) => ({ id: key })));

    node.status(`${Object.keys(msg.payload).length} ответов`);

    context.set('answers', msg.payload, 'memory');
    context.set('index', index, 'memory');
    return;
}

const [answers, index] = context.get(['answers', 'index'], 'memory');

let query = msg.parsed.query_filtered;

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

const [result] = index.search(query);

if (result != null) {
    const answer = answers[result.id];

    if (typeof(answer) == 'object') {
        if (answer.items) {
            msg.key = null;
            let choice = choose(answer.items);
            msg.reply = answer.prefix + choice;

            if (answer.suffix) {
                msg.reply += renderTemplate(answer.suffix, {
                    index: answer.items.indexOf(choice) + 1,
                    total: answer.items.length,
                });
            }
        } else if (answer.answer) {
            msg.key = result.id;
            msg.reply = answer.answer;
        }
    } else {
        msg.key = result.id;
        msg.reply = answer;
    }
} else {
    msg.key = null;
    msg.reply = "пока не знаю KEKWait";
}

return msg;
