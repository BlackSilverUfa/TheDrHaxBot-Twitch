const stream = flow.get('stream_status', 'file'); // https://red.thedrhax.pw/blackufa/twitch
const rerun = flow.get('rerun_status', 'file');

const { dateDistance } = flow.get('func', 'memory');
const now = +new Date();

const DATE_DIST_OPTS = {
    parts: ['hours', 'minutes', 'seconds'],
    short: true,
};

function timeline(stream, history) {
    history = history || stream.game_history;

    return history
        .map((game, i, arr) => {
            const name = game.name.replace(/\s\(.*?\)/, '');

            const end = arr[i+1] ?
                new Date(arr[i+1].date) :
                stream.active ?
                    new Date() :
                    new Date(stream.date_end);

            const start = new Date(game.date);

            if (+start > now) {
                const delta = dateDistance(now, start, DATE_DIST_OPTS);
                return `${name} (через ${delta})`;
            } else {
                const delta = dateDistance(start, end, DATE_DIST_OPTS);
                return `${name} (${delta})`;
            }
        }).join(', ');
}

// if (msg.parsed.icommand == 'чобудет') {
//     if (rerun.active) {
//         if (rerun.vod_history.length > 0) {
//             const future = timeline(rerun, rerun.game_history.filter(game => now < +new Date(game.date)));
//             if (future.length === 0) {
//                 msg.reply = 'на этом повторе больше игр не ожидается peepoThink';
//             } else {
//                 msg.reply = 'на этом повторе будут: ' + future;
//             }
//         } else {
//             msg.reply = 'эта часть повтора ещё не размечена peepoThink';
//         }
//     } else {
//         return [null, msg];
//     }
// } else if (msg.parsed.icommand == 'чобыло') {
// }

if (stream.active) {
    msg.reply = 'сегодня были: ' + timeline(stream);
} else if (rerun.active && rerun.vod_history.length > 0) {
    const past = timeline(rerun, rerun.game_history.filter(game => now > +new Date(game.date)));
    if (past.length === 0) {
        msg.reply = 'на этом повторе пока ещё ничего не было peepoBlanket';
    } else {
        msg.reply = 'на этом повторе были: ' + past;
    }
} else {
    msg.reply = 'на предыдущем стриме были: ' + timeline(stream);
}

return msg;
