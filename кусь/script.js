if (msg.init) {
    context.set('answers', msg.payload, 'memory');
    node.status('Ready');
    return;
}

const { range } = _; // = require('lodash');
const { choose, rchoose, wchoose, smartJoin } = flow.get('func', 'memory');
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
            if (Math.random() < 0.5) break;

            return wchoose([
                'потат Tastge popCat',
                'батат Tastge',
                'томат Tastge',
                'пюрешку Tastge',
                'попат slapSlap',
                'ботат MrDestructoid',
                'ляжку catNom',
            ], [15, 15, 25, 30, 10, 5]);

        case 'theanatoliygamer':
        case 'anatoliygamer':
            if (Math.random() < 0.5) break;
            return 'Чон Со Ён AYAYA';

        case 'hurmaowosh1':
            return wchoose([
                'пирожок Tastge',
                'хурму Tastge',
                'овощ Tastge'
            ], [20, 30, 50]);

        case 'myasnoe_file': return 'филе popCat';
        case 'i_pipa': return 'пипу PETTHEPEEPO';
    }

    return rchoose(targets);
}

if (mentions.length == 0) {
    msg.reply = `/me ${rchoose(actions)}`;
} else {
    msg.reply = `@${user} ${rchoose(actions)}`;
}

if (msg.parsed.command == 'куст') {
    msg.reply += `, однако спотыкается о куст`;

    if (mentions.length == 0) {
        msg.reply += `, промахивается мимо @${user}`;
    }

    msg.reply += ` и кусает себя за ${bite(user)}`;
} else {
    msg.reply += ' и';

    if (mentions.length > 3) {
        const how = rchoose(['каким-то образом', 'изподвыподверта']);
        msg.reply += ` ${how} одновременно`;
    }

    msg.reply += ' кусает ';

    if (mentions.length == 0) {
        msg.reply += `@${user} за ${bite(user)}`;
    } else if (mentions.length > 0 && mentions.length <= 5) {
        msg.reply += smartJoin(mentions.map(([user, count]) => (
            `@${user} за ` + smartJoin(range(Math.min(count, 3)).map(() => bite(user)), ' , ')
        )), ' , ');
    } else if (mentions.length > 5) {
        msg.reply += smartJoin(mentions.map(([user]) => `@${user}`)) + ` за ${bite()}`;
    }
}

return msg;

