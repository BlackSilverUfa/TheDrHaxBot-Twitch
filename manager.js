if (msg.parsed.level > 1) { // vips and down
    return;
}

const { NFA, JS } = refa; // = require('refa');

function regexToNFA(regex) {
    const { expression, maxCharacter } = JS.Parser.fromLiteral(regex).parse();
    return NFA.fromRegex(expression, { maxCharacter });
}

function regexFromNFA(fa) {
    const literal = JS.toLiteral(fa.toRegex());
    return new RegExp(literal.source, literal.flags);
}

function findConflicts(regex, commands) {
    const nfa = regexToNFA(regex);
    return commands.map((command, i) => {
        const cmdregex = new RegExp(command.pattern, 'i');
        const intersection = NFA.fromIntersection(nfa, regexToNFA(cmdregex));
        return [i, regexFromNFA(intersection).source !== '[]'];
    }).filter(([i, r]) => r).map(([i, r]) => commands[i]);
}

const DB = 'twitch_commands';
const CHANNEL_DB = 'twitch_channels';

const {
    last,
    renderTemplate,
    amongo,
    Patterns: { COMMAND, COMMAND_NAME },
    smartJoin,
    updateText,
} = flow.get('func', 'memory');

function reply(reply) {
    node.send([{ ...msg, reply }, null]);
}

function reload() {
    node.send([null, { init: true }]);
}

async function isValidCommand(command) {
    const match = command.name.match(COMMAND_NAME);

    if (!match || match[0] !== command.name) {
        reply(`недопустимое имя команды "${command.name}"`);
        return false;
    }

    switch (command.type) {
        case 'music':
            if (['artist', 'track', 'album'].map((t) => command.text.indexOf(`{${t}}`) !== -1).indexOf(true) === -1) {
                reply('шаблон ответа должен содержать хотя бы одну переменную (artist, track или album)');
                return false;
            }
    }

    const commands = await amongo(DB, 'find', {
        _id: { $ne: command._id },
        channel: command.channel
    });

    try {
        const regex = new RegExp(command.pattern, 'i');
        const conflicts = findConflicts(regex, commands);

        if (conflicts.length > 0) {
            const cname = conflicts[0].name;
            reply(`регулярное выражение конфликтует с командой "${cname}"`);
            return false;
        }
    } catch (e) {
        node.error(e, msg);
        reply('не удалось скомпилировать регулярное выражение');
        return false;
    }

    const conflicts = commands
        .filter(c => command.name.match(new RegExp(`^(${c.pattern})$`, 'i')));
    if (conflicts.length > 0) {
        reply(`"${command.name}" - это алиас команды "${conflicts[0].name}"`);
        return false;
    }

    return true;
}

async function saveCommand(command) {
    if (!await isValidCommand(command)) return false;
    const res = await amongo(DB, 'save', command);
    reload();
    return res;
}

async function deleteCommand(command) {
    await amongo(DB, 'remove', { _id: command._id });
    return true;
}

async function findCommand(channel, name) {
    let [command] = await amongo(DB, 'find', { channel, name });

    if (command) {
        return [command, false];
    }

    [command] = await amongo(DB, 'find', {
        channel,
        $where: `'${name}'.match(new RegExp('^(' + this.pattern + ')$', 'i'))`
    });

    if (command) {
        return [command, true];
    }

    return [null, null];
}

async function cmdShow(channel, [name]) {
    if (!name) {
        reply('пример: show <имя>');
        return;
    }

    const [command] = await findCommand(channel, name);

    if (!command) {
        reply(`команда "${name}" не найдена`);
        return;
    }

    switch (command.type) {
        case 'helper':
        case 'counter':
        case 'countup':
            reply(`шаблон ответа: "${command.text}"`);
            break;

        case 'function':
            reply(`вызывает команду "${command.text}"`);
            break;

        case 'native':
            reply(`вызывает нативную команду с ID "${command._id}"`);
            break;

        default:
            reply(`невозможно отобразить команду типа ${command.type}`);
    }
}

