const stream = flow.get('stream_status', 'file')
const rerun = flow.get('rerun_status', 'file');

const query = msg.parsed.query_filtered;

if (msg.parsed.level <= 1) { // mods and up
    [cmd, ...args] = query.split(' ');

    const prev_game = stream.game_history[stream.game_history.length - 1];
    const now = new Date();
    const age = +now - new Date(prev_game.date);

    if (cmd == 'set' && args.length > 0) {
        stream.game_forced = args.join(' ');

        if (age < 5*60*1000) { // changed < 5m ago
            prev_game.name = stream.game_forced;
        } else {
            stream.game_history.push({
                name: stream.game_forced,
                date: now
            });
        }

        flow.set('stream_status', stream, 'file');
        msg.reply = `игра изменена на ${stream.game_forced} SeemsGood`;
        return msg;
    } else if (cmd == 'reset') {
        stream.game_forced = null;

        if (age < 5*60*1000) { // changed < 5m ago
            prev_game.name = stream.game;
        } else {
            stream.game_history.push({
                name: stream.game,
                date: now
            });
        }

        flow.set('stream_status', stream, 'file');
        msg.reply = `игра изменена на ${stream.game} SeemsGood`;
        return msg;
    }
}

if (stream.active) {
    let game = stream.game_forced || stream.game;
    msg.reply = `сейчас транслируется ${game} YEPPERS`;
} else if (rerun.active) {
    msg.reply = 'сейчас идёт повтор, но какого стрима - я не знаю peepoThink';
} else {
    msg.reply = 'сейчас нет активной трансляции peepoSHAKE';
}

return msg;
