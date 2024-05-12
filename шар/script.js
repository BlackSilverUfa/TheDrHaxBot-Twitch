const ANSWERS = {
    positive: [
        'определённо да YEPPERS',
        'можешь быть уверен в этом YEPPERS',
        'никаких сомнений YEPPERS',
        'абсолютли YEPPERS',
        'ну естественно YEPPERS',
        'да YEPPERS'
    ],

    plausible: [
        'хорошие шансы SeemsGood',
        'вероятнее всего SeemsGood',
        'думаю, что да SeemsGood',
        'не исключено SeemsGood',
        'немаловероятно SeemsGood'
    ],

    uncertain: [
        'пока не ясно peepoThink',
        'не уверен peepoThink',
        'тут всё не так однозначно peepoThink',
        'скажу за небольшую сумму, BSUDAI',
        'не стоит вскрывать эту тему. Вы молодые, шутливые, вам все легко. Это не то. Погибнут ВСЁ monkaGunshake'
    ],

    implausible: [
        'да нет, наверное BSUHee',
        'шансы не очень BSUHee',
        'скорее нет, чем да BSUHee',
        'я бы не надеялся BSUHee'
    ],

    negative: [
        'даже не надейся NOPERS',
        'весьма сомнительно NOPERS',
        'определённо нет NOPERS',
        'вероятность КРАЙНЕ мала NOPERS',
        'никогда в жизни NOPERS',
        'нет, просто нет NOPERS'
    ]
};

const CONTINUATIONS = [
    'а всёёё BSUHee',
    'аня ANYA',
    'анлаки BSUHee',
    'алло peepoPhone',
    'ада, я люблю тебя ANYA',
    'абсолютли YEPPERS',
    'аыаыа ANYA',
    'ауф 🐺',
    'апчхи ANYA',
    'артур YEPP',
    'аsus ඞ',
    'амамам popCat',
    'амогус ඞ',
    'а gun with one bullet MrDestructoid',
    'аяя AYAYA',
    'ага YEPPERS',
    'ass gachiBASS',

    'бан monkaBAN',
    'батат BSULoot',
    'буба BOOBA',
    'боря CatCrying',
    'борода popCat',
    'блюй пей dead5What MedTime',
    'бежать некуда ariW',
    'бипки ppHop',
    'бирюса popCat',

    'вертуфайзен bUrself',
    'вы продоёте рыбов? ANYA',
    'выходной peepoComfy',

    'гивасасай monkaChrist',

    'даме да не, даме йо даме на но йо KasugaYeah',
    'димооон LetMeIn CatCrying',
    'джерри peepoPhonexmas',

    'если не мы, то кто? KKomrade',
    'еш ANYA',

    'жесть Zhest',

    'облизан Tastge',
    'ооо, элден ринг KOgasm',
    'оп оп PepoG',
    'оп па Pepega',
    'оползень popCat',
    'огнеопасно gachiOnFIRE',
    'омск LetMeIn',

    'маления Jammies Клинок Микеллы Jammies',
    'мифа BibleThump',
    'мила AYAYA',
    'мегамаки gachiHYPER',

    'ну Дииима Jebaited',
    'ноо popCat ноо popCat ноо popCat',

    'реакция мангуста Pepega',

    'скайрим toddW',
    'сос мыслом ANYA',
    'сов падение BSUbl',
    'супер YEPPERS',
    'не еш, подумой CatCrying',
    'ничоси Pog',

    'испанцы! BSURage',
    'игры YEPPERS',
    'игорь тонет CatCrying',
    'итан ariW',
    'и впредь так держать Pepega',

    'уль BSUWait',
    'уву UwU',
    'ууууУУУУ BSUbl',
    'уот так уот BSUFlex',
    'уголь Tastge',

    'Памела Андерсон BSUHey',
    'планер дай Jebaited',
    'повтор YEPPERS',
    'поползень popCat',
    'пипа PETTHEPEEPO',
    'попа peepoGiggles',
    'понимаю YEPPERS',
    'погибнут ВСЁ monkaEyes',
    'попола AYAYA',
    'девола AYAYA',

    'ташон CatCrying',
    'ты кто? Jebaited',
    'ты не имеешь права, о ты не имеешь права LetMeIn',

    'кб ANYA',
    'кто, если не мы? KKomrade',
    'кукинг стрим завтра Agakakskagesh',
    'куля-буля ANYA',
    'куляля ANYA',
    'куку, ипта ANYA',
    'кукусики NomNom',
    'кул кола KEKLEO',
    'купи toddW',
    'кусь catNom',
    'кушац Tastge',
    'крыжовник терпкий, сладкая сирень ANYA',
    'кодзима гений Kojimaptyp',
    'кози peepoBlanket',
    'ктулху фхтагн Squid1 Squid2 Squid3 Squid4',
    
    'найс KEKLEO',

    'фэмэлэ ANYA',

    'ыаыаы ANYA',

    'хочу к другу CatCrying',
    'хубики ANYA',
    'ху I really want you to call me back... хуууууу CatCrying',

    'шорэ пиппи popCat',

    'эбби pepeSmack',
    'энвайронментал сторителлинг ANYA',

    'я охотник Pepega'
];

