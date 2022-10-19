const { amongo, renderTemplate } = flow.get('func', 'memory');
const { uniq } = lodash; // = require('lodash');

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

const commands = await amongo(DB, 'find', {
    '$where': `'${msg.parsed.command}'.match(new RegExp('^(' + this.pattern + ')$', 'i'))`,
    'channel': '#blackufa', // msg.payload.channel
    'enabled': true,
});

if (commands.length === 0) {
    return;
}

const command = commands[0];
msg.command = command;

switch (command.type) {
    case 'helper':
        return [msg, null, null, null];
    
    case 'counter':
        return [null, msg, null, null];
    
    case 'function':
        return [null, null, msg, null];
    
    case 'native':
        return [null, null, null, msg];

    default:
        node.error('Unknown command type: ' + command.type, msg);
}