async function cmdList(channel, [name]) {
    if (name && name[0] !== '#') {
        const [command] = await findCommand(channel, name);

        if (command == null) {
            reply(`команда "${name}" не найдена`);
        } else {
            reply(`команда "${command.name}" реагирует на: ${command.pattern}`);
        }

        return;
    }

    const commands = await amongo(DB, 'find', { channel });

    if (commands.length === 0) {
        reply('пока что нет ни одной команды');
        return;
    }

    const maxLength = 500 - msg.payload.userstate.username.length - 'доступные команды (NN/NN): '.length;

    const pages = commands.map(c => {
        const hasAlias = c.pattern.indexOf('|') !== -1 || c.type === 'alias';
        const flags = (hasAlias ? '⁺' : '') + (c.enabled ? '' : ' (⏻)');
        return c.name + flags;
    }).sort().reduce((acc, cur) => {
        if (acc[acc.length - 1].length + cur.length + 2 > maxLength) { // "<acc>, <cur>""
            acc.push(cur);
        } else {
            if (acc[acc.length - 1].length > 0) {
                acc[acc.length - 1] += ', ';
            }
            acc[acc.length - 1] += cur;
        }
        return acc;
    }, ['']);

    if (pages.length > 1) {
        let page = 0;

        if (name && name[0] === '#') {
            page = Number(name.substring(1));

            if (Number.isNaN(page) || page < 1 || page > pages.length) {
                reply(`номер страницы должен быть от 1 до ${pages.length}`);
                return;
            }

            page -= 1;
        }

        reply(`доступные команды (${page + 1}/${pages.length}): ${pages[page]}`);
    } else {
        reply(`доступные команды: ${pages[0]}`);
    }
}

async function cmdAdd(channel, args) {
    if (args.length < 2) {
        reply('пример: add (helper|counter|alias|music|function|native) <имя> <значение>');
        return;
    }

    const [type, name, ...text] = args;

    let params = {
        enabled: true,
        cooldown: {
            channel: 10,
            user: 0,
        }
    };

    let [command] = await findCommand(channel, name);

    if (command && type !== 'alias') {
        reply('команда с таким именем уже существует');
        return;
    }

    switch (type) {
        case 'music':
            if (text.length === 0) {
                text.push('сейчас играет {artist} - {track}');
            }

        case 'helper':
            params.text = text.join(' ');
            break;

        case 'counter':
            params.text = text.join(' ');
            params.value = 0;
            params.access = 1; // protected
            params.cooldown.internal = 0;

            if (params.text.indexOf('{n}') === -1) {
                reply('шаблон ответа должен содержать {n} для подстановки значения');
                return;
            }

            break;

        case 'countup':
            params.text = text.join(' ');
            params.value = +new Date();
            params.count = 0;
            break;

        case 'function':
            params.text = text.join(' ');

            if (!params.text.startsWith('!')) {
                reply('неправильный формат команды');
                return;
            }

            params.cooldown.channel = 0;

            break;

        case 'native':
            if (msg.payload.userstate.username != 'thedrhax') {
                reply(`команды native может добавлять только TheDrHax`);
                return;
            }

            break;

        case 'alias':
            if (!command) {
                reply(`команда ${name} не найдена`);
                return;
            }

            const pattern = text.join(' ');
            command.pattern += '|' + pattern;

            if (await saveCommand(command)) {
                reply(`шаблон "${pattern}" добавлен в команду "${name}" SeemsGood`);
            }

            return;

        default:
            reply(`неизвестный тип команды: ${type}`);
            return;
    }

    const data = { channel, name, type, pattern: name, ...params };
    const res = await saveCommand(data);

    if (res) {
        if (data.type === 'native') {
            reply(`команда !${name} добавлена SeemsGood (ID: ${res._id})`);
        } else if (data.type === 'music') {
            reply(`команда !${name} добавлена SeemsGood Завершите настройку здесь: red.drhx.ru/scrobble?command=${name}`);
        } else {
            reply(`команда !${name} добавлена SeemsGood`);
        }
    }
}

async function cmdUpdate(channel, args) {
    if (args.length < 2) {
        reply('пример: update <имя> <текст> [/// <замена>]');
        return;
    }

    let [name, ...text] = args;
    const [command] = await findCommand(channel, name);

    if (command == null) {
        reply(`команда "${name}" не найдена`);
        return;
    }

    switch (command.type) {
        case 'helper':
        case 'counter':
        case 'music':
        case 'function':
        case 'countup':
            try {
                command.text = updateText(
                    command.text,
                    ...text.join(' ').split(/\s\/{3}\s|\/{3}/)
                );
            } catch (e) {
                reply(e);
                return;
            }

            break;

        default:
            reply('изменение этой команды не поддерживается');
            return;
    }

    if (await saveCommand(command)) {
        reply(`команда "${name}" обновлена SeemsGood`);
    }
}

