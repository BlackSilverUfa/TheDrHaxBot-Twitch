const { choose, smartJoin } = flow.get('func', 'memory');

const from = [
    'выпрыгивает из-за угла',
    'нападает из кустов',
    'выбирается из подвала',
    'запрыгивает в форточку',
    'вылезает из вентиляции',
    'выбирается из горящего танка',
    'высовывается из шкафа',
    'пролезает сквозь текстуры',
    'выходит из КБ',
    'возникает из ниоткуда',
    'тихо кродёться',
    'влетает с двух ног',
    'выползает из под кровати',
    'выскакивает из тени',
    'вываливается из пододеяльника',
    'вскакивает на коня'
];

const what = [
    'за ASS gachiBASS',
    'за жопу gachiHYPER',
    'за Орду SMOrc',
    'за глаз WutFace',
    'за бровь monkaWipe',
    'за пятку ariW',
    'за ICQ Aptisha',
    'за сосок BSUHey',
    'за ляжку PepeLaugh',
    'за тыщу, BSUDAI',
    'за нос dead5What',
    'за палец BSUTrolled',
    'за себя и за Сашку BSURage',
    'за любовь FeelsLoveMan',
    'за монолит в конце-то концов gachiBASS',
    'за ушко Kappa',
    'за бочок 🐺',
    'за подмышку DansGame',
    'за пипу PETTHEPEEPO',
    'за кукусики NomNom',
    'за шоколадные кукисы NomNom',
    'за борщ ANYA',
    'за мегамаки gachiHYPER',
    'за бодунгер, бонгер-бонгер Pepega',
    'за стримера PETTHEAPTEEPO',
    'за поползня popCat',
    'за Ктулху Squid1 Squid3 Squid4',
    'за Капитана Курицу MonkaChiken',
    'за ШАААР OMEGALUL',
    'за шею VAMPPE',
    'за окрошку Tastge',
    'за хурму Tastge',
    'за амогуса ඞ'
];

const how = [
    'каким-то образом',
    'изподвыподверта'
];

const mentions = msg.parsed.mentions_list;
const user = msg.payload.userstate.username;

if (mentions.length == 0) {
    msg.reply = `/me ${choose(from)}`;
} else {
    msg.reply = `@${user} ${choose(from)}`;
}

if (msg.parsed.command == 'куст') {
    msg.reply += `, однако спотыкается о куст`;

    if (mentions.length == 0) {
        msg.reply += `, промахивается мимо @${user}`;
    }
    
    msg.reply += ` и кусает себя`;
} else {
    msg.reply += ' и';

    if (mentions.length > 1) {
        msg.reply += ` ${choose(how)} одновременно`;
    }

    msg.reply += ' кусает ';

    if (mentions.length > 0) {
        msg.reply += smartJoin(mentions.map((user) => `@${user}`));
    } else {
        msg.reply += `@${user}`;
    }
}

if (mentions.length == 1 & mentions[0] == 'my4hoe') {
    msg.reply += ' за мучное NomNom';
} else {
    msg.reply += ` ${choose(what)}`;
}

return msg;
