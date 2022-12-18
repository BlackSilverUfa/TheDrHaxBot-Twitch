const stream = flow.get('stream_status', 'file');
const db = flow.get('blackufa_db', 'memory')();

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

function streamTimeline(id) {
    let games = [];

    db.segments.find({ streams: { $contains: id } })
        .filter(s => s.games.length > 0)
        .map(segment => {
            let abs_start = segment.abs_start;
            let abs_end = segment.abs_end;

            if (segment.offsets) {
                const index = segment.streams.indexOf(id);
                abs_start = segment.offsets[index];
                abs_end = segment.offsets[index + 1] || abs_end;
            }

            segment.games.map(id => db.games.findOne({ id })).map(game => {
                game.streams
                    .filter(ref => (segment.segment == ref.segment))
                    .map(ref => {
                        (ref.subrefs || [ref]).map(subref => {
                            const start = (subref.start || 0) - abs_start;
                            const name = game.type == 'list' ? subref.name : game.name;

                            if (start < abs_end)
                                games.push([start, name]);
                        });
                    });
            });
        });

    games.sort((a, b) => a[0] > b[0] ? 1 : -1);

    const prevGames = games.filter(([s]) => s < 0);
    games = games.filter(([s]) => s >= 0);

    if ((games.length == 0 || games[0][0] > 0) && prevGames.length > 0) {
        games.unshift([0, last(prevGames)[1]]);
    }

    return games;
}

function streamDuration(id) {
    return db.segments.find({ streams: { $contains: id } })
        .filter(s => s.streams.length == 1)
        .map(s => s.abs_end - s.abs_start)
        .reduce((a, b) => a + b);
}

if (msg.parsed.level <= 1) { // mods and up
    let [cmd, ...args] = query.split(' ');

    switch (cmd) {
        case 'edit':
            let id;

            [id, cmd, ...args] = args;

            if (Number.isNaN(+id) || !cmd) {
                msg.reply = 'укажите номер игры и команду';
                return msg;
            }

            const entry = stream.game_history[id - 1];

            if (!entry) {
                msg.reply = `в списке игр всего ${stream.game_history.length} пунктов, а вы запросили ${id}-й`;
                return msg;
            }

            switch (cmd) {
                case 'get':
                    msg.reply = `${entry.name}`;
                    return msg;
                
                case 'name':
                    const oldName = entry.name;
                    entry.name = args.join(' ');
                    flow.set('stream_status', stream, 'file');
                    msg.reply = `игра "${oldName}" переименована в "${entry.name}"`;
                    return msg;

                case 'time':
                    const newTime = ptime(args[0]);

                    if (Number.isNaN(newTime)) {
                        msg.reply = 'не удалось распознать формат таймкода';
                        return msg;
                    }

                    entry.date = Sugar.Date.advance(
                        new Date(stream.date),
                        { seconds: newTime }
                    ).toISOString();

                    flow.set('stream_status', stream, 'file');
                    msg.reply = `теперь "${entry.name}" начинается с ${ftime(newTime)}`;
                    return msg;

                default:
                    msg.reply = 'доступные команды: get, name <имя>, time <время>';
                    return msg;
            }

        case 'set':
        case 'split':
        case 'replace':
            if (!stream.active) {
                msg.reply = 'сейчас нет активной трансляции peepoThink';
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

            flow.set('stream_status', stream, 'file');

            msg.reply = `игра изменена на ${stream.game_forced} SeemsGood`;
            return msg;

        case 'delete':
            if (!stream.active) {
                msg.reply = 'сейчас нет активной трансляции peepoThink';
                return msg;
            }

            if (stream.game_history.length === 1) {
                msg.reply = 'нельзя удалить единственную игру - используйте команду replace PepoG';
                return msg;
            }

            stream.game_forced = null;

            const game = stream.game_history.pop();
            flow.set('stream_status', stream, 'file');

            msg.reply = `игра ${game.name} удалена из истории monkaGunshake`;
            return msg;

        case 'reset':
            stream.game_forced = null;

            if (stream.active) {
                updateGameHistory(stream.game);
            }

            flow.set('stream_status', stream, 'file');

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

if (stream.active) {
    let game = stream.game_forced || stream.game;
    msg.reply = `сейчас транслируется ${game} YEPPERS`;
} else {
    msg.reply = 'сейчас нет активной трансляции peepoSHAKE';
}

return msg;