async function cmdRename(channel, args) {
    if (args.length < 2) {
        reply('пример: rename <имя> <новое имя>');
        return;
    }

    const [original, replacement] = args;
    const [command, isAlias] = await findCommand(channel, original);

    if (!command) {
        reply('команда не найдена');
        return;
    }

    if (!isAlias) {
        const [target] = await findCommand(channel, replacement);

        if (target) {
            reply(`имя "${replacement}" уже занято`);
            return;
        }

        const oldName = command.name;
        command.name = replacement;

        command.pattern = command.pattern
            .split('|')
            .map((p, i) => i == 0 ? replacement : p)
            .join('|');

        if (await saveCommand(command)) {
            reply(`команда "${oldName}" переименована в "${command.name}" SeemsGood`);
        }
    } else {
        const newPattern = command.pattern
            .split('|')
            .map(p => p === original ? p.replace(original, replacement) : p)
            .filter(p => p.length > 0)
            .join('|');

        if (command.pattern == newPattern) {
            reply('ничего не изменилось');
            return;
        }

        command.pattern = newPattern;

        if (await saveCommand(command)) {
            reply(`алиасы команды "${command.name}" обновлены SeemsGood`);
        }
    }
}

async function cmdToggle(channel, args, enabled) {
    if (args.length < 1) {
        return;
    }

    let [name] = args;
    const [command] = await findCommand(channel, name);

    if (command == null) {
        reply(`команда "${name}" не найдена`);
        return;
    }

    if (command.enabled === enabled) {
        reply(`нечего менять peepoThink`);
        return;
    }

    command.enabled = enabled;

    if (await saveCommand(command)) {
        reply(`команда "${command.name}" ${enabled ? 'в' : 'вы'}ключена SeemsGood`);
    }
}

async function cmdCooldown(channel, args) {
    if (args.length < 1) {
        reply('пример: cooldown <имя> [канал] [польз.] [действ.]');
        return;
    }

    const [name, cdChannel, cdUser, cdAction] = args;

    const [command] = await findCommand(channel, name);

    if (!command) {
        reply(`команда "${name}" не найдена`);
        return;
    }

    const cd = command.cooldown || {};
    command.cooldown = cd;

    const finish = () => {
        const res = [`${cd.channel || 0} сек.`];

        if (cd.user) {
            res.push(`${cd.user} сек./пользователь`);
        }

        if (cd.action) {
            res.push(`режим ${cd.action}`);
        }

        reply(`КД команды "${command.name}": ${res.join(', ')}`);
    };

    const validateAndAssign = (name, value) => {
        value = Number(value);

        if (!Number.isNaN(value) && value >= 0) {
            cd[name] = value;
        }
    };

    if (!cdChannel) {
        finish();
        return;
    }

    validateAndAssign('channel', cdChannel);
    validateAndAssign('user', cdUser);

    if (['ignore'].indexOf(cdAction) !== -1) {
        cd.action = cdAction;
    } else {
        delete cd.action;
    }

    await saveCommand(command);
    finish();
}

async function cmdRemove(channel, args) {
    if (args.length < 1) {
        reply('пример: remove <имя>');
        return;
    }

    const [name] = args;
    const [command, isAlias] = await findCommand(channel, name);

    if (command == null) {
        reply(`команда "${name}" не найдена`);
        return;
    }

    if (isAlias) {
        let patterns = command.pattern.split('|');

        const toRemove = patterns.filter(p => name.match(new RegExp(`^(${p})$`, 'i')));

        patterns = patterns.filter(p => toRemove.indexOf(p) === -1);

        command.pattern = patterns.join('|');

        if (await saveCommand(command)) {
            reply(`шаблон "${toRemove[0]}" удалён из команды "${command.name}" SeemsGood`);
        }
    } else {
        if (command.type === 'native' && msg.payload.userstate.username !== 'thedrhax') {
            reply('команды native может удалять только TheDrHax');
            return;
        }

        await deleteCommand(command);
        reply(`команда "${name}" удалена SeemsGood`);
    }
}

