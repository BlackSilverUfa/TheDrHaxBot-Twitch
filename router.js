const { amongo, renderTemplate } = flow.get('func', 'memory');
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

const commands = await amongo(DB, 'find', {
    '$where': `'${msg.parsed.command}'.match(new RegExp('^(' + this.pattern + ')$', 'i'))`,
    'channel': channel,
    'enabled': true,
});

if (commands.length === 0) {
    return;
}

const command = commands[0];
msg.command = command;

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

