if (msg.init) {
    const data = {...msg.payload};
    context.set('data', data, 'memory');
    node.status('Ready');
    return;
}

// const Az = require('az');
const { intersection, concat, find } = lodash; // = require('lodash');
const { choose, renderTemplate } = flow.get('func', 'memory');
const { static_proverbs, blacklist, suffixes, hints_override, proverbs } = context.get('data', 'memory');

const CASES = ['nomn', 'gent', 'datv', 'accs', 'ablt', 'loct'];

function isTitle(word) {
    return word[0] === word[0].toUpperCase();
}

function title(word) {
    return word[0].toUpperCase() + word.substring(1);
}

function parse(word, hints = []) {
    if (blacklist.indexOf(word.toLowerCase()) !== -1) {
        const parsed = {
            word,
            tag: {
                stat: [],
                flex: [],
            },
            title: isTitle(word),
        };
        
        parsed.inflect = (() => parsed).bind(parsed);
        return parsed;
    }
    
    const parsed = Az.Morph(word, {
        forceParse: true,
    });

    hints = hints_override[word.toLowerCase()] || hints;

    const filtered = hints.map((tags) => (
        find(parsed, (w) => (
            intersection(concat(w.tag.stat, w.tag.flex), tags).length === tags.length
        ))
    )).filter(Boolean).sort((a, b) => b.score - a.score);

    const result = filtered[0] || parsed[0];
    result.title = isTitle(word);

    return result;
}

function inflectAll(words, tags) {
    return words.map((word) => {
        if (word.tag.NUMR) {
            tags = tags.filter(tag => tag !== 'sing' && tag !== 'plur');
        }

        if (word.tag.GNdr) tags.push(word.tag.GNdr);

        const newWord = word.inflect(tags);
        const res = newWord ? newWord.word : word.word;
        return word.title ? title(res) : res;
    }).join(' ');
}

function getAllForms(text, hints = []) {
    const words = text.split(' ').map((w) => parse(w, hints));
    const forms = {};

    CASES.map((CAse) => {
        forms[CAse] = inflectAll(words, [CAse, 'sing']);
        forms[`${CAse}_plur`] = inflectAll(words, [CAse, 'plur']);
    });

    return forms;
}

let args = msg.parsed.query_filtered.split(' ');

// ¯\_(ツ)_/¯
if (msg.payload.userstate.username === 'diecon') {
    args = args.filter((w) => w !== 'член');
}

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
            args[0] === 'про' ? [['accs'], ['gent']] : [['loct']],
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
