const stream = flow.get('stream_status', 'file'); // https://red.thedrhax.pw/blackufa/twitch
const rerun = flow.get('rerun_status', 'file');
const { msToDelta, msToTime } = flow.get('func', 'memory');

if (stream.active) {
    let total = msToTime(+new Date() - new Date(stream.date));

    if (stream.game_history.length <= 1) {
        msg.reply = `стрим идёт уже ${total}, категория пока не менялась YEPPERS`;
    } else {
        let lastCategory = stream.game_history[stream.game_history.length - 1];
        let catAge = msToTime(+new Date() - new Date(lastCategory.date));

        msg.reply = `стрим идёт уже ${total}, а эта игра - ${catAge} YEPPERS`;
    }
} else if (rerun.active) {
    let total = msToTime(+new Date() - new Date(rerun.date));

    msg.reply = `повтор идёт уже ${total} YEPPERS`;
} else {
    let total = msToTime(+new Date(stream.date_end) - new Date(stream.date));
    let when = msToDelta(+new Date() - new Date(stream.date_end));

    msg.reply = `стрим шёл ${total} и закончился ${when} назад peepoSHAKE`;
}

return msg;
