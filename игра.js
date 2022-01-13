const stream = flow.get('stream_status', 'file')
const rerun = flow.get('rerun_status', 'file');
const db = flow.get('blackufa_db', 'memory');

const query = msg.parsed.query_filtered;

function updateGameHistory(game_history, name) {
    if (!stream.active) return;

    const lastGame = game_history[game_history.length - 1];
    const now = new Date();
    const age = +now - new Date(lastGame.date);

    if (age < 5*60*1000) { // changed < 5m ago
        lastGame.name = name;
    } else {
        game_history.push({
            name,
            date: now.toISOString()
        });
    }
}

if (msg.parsed.level <= 1) { // mods and up
    [cmd, ...args] = query.split(' ');

    switch (cmd) {
        case 'set':
            if (rerun.active) {
                msg.reply = 'прошлое не изменить NOPERS';
                return msg;
            } else if (!stream.active) {
                msg.reply = 'сейчас нет активной трансляции';
                return msg;
            }

            if (args.length == 0) {
                msg.reply = 'укажите название игры';
                return;
            }

            stream.game_forced = args.join(' ');
            updateGameHistory(stream.game_history, stream.game_forced);

            flow.set('stream_status', stream, 'file');
            msg.reply = `игра изменена на ${stream.game_forced} SeemsGood`;
            return msg;

        case 'rerun':
            if (!rerun.active) {
                msg.reply = 'сейчас нет активного повтора';
                return msg;
            }

            if (!args[0] || !args[0].match(/^[0-9]+$/)) {
                msg.reply = 'укажите ID стрима из архива';
                return msg;
            }

            const vod = args[0];
            const query = { streams: { $contains: vod } };

            const segment = db.segments.findOne(query);

            if (!segment) {
                msg.reply = 'стрим не найден';
                return msg;
            }

            const games = [];
            let duration = 0;

            db.segments.find(query).map(segment => {
                duration += segment.abs_end - segment.abs_start;
                segment.games.map(id => db.games.findOne({ id })).map(game => {
                    game.streams.filter(ref => (
                        segment.streams.indexOf(ref.segment) !== -1
                    )).map(ref => {
                        (ref.subrefs || [ref]).map(subref => {
                            const start = segment.abs_start + (subref.start || 0);
                            const name = game.type == 'list' ? subref.name : game.name;
                            games.push([start, name]);
                        });
                    });
                });
            }).sort((a, b) => a[0] > b[0] ? 1 : -1);

            const rerunDate = +new Date(rerun.date);
            const endDate = new Date(rerunDate + duration * 1000);
            const timeline = games.map(([start, name]) => ({
                name,
                date: new Date(rerunDate + start * 1000).toISOString()
            }));

            rerun.vod = vod;
            rerun.game_history = timeline;
            rerun.date_original = segment.date;
            rerun.date_end = endDate.toISOString();

            flow.set('rerun_status', rerun, 'file');
            msg.reply = `текущий повтор привязан к стриму ${vod} SeemsGood`;
            return msg;

        case 'reset':
            stream.game_forced = null;
            rerun.vod = null;
            updateGameHistory(stream.game_history, stream.game);

            flow.set('stream_status', stream, 'file');
            flow.set('rerun_status', rerun, 'file');
            msg.reply = `игра изменена на ${stream.game} SeemsGood`;
            return msg;
        
        case 'help':
            msg.reply = 'доступные команды: set, rerun, reset';
            return msg;
    }
}

const { smartJoin } = flow.get('func', 'memory');
const now = +new Date();

if (stream.active) {
    let game = stream.game_forced || stream.game;
    msg.reply = `сейчас транслируется ${game} YEPPERS`;
} else if (rerun.active) {
    if (!rerun.vod || now > +new Date(rerun.date_end)) {
        msg.reply = 'сейчас идёт повтор, но какого стрима - я не знаю peepoThink';
    } else {
        const start = Sugar.Date.short(Sugar.Date.create(rerun.date_original));
        const pastGames = rerun.game_history.filter(game => +new Date(game.date) < now);
        const currentGame = pastGames[pastGames.length - 1];

        msg.reply = `сейчас повторяется ${currentGame.name} со стрима ${start}.`;
        msg.reply += ` Запись можно посмотреть здесь: bsu.us.to/${rerun.vod} YEPPERS`;
    }
} else {
    msg.reply = 'сейчас нет активной трансляции peepoSHAKE';
}

return msg;
