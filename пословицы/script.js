if (msg.init) {
    const data = {...msg.payload};

    data.words = Object.assign({},
        ...data.words.map(w => ({
            [w.forms.nomn.toLowerCase()]: w
        }))
    );

    context.set('data', data, 'memory');
    node.status('Ready');
    return;
}

const { choose, renderTemplate } = flow.get('func', 'memory');
const { words, proverbs } = context.get('data', 'memory');

const word = words[msg.parsed.icommand] || choose(Object.values(words));
msg.reply = renderTemplate(choose([...proverbs, ...word.specials]), word.forms);

if (msg.parsed.icommand == 'поползень') {
    msg.reply += ' popCat';
} else {
    msg.reply += ' ' + choose([
        'BUFANerd',
        'SeemsGood',
        'CoolStoryBob',
        'YEPPERS',
        'PepoG'
    ]);
}

return msg;