const CHOICES = [
    'скорее всего {x} peepoThink',
    'определённо {x} YEPPERS',
    '{x} — наш выбор SeemsGood',
    'мне кажется, что {x} peepoThink',
    'конечно же {x} YEPPERS'
];

const FIXED_ANSWERS = {
    '^(ты кто|кто ты)': () => choose([
        'а ты кто? Jebaited',
        'конь в пальто Jebaited',
        'нет, ты кто? Jebaited'
    ]),

    '^пинг$': () => 'понг Pepega',
    '^би+п$': () => choose([
        '...ки ppHop',
        'буп MrDestructoid',
        'не бипай Jebaited',
    ]),
    '^пу+к$': () => choose([
        'не пукай Jebaited',
        'Dushno',
    ]),
    '^пи+п(ни|\\s|$)': () => choose([
        ...Object.keys(flow.get('emotes', 'file'))
            .filter((k) => k.startsWith('PETTHE'))
            .map((k) => `пип ${k}`),
        'поп popCat',
        'пуп 💩',
        'не пипай Jebaited',
        '...а peepoGiggles'
    ]),

    '^(а\\s)?может\\s': () => 'а может тебя? Jebaited',

    '^балл?он с чем': () => choose([
        'с пропаааном! Pepega',
        'с воздухом BSUHee',
        'с ворванью! Pepega',
        'со сжиженным вакуумом ANYA'
    ]),

    '^((нет,? )?ты потрясающий)': () => choose([
        'да, я такой Kappa',
        'нет, ты потрясающий! keanU',
        'я знаю Kappa',
        'нет, ты keanU'
    ]),

    '.*пахсив.*': () => choose([
        'пахсив YEPPERS',
        'мелюзина NOPERS',
    ]),
    '.*пашив.*': () => choose([
        'пашив YEPPERS',
        'мелюзина NOPERS',
    ]),
    '^oratrice': () => 'Jammies Mecanique BSUJam d\'Analyse kiryuJAM Cardinale OUIP',

    '^omae wa mou shindeiru': () => 'nani?! BSURage',
    '^osmanthus': () => '...wine tastes the same as I remember KEKLEO',
    '^osmanthus wine': () => '...tastes the same as I remember KEKLEO',
    '^(h?e\\s?(he)+|х?[еи]\\s?(х[еи])+)(\\s|$)': (match) => (
        `${match[1]} tte nandayo?! loliTriggered`
    ),

    '^я календарь переверну': () => 'и снова 3-е Сентября MmmHmm',
    '^я календарь': () => 'переверну, и снова 3-е Сентября MmmHmm',
    '^лада седан\\.*$': () => 'баклажан! Pepega 🍆',

    '^я (шепну|прошепчу) тебе на ушко': () => choose([
        'аннигиляторная пушка! PepegaAim',
        'аннигиляторная клюшка! BSURage golfClub'
    ]),
    '^[UO][wωv][UO]$': () => choose(['UωU', 'òωó', 'OωO', 'ಠ_ಠ', '👁 👄 👁']),

    '^(а\\s*)?будет\\s+кукинг': () => choose([
        'конечно будет, уже завтра Agakakskagesh',
        'кукинг стрим завтра! Если завтра уже наступило, прочитайте это сообщение ещё раз Agakakskagesh'
    ]),

    '^как\\s+([^?]*)': (match) => {
        msg.parsed.query_filtered = `оцени что-нибудь во ${choose(['ка', 'пу'])}ках`;
        return main();
    },

    '^где\\s+([^?]*)': (match) => {
        const answers = [
            'там keanU',
            'завтра будет Agakakskagesh',
            'на бороде Jebaited',
            'не скажу NOPERS',
            'не знаю KEKWait',
            'в Караганде bufaBaited',
            'в slapSlap',
            'за тобой ariW golfClub',
            'туть bufaLove',
            'так вот же keanU',
        ];

        if (match[1]) {
            answers.push(`все спрашивают "где ${match[1]}?", но никто не спрашивает "как ${match[1]}?" KEKWait`);
        }

        return choose(answers);
    },

    '^вы прод[ао][её]те ([^?]+)(\\?.*|$)': (match) => {
        switch (match[1].toLowerCase()) {
            case 'скайримов':
                return 'да toddW';
            
            default:
                return 'нет, только показываем ANYA';
        }
    },
};

// =====================================================

const { random, choose, wchoose, renderTemplate, agreeWithNum, smartJoin } = flow.get('func', 'memory');
const { parse, inflect } = flow.get('inflector', 'memory');

const choice = (x) => renderTemplate(choose(CHOICES), { x });

const translate = (text, from, to) => (
    text.split('')
        .map((c) => (to[from.indexOf(c)] || c))
        .join('')
);

const distinct = (text) => (
    text.split('')
        .reduce((p, c) => (p[p.length - 1] == c ? p : `${p}${c}`))
);

