const stream = flow.get('stream_status', 'file'); // https://red.thedrhax.pw/blackufa/twitch
const rerun = flow.get('rerun_status', 'file');

function agreeWithNum(num, words) {
    if (num >= 20) {
        num = num % 10;
    }

    if (num == 1) {
        return words[0];
    } else if (num > 1 && num < 5) {
        return words[1];
    } else {
        return words[2];
    }
}

// https://stackoverflow.com/a/32180863
function msToDelta(ms) {
    let seconds = (ms / 1000).toFixed(1);
    let minutes = (ms / (1000 * 60)).toFixed(1);
    let hours = (ms / (1000 * 60 * 60)).toFixed(1);
    let days = (ms / (1000 * 60 * 60 * 24)).toFixed(1);
    
    if (seconds < 60)
        return seconds + ' ' + agreeWithNum(seconds, ['секунда', 'секунды', 'секунд']);
    else if (minutes < 60)
        return minutes + ' ' + agreeWithNum(minutes, ['минута', 'минуты', 'минут']);
    else if (hours < 24)
        return hours + ' ' + agreeWithNum(hours, ['час', 'часа', 'часов']);
    else
        return days + ' ' + agreeWithNum(days, ['день', 'дня', 'дней']);
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
