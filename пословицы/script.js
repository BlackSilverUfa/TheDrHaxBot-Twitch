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

const AF = global.get('actionflows');
const { choose, renderTemplate } = flow.get('func', 'memory');
const { words, proverbs } = context.get('data', 'memory');

const args = msg.parsed.query_filtered.split(' ');
let word;

switch (args[0]) {
    case 'про':
        const newWord = args[1];

        const { payload: forms } = await AF.invoke('pymorphy inflect', {
            payload: newWord
        });

        if (!forms || typeof(forms) != 'object') {
            msg.reply = 'я не знаю такого слова SMOrc';
            return msg;
        }

        word = { forms, specials: [] };
        break;

    default:
        word = words[msg.parsed.icommand] || choose(Object.values(words));
}

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
