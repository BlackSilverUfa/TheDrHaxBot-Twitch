const stream = flow.get('stream_status', 'file'); // https://red.thedrhax.pw/blackufa/twitch

// https://stackoverflow.com/a/32180863
function msToDelta(ms) {
  let seconds = (ms / 1000).toFixed(1);
  let minutes = (ms / (1000 * 60)).toFixed(1);
  let hours = (ms / (1000 * 60 * 60)).toFixed(1);
  let days = (ms / (1000 * 60 * 60 * 24)).toFixed(1);
  if (seconds < 60) return seconds + " сек.";
  else if (minutes < 60) return minutes + " мин.";
  else if (hours < 24) return hours + " ч.";
  else return days + " дн.";
}

let timeline = stream.game_history.map((game, i, arr) => [
    game.name,
    msToDelta(+(arr[i+1] ? new Date(arr[i+1].date) : new Date()) - new Date(game.date))
]).map(([name, duration]) => (
    `${name} (${duration})`
));

if (stream.active) {
    msg.reply = 'сегодня были: ' + timeline.join(', ');
} else {
    msg.reply = 'на предыдущем стриме были: ' + timeline.join(', ');
}

return msg;
