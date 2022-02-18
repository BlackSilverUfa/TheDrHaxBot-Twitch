const stream = flow.get('stream_status', 'file'); // https://red.thedrhax.pw/blackufa/twitch
const rerun = flow.get('rerun_status', 'file');

const { dateDistance } = flow.get('func', 'memory');

const DATE_DIST_OPTS = {
    timestamp: true
};

if (stream.active) {
    const total = dateDistance(new Date(stream.date), null, DATE_DIST_OPTS);

    if (stream.game_history.length <= 1) {
        msg.reply = `стрим идёт уже ${total} (c ${stream.time} МСК YEPPERS`;
    } else {
        const lastCategory = stream.game_history[stream.game_history.length - 1];
        const catAge = dateDistance(new Date(lastCategory.date), null, DATE_DIST_OPTS);

        msg.reply = `стрим идёт уже ${total} (c ${stream.time} МСК), а эта игра - ${catAge} YEPPERS`;
    }
} else if (rerun.active) {
    const timeSinceStart = dateDistance(new Date(rerun.date), null, DATE_DIST_OPTS);

    msg.reply = `повтор идёт уже ${timeSinceStart}`;

    const lastVod = rerun.vod_history[rerun.vod_history.length - 1];

    if (lastVod && new Date() < new Date(lastVod.date_end)) {
        const timeUntilEnd = dateDistance(new Date(), new Date(lastVod.date_end), DATE_DIST_OPTS);
        msg.reply += ` (осталось ${timeUntilEnd})`;
    }

    msg.reply += ' YEPPERS';
} else {
    const total = dateDistance(new Date(stream.date), new Date(stream.date_end), DATE_DIST_OPTS);
    const when = dateDistance(new Date(stream.date_end), null, { short: true, });

    msg.reply = `стрим шёл ${total} и закончился ${when} назад peepoSHAKE`;
}

return msg;
