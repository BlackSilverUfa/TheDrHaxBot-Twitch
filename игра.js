const stream = flow.get('stream_status', 'file');
const rerun = flow.get('rerun_status', 'file');
const db = flow.get('blackufa_db', 'memory')();

const { smartJoin, last, renderTemplate } = flow.get('func', 'memory');
const { zip } = lodash;

const query = msg.parsed.query_filtered;

function updateGameHistory(name, replace) {
    const now = new Date();
    const lastGame = stream.game_history[stream.game_history.length - 1];

    if (replace == null) {
        const age = +now - new Date(lastGame.date);
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

function rerunPush(vod, segment) {
    const prevVod = last(rerun.vod_history);
    const startDate = new Date(prevVod ? prevVod.date_end : rerun.date);
    const endDate = new Date(+startDate + streamDuration(vod) * 1000);
    const timeline = streamTimeline(vod).map(([start, name]) => ({
        name,
        date: new Date(+startDate + start * 1000).toISOString(),
    }));

    const vod_item = {
        id: vod,
        date_original: segment.date,
        date: startDate.toISOString(),
        date_end: endDate.toISOString(),
        timeline
    };

    rerun.vod_history.push(vod_item);
    rerun.game_history = [].concat(...rerun.vod_history.map(v => v.timeline));

    flow.set('rerun_status', rerun, 'file');
}

if (msg.parsed.level <= 1) { // mods and up
    [cmd, ...args] = query.split(' ');

    switch (cmd) {
        case 'set':
        case 'split':
        case 'replace':
            if (rerun.active) {
                msg.reply = 'прошлое не изменить NOPERS';
                return msg;
            } else if (!stream.active) {
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

        case 'rerun':
            if (!rerun.active) {
                msg.reply = 'сейчас нет активного повтора peepoThink';
                return msg;
            }

            if (args.length === 0) {
                msg.reply = 'укажите один или несколько ID стримов из архива PepoG';
                return msg;
            }

            const segments = args.map((vod) => db.segments.findOne({
                streams: { $contains: vod }
            }));

            if (segments.indexOf(null) !== -1) {
                msg.reply = `стрим ${args[segments.indexOf(null)]} не найден KEKWait`;
                return msg;
            }

            zip(args, segments).forEach(([vod, segment]) => rerunPush(vod, segment));

            msg.reply = 'повтор обновлён SeemsGood';
            return msg;

        case 'reset':
            stream.game_forced = null;

            if (stream.active) {
                updateGameHistory(stream.game);
            }

            flow.set('stream_status', stream, 'file');

            rerun.vod_history = [];
            rerun.game_history = [];
            flow.set('rerun_status', rerun, 'file');

            if (stream.active) {
                msg.reply = `игра изменена на ${stream.game} SeemsGood`;
            } else if (rerun.active) {
                msg.reply = 'очередь повторов очищена SeemsGood';
            } else {
                msg.reply = 'установленная вручную игра сброшена SeemsGood';
            }

            return msg;

        case 'help':
            msg.reply = 'доступные команды: set, split, replace, delete, rerun, reset';
            return msg;
    }
}

const now = +new Date();

if (stream.active) {
    let game = stream.game_forced || stream.game;
    msg.reply = `сейчас транслируется ${game} YEPPERS`;
} else if (rerun.active) {
    const lastVod = last(rerun.vod_history);
    if (!lastVod || now > +new Date(lastVod.date_end)) {
        msg.reply = 'сейчас идёт повтор, но какого стрима - я не знаю peepoThink';
    } else {
        const currentVod = last(rerun.vod_history.filter(({ date }) => +new Date(date) < now));
        const start = Sugar.Date.short(Sugar.Date.create(currentVod.date_original));
        const currentGame = last(rerun.game_history.filter(game => +new Date(game.date) < now));
        const at = Math.floor((+new Date() - new Date(currentVod.date)) / 1000);

        if (!currentGame) {
            msg.reply = 'на этом повторе игры ещё не начались BSUWait';
        } else {
            msg.reply = `сейчас повторяется ${currentGame.name} со стрима ${start}.`;
        }

        msg.reply += ` Ссылка на этот момент в архиве: drhx.ru/b/${currentVod.id}?at=${at} YEPPERS`;
    }
} else {
    msg.reply = 'сейчас нет активной трансляции peepoSHAKE';
}

return msg;
