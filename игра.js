const stream = flow.get('stream_status', 'file')
const rerun = flow.get('rerun_status', 'file');

const query = msg.parsed.query_filtered;

if (msg.parsed.level <= 1) { // mods and up
    [cmd, ...args] = query.split(' ');
    
    if (cmd == 'set' && args.length > 0) {
        stream.game_forced = args.join(' ');
        flow.set('stream_status', stream, 'file');
        msg.reply = `игра изменена на ${stream.game_forced} SeemsGood`;
        return msg;
    } else if (cmd == 'reset') {
        stream.game_forced = null;
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
