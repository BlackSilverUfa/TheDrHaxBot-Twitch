// const Az = require('az');
const { intersection, concat, find } = _; // = require('lodash');
const { choose, renderTemplate } = flow.get('func', 'memory');

const CASES = ['nomn', 'gent', 'datv', 'accs', 'ablt', 'loct'];

const STATIC_HINTS = {
    'и': [['CONJ']],
    'кукусик': [['anim', 'sing']],
    'кукусики': [['anim', 'plur']],
    'аду': [['femn', 'accs', 'NOUN']],
    'аде': [['femn', 'loct', 'NOUN']]
};

const BLACKLIST = [
    'элой',
    'пепе',
    'миядзаки',
];

const isTitle = (word) => word[0] === word[0].toUpperCase();
const title = (word) => word[0].toUpperCase() + word.substring(1);

const parse = (word, hints = []) => {
    if (BLACKLIST.indexOf(word.toLowerCase()) !== -1) {
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

    hints = STATIC_HINTS[word.toLowerCase()] || hints;

    const filtered = hints.map((tags) => (
        find(parsed, (w) => (
            intersection(concat(w.tag.stat, w.tag.flex), tags).length === tags.length
        ))
    )).filter(Boolean).sort((a, b) => b.score - a.score);

    const result = filtered[0] || parsed[0];
    result.title = isTitle(word);

    return result;
}

const inflect = (word, tags) => {
    if (word.tag.NUMR) {
        tags = tags.filter(tag => tag !== 'sing' && tag !== 'plur');
    }

    if (word.tag.GNdr) tags.push(word.tag.GNdr);

    const newWord = word.inflect(tags);
    const res = newWord ? newWord.word : word.word;
    return word.title ? title(res) : res;
};

const inflectAll = (words, tags) => words.map((word) => inflect(word, tags)).join(' ');

const getAllForms = (text, hints = []) => {
    const words = text.split(' ').map((w) => parse(w, hints));
    const forms = {};

    CASES.map((CAse) => {
        forms[CAse] = inflectAll(words, [CAse, 'sing']);
        forms[`${CAse}_plur`] = inflectAll(words, [CAse, 'plur']);
    });

    return forms;
}

flow.set('inflector', { parse, inflect, getAllForms }, 'memory');
node.status('Ready');

