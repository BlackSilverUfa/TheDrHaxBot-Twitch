if (msg.init) {
    const data = { ...msg.payload };
    context.set('data', data, 'memory');
    node.status('Ready');
    return;
}

const { concat } = _; // = require('lodash');
const { choose, renderTemplate } = flow.get('func', 'memory');
const { getAllForms } = flow.get('inflector', 'memory');
const { static_proverbs, suffixes, proverbs } = context.get('data', 'memory');

let args = msg.parsed.query_filtered.split(' ');

let word;

switch (args[0]) {
    case 'enable':
    case 'disable':
        if (msg.parsed.level > 1) return;

        const disabled = args[0] === 'disable';
        context.set('disabled', disabled, 'file');

        if (!disabled) {
            msg.reply = 'динамические пословицы включены SeemsGood';
        } else {
            msg.reply = 'динамические пословицы отключены SeemsGood';
        }

        return msg;

    case 'про':
    case 'о':
    case 'об':
    case 'обо':
        if (context.get('disabled', 'file')) {
            if (msg.parsed.level > 1 && !msg.parsed.function) {
                return;
            }
        }

        if (args.length == 1) {
            msg.reply = 'про что? SMOrc';
            return msg;
        }

        let forms = getAllForms(
            args.slice(1).join(' '),
            args[0] === 'про' ? [['accs'], ['gent'], ['nomn']] : [['loct']],
        );

        word = { forms };
        break;

    default:
        word = { forms: getAllForms(choose(Object.keys(static_proverbs)), [['nomn']]) };
}

const allProverbs = concat(proverbs, static_proverbs[word.forms.nomn] || []);
msg.reply = renderTemplate(choose(allProverbs), word.forms);

const suffix = suffixes[word.forms.nomn];

if (suffix) {
    msg.reply += suffix;
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