async function cmdPlugin(channel, args) {
    if (args.length < 1) {
        reply('пример: plugin <имя> <параметры...>');
        return;
    }

    const [name] = args;
    args.shift();

    let [config] = await amongo(CHANNEL_DB, 'find', {
        _id: channel,
    });

    config ||= { _id: channel, plugins: {} };

    switch (name) {
        case 'context':
            const ctxCmd = args.shift();
            const ctx = flow.get('context', 'file') || {};
            let restore = false;

            switch (ctxCmd) {
                case 'restore':
                    restore = true;
                case 'remove':
                case 'delete':
                    if (args.length === 0) {
                        reply('укажите шаблон');
                        return;
                    }

                    const chanCtx = ctx[channel] || [];

                    const pattern = new RegExp(args.join(' '), 'i');

                    const modified = chanCtx
                        .filter((m) => m.payload.message?.match(pattern) || m.payload.userstate?.username?.match(pattern))
                        .filter((m) => !!m.deleted == restore)
                        .map((m) => {
                            m.deleted = !restore;
                            return m;
                        });

                    flow.set(`context`, ctx, 'file');
                    reply(renderTemplate(
                        '{act} {n} сообщени{n#е,я,й}',
                        {
                            n: modified.length,
                            act: restore ? 'восстановлено' : 'удалено'
                        }
                    ));
                    return;

                case 'clear':
                    delete ctx[channel];
                    flow.set(`context`, ctx, 'file');
                    reply('контекст очищен SeemsGood');
                    return;

                default:
                    reply('доступные команды: remove <regex>, restore <regex>, clear');
                    return;
            }

        case 'emote-chains':
            const ecConfig = config.plugins['emote-chains'] || {
                length: 2,
                count: 3,
            };
            config.plugins['emote-chains'] = ecConfig;

            if (args.length == 0 || args[1] == 'help') {
                reply('пример: plugin emote-chains MIN_LENGTH [MAX_COUNT]');
                return;
            }

            let [length, count] = args.map(Number);

            if (Number.isInteger(length) && length >= 0 && length <= 10) {
                ecConfig.length = length;
            } else {
                reply(`MIN_LENGTH должен быть целым числом от 0 до 10`);
                return;
            }

            if (Number.isInteger(count)) {
                if (count < 1) {
                    reply('MAX_COUNT должен быть целым числом не меньше 1');
                    return;
                }

                ecConfig.count = count;
            }

            await amongo(CHANNEL_DB, 'save', config);

            reload();
            reply(`конфигурация ${name} обновлена SeemsGood`);

            break;

        case 'chroot':
            // if (channel[0] !== '#') {
            //     reply('этот плагин доступен только на Twitch');
            //     return;
            // }

            if (msg.parsed.level >= 0) {
                reply('только администратор может использовать этот плагин');
                return;
            }

            if (!args[0]) {
                if (config.plugins?.chroot) {
                    reply(`чат подключён к каналу ${config.plugins.chroot}`);
                } else {
                    reply('chroot отключён');
                }
                return;
            }

            if (channel == args[0] || args[0] === '-') {
                delete config.plugins.chroot;
                await amongo(CHANNEL_DB, 'save', config);

                reload();
                reply('chroot отключён SeemsGood');
                return;
            }

            const [target] = await amongo(DB, 'find', { 'channel': args[0] });

            if (!target) {
                reply('бот не активен на этом канале');
                return;
            }

            config.plugins.chroot = args[0];
            await amongo(CHANNEL_DB, 'save', config);

            reload();
            reply(`конфигурация ${name} обновлена SeemsGood`);

            break;

        default:
            reply(`неизвестный плагин "${name}"`);
            return;
    }
}

async function main() {
    let channel = msg.payload.channel;

    const [cmd, ...args] = msg.parsed.query.split(' ');

    const [settings] = await amongo('twitch_channels', 'find', { _id: channel });
    if (settings?.plugins?.chroot && (cmd !== 'id' && cmd !== 'plugin')) {
        channel = settings.plugins.chroot;
    }

    switch (cmd) {
        case 'help':
            reply('подробную инструкцию можно найти тут: drhx.ru/g6E7');
            return;

        case 'id':
            reply(`ID канала: ${msg.payload.channel}`);
            return;

        case 'show':
            return cmdShow(channel, args);

        case 'list':
            return cmdList(channel, args);

        case 'add':
            return cmdAdd(channel, args);

        case 'update':
            return cmdUpdate(channel, args);

        case 'rename':
            return cmdRename(channel, args);

        case 'disable':
        case 'enable':
            return cmdToggle(channel, args, cmd === 'enable');

        case 'cooldown':
            return cmdCooldown(channel, args);

        case 'remove':
            return cmdRemove(channel, args);

        case 'plugin':
            return cmdPlugin(channel, args);

        default:
            reply('доступные команды: help, show, list, add, update, rename, enable, disable, cooldown, remove');
    }
}

return main();
