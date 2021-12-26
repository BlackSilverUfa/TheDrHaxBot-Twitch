const stream = flow.get('stream_status', 'file')
const rerun = flow.get('rerun_status', 'file');

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
            date: now
        });
    }
}

if (msg.parsed.level <= 1) { // mods and up
    [cmd, ...args] = query.split(' ');

    const prev_game = stream.game_history[stream.game_history.length - 1];
    const now = new Date();
    const age = +now - new Date(prev_game.date);

    if (cmd == 'set' && args.length > 0) {
        stream.game_forced = args.join(' ');
        updateGameHistory(stream.game_history, stream.game_forced);

        flow.set('stream_status', stream, 'file');
        msg.reply = `игра изменена на ${stream.game_forced} SeemsGood`;
        return msg;
    } else if (cmd == 'reset') {
        stream.game_forced = null;
        updateGameHistory(stream.game_history, stream.game);

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
