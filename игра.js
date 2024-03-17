const key = 'twitch_channels.' + msg.command.channel.substring(1);
const stream = flow.get(key, 'file');

const { smartJoin, last, renderTemplate, ptime, ftime } = flow.get('func', 'memory');
const { zip } = lodash;

const query = msg.parsed.query_filtered;

function updateGameHistory(name, replace) {
    const now = new Date();
    const lastGame = stream.game_history[stream.game_history.length - 1];

    if (replace == null) {
        const age = +now - +new Date(lastGame.date);
        replace = age < 5 * 60 * 1000; // changed < 5m ago
    }

    if (replace) {
        lastGame.name = name;
    } else {
        stream.game_history.push({
            name,
            date: now.toISOString()
        });
    }
}

if (msg.parsed.level <= 1) { // mods and up
    let [cmd, ...args] = query.split(' ');

    switch (cmd) {
        case 'edit':
            let id;
            [id, cmd, ...args] = args;
            id -= 1;

            if (Number.isNaN(+id) || !cmd) {
                msg.reply = 'укажите номер игры и команду';
                return msg;
            }

            const entry = stream.game_history[id];

            if (!entry) {
                msg.reply = `в списке игр всего ${stream.game_history.length} пунктов, а вы запросили ${id + 1}-й`;
                return msg;
            }

            const streamStart = new Date(stream.date);
            const now = new Date();

            switch (cmd) {
                case 'get':
                    msg.reply = `${entry.name} начинается с ${ftime((+new Date(entry.date) - +streamStart) / 1000)}`;
                    return msg;

                case 'name':
                    const oldName = entry.name;
                    const newName = args.join(' ');

                    if (newName.length === 0) {
                        msg.reply = 'укажите новое название';
                        return msg;
                    }

                    entry.name = newName;
                    flow.set(key, stream, 'file');
                    msg.reply = `игра "${oldName}" переименована в "${newName}"`;
                    return msg;

                case 'time':
                    if (id === 0) {
                        msg.reply = 'у первого пункта можно менять только название';
                        return msg;
                    }

                    const newTime = ptime(args[0]);

                    if (Number.isNaN(newTime)) {
                        msg.reply = 'укажите время в формате HH:MM:SS или MM:SS';
                        return msg;
                    }

                    const newDate = Sugar.Date.advance(
                        new Date(stream.date),
                        { seconds: newTime }
                    );

                    const lowerBound = new Date(streamStart);
                    const upperBound = new Date(stream.date_end || now);

                    if (newDate <= lowerBound || newDate >= upperBound) {
                        const upperBoundStr = ftime((+upperBound - +streamStart) / 1000);
                        msg.reply = `время должно быть между 0:00 и ${upperBoundStr}`;
                        return msg;
                    }

                    entry.date = newDate.toISOString();
                    stream.game_history = stream.game_history
                        .sort((a, b) => +new Date(a.date) - +new Date(b.date));

                    flow.set(key, stream, 'file');
                    msg.reply = `теперь "${entry.name}" начинается с ${ftime(newTime)}`;
                    return msg;

                default:
                    msg.reply = 'доступные команды: get, name, time';
                    return msg;
            }

        case 'set':
        case 'split':
        case 'replace':
            if (!stream.active) {
                msg.reply = 'сейчас нет активной трансляции 🤔';
                return msg;
            }

            if (args.length == 0) {
                msg.reply = 'укажите название игры';
                return;
            }

            stream.game_forced = args.join(' ');

            if (cmd == 'set') {
                updateGameHistory(stream.game_forced);
            } else {
                updateGameHistory(stream.game_forced, cmd == 'replace');
            }

            flow.set(key, stream, 'file');

            msg.reply = `игра изменена на ${stream.game_forced} SeemsGood`;
            return msg;

        case 'delete':
            if (!stream.active) {
                msg.reply = 'сейчас нет активной трансляции 🤔';
                return msg;
            }

            if (stream.game_history.length === 1) {
                msg.reply = 'нельзя удалить единственную игру - используйте команду replace 🤓';
                return msg;
            }

            stream.game_forced = null;

            const game = stream.game_history.pop();
            flow.set(key, stream, 'file');

            msg.reply = `игра ${game.name} удалена из истории 🫡`;
            return msg;

        case 'reset':
            stream.game_forced = null;

            if (stream.active) {
                updateGameHistory(stream.game);
            }

            flow.set(key, stream, 'file');

            if (stream.active) {
                msg.reply = `игра изменена на ${stream.game} SeemsGood`;
            } else {
                msg.reply = 'установленная вручную игра сброшена SeemsGood';
            }

            return msg;

        case 'help':
            msg.reply = 'доступные команды: set, split, replace, delete, reset';
            return msg;
    }
}

const now = +new Date();

if (stream?.active) {
    let game = stream.game_forced || stream.game;
    msg.reply = `сейчас транслируется ${game} SeemsGood`;
} else {
    msg.reply = 'сейчас нет активной трансляции :(';
}

return msg;