const continueStr = (text) => {
    text = text.toLowerCase();
    text = translate(text, 'a', 'а');
    text = distinct(text).replace(/[.…]*$/, '');

    if (text.length === 0) {
        return null;
    }

    return choose(
        CONTINUATIONS
            .filter((x) => translate(x, 'a', 'а').toLowerCase().startsWith(text))
            .map((x) => x.substring(text.length))
    );
};

const substringBefore = (text, x) => {
    const index = text.indexOf(x);
    return index === -1 ? text : text.substring(0, index);
};

const startsWithAny = (text, list = []) => {
    for (let x of list) {
        if (text.startsWith(x)) {
            return true;
        }
    }
    return false;
}

const countDecimals = function (x) {
    if (Math.floor(x) === x) return 0;
    return x.toString().split('.')[1].length || 0;
};

// =====================================================

const main = () => {
    const query = msg.parsed.query_filtered;
    let match;

    if (query.length === 0) {
        const [_, vowels] = msg.payload.message.match(/^!ш+([ао]+)р+/i) || ['а'];
        return choose([
            `чт${translate(vowels, 'АаОоУу', 'ОоАаОо')}? Jebaited`,
            `${translate(vowels, 'Оо', 'Аа')}? Jebaited`
        ]);
    }

    for (let key in FIXED_ANSWERS) {
        if (match = msg.parsed.query_filtered.match(new RegExp(key, 'i'))) {
            return FIXED_ANSWERS[key](match);
        }
    }

    if (match = continueStr(msg.parsed.query_filtered)) {
        return `...${match}`;
    }

    if (msg.parsed.emotesOnly && msg.parsed.emotes.length <= 3) {
        return msg.parsed.query_filtered;
    }

    if (substringBefore(query, '?').match(/\s(или|or)\s/)) {
        let options = substringBefore(query, '?')
            .replace(/\s(или|or)\s/, ', ')
            .split(', ')
            .map((x) => x.trim());

        if (startsWithAny(options[0].toLowerCase(), [
            'во что', 'что', 'как', 'где', 'куда', 'когда', 'кто',
            'какой', 'какая', 'какое', 'какие',
        ])) {
            options.splice(0, 1);
        }

        if (options.length === 2) {
            if (`не ${options[0]}` === options[1]) {
                if (options[0] === 'будь') {
                    return 'сделай же что-нибудь LetMeIn';
                }

                return 'вот в чём вопрос Kojimaptyp';
            } else if (`not ${options[0]}` === options[1]) {
                return 'that is the question Kojimaptyp';
            } else if (options[0] === options[1]) {
                return 'да YEPPERS';
            }
        }

        return choice(choose(options));
    }

    if (match = query.match(/расставь( .+)?: (.+)/i)) {
        let [_, __, items] = match;
        items = items.replace(/ (и|или) /, ', ').split(/, ?/);

        const itemsSorted = [];
        while (items.length > 0) {
            itemsSorted.push(
                items.splice(Math.floor(random() * items.length), 1)
            );
        }

        return choice(smartJoin(itemsSorted, ', ', choose([
            ' и в конце - ',
            ' и наконец - ',
            ' и затем ',
            ', '
        ])));
    }

    if (match = query.match(/от ([+-]?[0-9\.e]+) до ([+-]?[0-9\.e]+)/i)) {
        let [_, a, b] = match;
        [a, b] = [a, b].map((x) => Number(x)).sort((a, b) => a - b);

        const x = random() * (b - a) * 1.2 + a - (b - a) * 0.1;

        if (x > b) {
            return `думаю, что больше ${b} YEPPERS`;
        } else if (x < a) {
            return `думаю, что меньше ${a} NOPERS`;
        } else {
            const precision = Math.max(countDecimals(a), countDecimals(b));
            return choice(x.toFixed(precision));
        }
    }

    if (match = query.match(/сколько (.+) из ([0-9]+)/i)) {
        const [_, term, range] = match;
        const x = Math.floor(random() * (Number(range) + 1));

        const pluralizedTerm = term
            .split(' ')
            .map((word) => inflect(
                parse(word, ['gent', 'plur']),
                agreeWithNum(x, [
                    ['nomn', 'sing'],
                    ['gent', 'sing'],
                    ['gent', 'plur']
                ])
            ))
            .join(' ');

        return choice(`${x} ${pluralizedTerm} из ${range}`);
    }

    if (match = query.match(/оцени(.*) во? (.+)/i)) {
        const term = match[2];
        const x = Math.floor(random() * 11);

        const pluralizedTerm = term
            .split(' ')
            .map((word) => inflect(
                parse(word, ['loct', 'plur']),
                agreeWithNum(x, [
                    ['nomn', 'sing'],
                    ['gent', 'sing'],
                    ['gent', 'plur']
                ])
            ))
            .join(' ');

        return choice(`${x} ${pluralizedTerm} из 10`);
    }

    if (match = query.match(/оцени(\s.*)?/i)) {
        const x = Math.floor(random() * 11);
        return choice(`${x} из 10`);
    }

    return choose(wchoose(Object.values(ANSWERS), [10, 10, 2, 10, 10]));
}

msg.reply = main();
return msg;

