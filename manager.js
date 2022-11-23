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

const {
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

async function cmdList(channel, [name]) {
    if (name) {
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
    } else {
        const commandList = commands.map(c => {
            const hasAlias = c.pattern.indexOf('|') !== -1 || c.type === 'alias';
            const flags = (hasAlias ? '⁺' : '') + (c.enabled ? '' : ' (⏻)');
            return c.name + flags;
        }).join(', ');

        reply(`доступные команды: ${commandList}`);
    }
}

async function cmdAdd(channel, args) {
    if (args.length < 2) {
        reply('пример: add (helper|counter|alias|function|native) <имя> <значение>');
        return;
    }

    const [type, name, ...text] = args;

    let params = {
        enabled: true,
    };

    let [command] = await findCommand(channel, name);

    if (command && type !== 'alias') {
        reply('команда с таким именем уже существует');
        return;
    }

    switch (type) {
        case 'helper':
            params.text = text.join(' ');
            break;

        case 'counter':
            params.text = text.join(' ');
            params.value = 0;
            params.access = 1; // protected

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

            if (!params.text.match(COMMAND)) {
                reply('неправильный формат команды');
                return;
            }

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
        case 'function':
        case 'countup':
            try {
                command.text = updateText(
                    command.text,
                    ...text.join(' ').split(/\s?\/\/\/\s?/)
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

async function main() {
    let channel = msg.payload.channel;

    if (channel === '#thedrhax') {
        channel = '#blackufa';
    }

    const [cmd, ...args] = msg.parsed.query.split(' ');

    switch (cmd) {
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

        case 'remove':
            return cmdRemove(channel, args);

        default:
            reply('доступные команды: list, add, update, rename, enable, disable, remove');
    }
}

return main();
