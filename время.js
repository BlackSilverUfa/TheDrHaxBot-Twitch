const { last, dateDistance, getStreamInfo } = flow.get('func', 'memory');

const stream = getStreamInfo(msg.payload.channel);

if (!stream || !stream.game_history) {
    msg.reply = 'недостаточно информации о состоянии канала 🤔';
    return msg;
}

const DATE_DIST_OPTS = {
    timestamp: true
};

if (stream.active) {
    const total = dateDistance(new Date(stream.date), null, DATE_DIST_OPTS);

    if (stream.game_history.length <= 1) {
        msg.reply = `стрим идёт уже ${total} (c ${stream.time} МСК)`;
    } else {
        const lastCategory = stream.game_history[stream.game_history.length - 1];
        const catAge = dateDistance(new Date(lastCategory.date), null, DATE_DIST_OPTS);

        msg.reply = `стрим идёт уже ${total} (c ${stream.time} МСК), а эта игра - ${catAge}`;
    }
} else {
    const total = dateDistance(new Date(stream.date), new Date(stream.date_end), DATE_DIST_OPTS);
    const when = dateDistance(new Date(stream.date_end), null, { short: true, });

    msg.reply = `стрим шёл ${total} и закончился ${when} назад`;
}

return msg;
