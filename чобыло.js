const stream = flow.get('stream_status', 'file'); // https://red.thedrhax.pw/blackufa/twitch
const { dateDistance } = flow.get('func', 'memory');

const DATE_DIST_OPTS = {
    parts: ['hours', 'minutes', 'seconds'],
    short: true,
};

const timeline = stream.game_history.map((game, i, arr) => {
    const end = arr[i+1] ?
        new Date(arr[i+1].date) :
        stream.active ?
            new Date() :
            new Date(stream.date_end);
    return [game.name, dateDistance(new Date(game.date), end, DATE_DIST_OPTS)];
}).map(([name, duration]) => (
    `${name} (${duration})`
));

if (stream.active) {
    msg.reply = 'сегодня были: ' + timeline.join(', ');
} else {
    msg.reply = 'на предыдущем стриме были: ' + timeline.join(', ');
}

return msg;
