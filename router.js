const { amongo, twitch, renderTemplate } = flow.get('func', 'memory');
const { uniq, range } = lodash; // = require('lodash');

const DB = 'twitch_commands';

if (msg.init || !context.get('pattern', 'memory')) {
    const cmds = await amongo(DB, 'find', {
        enabled: true,
    });

    const patterns = uniq(cmds.map((h) => h.pattern));
    const pattern = '^(' + patterns.join('|') + ')$';

    context.set('pattern', new RegExp(pattern, 'i'), 'memory');
    node.status(`${patterns.length} rules`);

    if (msg.init) return;
}

const pattern = context.get('pattern', 'memory');

if (!pattern || !msg.parsed.command.match(pattern)) {
    return;
}

let channel = msg.payload.channel;

if (channel === '#thedrhax') {
    channel = '#blackufa';
}

const [command] = await amongo(DB, 'find', {
    '$where': `'${msg.parsed.command}'.match(new RegExp('^(' + this.pattern + ')$', 'i'))`,
    'channel': channel,
    'enabled': true,
});

if (!command) {
    return;
}

msg.command = command;

if (command.cooldown && !msg.parsed.cooldown_bypass) {
    const now = +new Date();
    const cdMap = context.get('cooldown', 'memory') || {};
    const cd = command.cooldown;

    const channelKey = `${command._id}`;
    const userKey = `${command._id}|${msg.payload.userstate.username}`;

    Object.entries(cdMap)
        .filter(([k]) => k.startsWith(command._id))
        .filter(([k, v]) => v + Math.max(cd.channel, cd.user) * 1000 < now)
        .map(([key]) => delete cdMap[key])

    let isCd = (cdMap[channelKey] || 0) + cd.channel * 1000 > now;
    isCd ||= (cdMap[userKey] || 0) + cd.user * 1000 > now;
    isCd &&= msg.parsed.level > 1;

    if (isCd) {
        msg.api.delete();
        return;
    }

    cdMap[channelKey] = now;
    cdMap[userKey] = now;

    context.set('cooldown', cdMap, 'memory');
}

const index = [
    'helper',
    'counter',
    'function',
    'native',
    'countup'
].indexOf(command.type);

if (index < 0) {
    node.error(`Unknown command type: ${command.type}`, msg);
} else {
    node.send(
        range(index + 1)
            .map((i) => (i == index ? msg : null))
    );
}

