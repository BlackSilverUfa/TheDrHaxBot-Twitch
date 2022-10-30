const { dateDistance, getStreamInfo } = flow.get('func', 'memory');
const now = +new Date();

const stream = getStreamInfo(msg.payload.channel);

if (!stream || !stream.game_history) {
    msg.reply = 'недостаточно информации о состоянии канала 🤔';
    return msg;
}

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

if (stream.active) {
    msg.reply = 'сегодня были: ' + timeline(stream);
} else {
    msg.reply = 'на предыдущем стриме были: ' + timeline(stream);
}

return msg;
