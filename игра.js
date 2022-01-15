const stream = flow.get('stream_status', 'file')
const rerun = flow.get('rerun_status', 'file');
const db = flow.get('blackufa_db', 'memory');

const { smartJoin, last } = flow.get('func', 'memory');

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

function streamTimeline(id) {
    const games = [];

    db.segments.find({ streams: { $contains: id } }).map(segment => {
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
    });

    return games.sort((a, b) => a[0] > b[0] ? 1 : -1);
}

function streamDuration(id) {
    return db.segments.find({ streams: { $contains: id } })
        .map(s => s.abs_end - s.abs_start)
        .reduce((a, b) => a + b);
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
            
            const segment = db.segments.findOne({ streams: { $contains: vod } });

            if (!segment) {
                msg.reply = 'стрим не найден';
                return msg;
            }

            const prevVod = last(rerun.vod_history);
            const vodExpired = prevVod && new Date() > new Date(prevVod.date_end);
            const startDate = new Date(vodExpired ? prevVod.date_end : rerun.date);
            const endDate = new Date(+startDate + streamDuration(vod) * 1000);
            const timeline = streamTimeline(vod).map(([start, name]) => ({
                name, date: new Date(+startDate + start * 1000).toISOString()
            }));

            const vod_item = {
                id: vod,
                date_original: segment.date,
                date: startDate.toISOString(),
                date_end: endDate.toISOString(),
                timeline
            };

            if (!prevVod || vodExpired) {
                rerun.vod_history.push(vod_item);
            } else {
                rerun.vod_history[rerun.vod_history.length - 1] = vod_item;
            }

            rerun.game_history = [].concat(...rerun.vod_history.map(v => v.timeline));

            flow.set('rerun_status', rerun, 'file');
            msg.reply = `текущий повтор привязан к стриму ${vod} SeemsGood`;
            return msg;

        case 'reset':
            stream.game_forced = null;
            updateGameHistory(stream.game_history, stream.game);

            rerun.vod_history = [];
            rerun.game_history = [];

            flow.set('stream_status', stream, 'file');
            flow.set('rerun_status', rerun, 'file');
            msg.reply = `игра изменена на ${stream.game} SeemsGood`;
            return msg;
        
        case 'help':
            msg.reply = 'доступные команды: set, rerun, reset';
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
        const start = Sugar.Date.short(Sugar.Date.create(lastVod.date_original));
        const currentGame = last(rerun.game_history.filter(game => +new Date(game.date) < now));
        const at = Math.floor((+new Date() - new Date(lastVod.date)) / 1000);

        msg.reply = `сейчас повторяется ${currentGame.name} со стрима ${start}.`;
        msg.reply += ` Запись можно посмотреть здесь: bsu.my.to/${lastVod.id}?at=${at} YEPPERS`;
    }
} else {
    msg.reply = 'сейчас нет активной трансляции peepoSHAKE';
}

return msg;
