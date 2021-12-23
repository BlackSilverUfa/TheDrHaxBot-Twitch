const stream = flow.get('stream_status', 'file'); // https://red.thedrhax.pw/blackufa/twitch

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
