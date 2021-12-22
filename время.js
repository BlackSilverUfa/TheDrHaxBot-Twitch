const stream = flow.get('stream_status', 'file')
const rerun = flow.get('rerun_status', 'file');
const query = msg.parsed.query_filtered;

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

// https://stackoverflow.com/a/19700358
function msToTime(duration) {
  let milliseconds = Math.floor((duration % 1000) / 100),
      seconds = Math.floor((duration / 1000) % 60),
      minutes = Math.floor((duration / (1000 * 60)) % 60),
      hours = Math.floor((duration / (1000 * 60 * 60)) % 24);

  // hours = (hours < 10) ? "0" + hours : hours;
  minutes = (minutes < 10) ? "0" + minutes : minutes;
  seconds = (seconds < 10) ? "0" + seconds : seconds;

  return hours + ":" + minutes + ":" + seconds;
}

if (stream.active) {
    let total = msToTime(+new Date() - new Date(stream.date));
    let category = msToDelta(+new Date() - new Date(stream.game_changed_at));

    msg.reply = `стрим идёт уже ${total}, игра изменена ${category} назад YEPPERS`;
} else if (rerun.active) {
    let total = msToTime(+new Date() - new Date(rerun.date));

    msg.reply = `повтор идёт уже ${total} YEPPERS`;
} else {
    let total = msToTime(+new Date(stream.date_end) - new Date(stream.date));
    let when = msToDelta(+new Date() - new Date(stream.date_end));

    msg.reply = `стрим шёл ${total} и закончился ${when} назад peepoSHAKE`;
}

return msg;
