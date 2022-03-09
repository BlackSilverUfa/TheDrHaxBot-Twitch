if (msg.init) {
    context.set('answers', msg.payload, 'memory');
    node.status('Ready');
    return;
}

const { rchoose, smartJoin } = flow.get('func', 'memory');
const { actions, targets } = context.get('answers', 'memory');

const mentions = msg.parsed.mentions_list;
const user = msg.payload.userstate.username;

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
    
    msg.reply += ` и кусает себя`;
} else {
    msg.reply += ' и';

    if (mentions.length > 1) {
        const how = rchoose(['каким-то образом', 'изподвыподверта']);
        msg.reply += ` ${how} одновременно`;
    }

    msg.reply += ' кусает ';

    if (mentions.length > 0) {
        msg.reply += smartJoin(mentions.map((user) => `@${user}`));
    } else {
        msg.reply += `@${user}`;
    }
}

if (mentions.length == 1 && mentions[0] == 'my4hoe') {
    msg.reply += ' за мучное NomNom';
} else if (mentions.length == 1 && mentions[0] == 'myasnoe_file') {
    msg.reply += ` за филе popCat`;
} else if (mentions.length == 1 && mentions[0] == 'i_pipa') {
    msg.reply += ` за пипу PETTHEPEEPO`;
} else {
    msg.reply += ` за ${rchoose(targets)}`;
}

return msg;
