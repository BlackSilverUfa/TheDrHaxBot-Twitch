if (msg.init) {
    context.set('answers', msg.payload, 'memory');
    node.status('Ready');
    return;
}

const { range, find } = _; // = require('lodash');
const { choose, random, rchoose, wchoose, smartJoin } = flow.get('func', 'memory');
const { actions, targets } = context.get('answers', 'memory');

const user = msg.payload.userstate.username;
const mentions = Object.entries(msg.parsed.mentions_list.reduce((obj, curr) => {
    obj[curr] = (obj[curr] || 0) + 1;
    return obj;
}, {}));

function bite(user) {
    switch (user) {
        case 'my4hoe': return 'мучное NomNom';

        case '<@692736268567707719>':
        case 'kovalenko_p':
        case 'tomatepotato':
            if (random() > 0.25) break;

            return choose([
                'потат Tastge 🥔',
                'батат Tastge 🍠',
                'томат Tastge 🍅',
                'пюрешку Tastge',
                'попат slapSlap',
                'ботат MrDestructoid',
                'ляжку catNom',
                'котат ' + choose([
                    'MYAAA',
                    'catNom',
                    'MEOW'
                ]),
                'купат Tastge'
            ]);

        case 'theanatoliygamer':
        case 'anatoliygamer':
            if (random() < 0.25) break;
            return choose([
                'Чон Со Ён AYAYA',
                'Winter of Aespa AYAYA',
            ]);

        case 'hurmaowosh1':
            return choose([
                'пирожок Tastge',
                'хурму Tastge',
                'овощ Tastge'
            ]);

        case 'myasnoe_file': return 'филе popCat';
        case 'i_pipa': return 'пипу PETTHEPEEPO';
    }

    const res = rchoose(targets);

    if (res.indexOf('бан') === 0) {
        const ctx = flow.get('context', 'file')[msg.payload.channel];
        const m = find(ctx, (m) => m.payload.userstate.username === user);
        if (m) msg.api.timeout(60, 'кусь catNom', m.payload.userstate['user-id']);
    }

    return res;
}

if (mentions.length == 0) {
    msg.reply = `/me ${rchoose(actions)}`;
    mentions.push([user, 1]);
} else {
    msg.reply = `@${user} ${rchoose(actions)}`;
}

const match = msg.parsed.command.match(/^к(у*)с[ьт]/i);
const count = match ? match[1].length : 1;

if (msg.parsed.command.match(/ку*ст/i)) {
    msg.reply += `, однако спотыкается о куст`;

    if (mentions.length == 0) {
        msg.reply += `, промахивается мимо @${user}`;
    }

    msg.reply += ' и кусает себя ' + (count > 0 ? 'за ' : '');
    msg.reply += smartJoin(range(Math.min(count, 3)).map(() => bite(user)), ' , ');
} else {
    msg.reply += ' и кусает ';

    if (mentions.length <= 3) {
        msg.reply += smartJoin(mentions.map(([user]) => (
            `@${user} ` +
            (count > 0 ? 'за ' : '') +
            smartJoin(range(Math.min(count, 3)).map(() => bite(user)), ' , ')
        )), ' , ');
    } else {
        msg.reply += smartJoin(mentions.map(([user]) => `@${user}`));

        if (count > 0) {
            msg.reply += ` за ${bite()}`;
        }
    }
}

return msg;
