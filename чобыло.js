const stream = flow.get('stream_status', 'file'); // https://red.thedrhax.pw/blackufa/twitch
const { msToDelta } = flow.get('func', 'memory');

let timeline = stream.game_history.map((game, i, arr) => [
    game.name,
    msToDelta(+(
        arr[i+1] ?
            new Date(arr[i+1].date) :
            stream.active ?
                new Date() :
                new Date(stream.date_end)
    ) - new Date(game.date))
]).map(([name, duration]) => (
    `${name} (${duration})`
));

if (stream.active) {
    msg.reply = 'сегодня были: ' + timeline.join(', ');
} else {
    msg.reply = 'на предыдущем стриме были: ' + timeline.join(', ');
}

return msg;
