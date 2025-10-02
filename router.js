const { amongo, twitch, renderTemplate } = flow.get('func', 'memory');
const { uniq, range } = lodash; // = require('lodash');

const DB = 'twitch_commands';
const OUTPUTS = [
    'helper',
    'counter',
    'function',
    'native',
    'countup',
    'music',
    'cooldown'
];

if (msg.init || !context.get('pattern', 'memory')) {
    const settings = await amongo('twitch_channels', 'find', {});

    const chroot = {};
    for (let channel of settings) {
        if (channel.plugins?.chroot) {
            chroot[channel._id] = channel.plugins.chroot;
        }
    }
    context.set('chroot', chroot, 'memory');

    const cmds = await amongo(DB, 'find', {
        enabled: true,
    });

    const patterns = uniq(cmds.map((h) => h.pattern));
    const pattern = '^(' + patterns.join('|') + ')$';

    context.set('pattern', new RegExp(pattern, 'i'), 'memory');
    node.status(`${patterns.length} rules`);

    if (msg.init) return;
}

if (msg.origin.self) {
    return;
}

const pattern = context.get('pattern', 'memory');
const chroot = context.get('chroot', 'memory') || {};

if (!pattern || !msg.parsed.command.match(pattern)) {
    return;
}

let channel = msg.origin.channel;

if (chroot[channel]) {
    channel = chroot[channel];
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

msg.api.cooldown = {
    reset_user: () => {
        const cdMap = context.get('cooldown', 'memory') || {};
        const userKey = `${command._id}|${msg.origin.userstate.username}`;
        delete cdMap[userKey];
        context.set('cooldown', cdMap, 'memory');
    },
};

if (command.cooldown && !msg.parsed.cooldown_bypass) {
    const now = +new Date();
    const cdMap = context.get('cooldown', 'memory') || {};
    const cd = command.cooldown;

    const channelKey = `${command._id}`;
    const userKey = `${command._id}|${msg.origin.userstate.username}`;

    Object.entries(cdMap)
        .filter(([k]) => k.startsWith(command._id))
        .filter(([k, v]) => v + Math.max(cd.channel, cd.user) * 1000 < now)
        .map(([key]) => delete cdMap[key])

    const isCdChannel = (cdMap[channelKey] || 0) + cd.channel * 1000 > now;
    const isCdUser = (cdMap[userKey] || 0) + cd.user * 1000 > now;
    const isCd = (isCdChannel || isCdUser) && msg.parsed.level > 1;

    if (isCd) {
        msg.cooldown = { isCdChannel, isCdUser };
        const index = OUTPUTS.indexOf('cooldown');
        return range(index + 1).map((i) => (i == index ? msg : null));
    }

    cdMap[channelKey] = now;
    cdMap[userKey] = now;

    context.set('cooldown', cdMap, 'memory');
}

const index = OUTPUTS.indexOf(command.type);

if (index < 0) {
    node.error(`Unknown command type: ${command.type}`, msg);
} else {
    node.send(
        range(index + 1)
            .map((i) => (i == index ? msg : null))
    );
}

