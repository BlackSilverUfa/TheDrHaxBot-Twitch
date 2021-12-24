// Code added here will be run once
// whenever the node is started.

const TZ = 3 * 60 * 60 * 1000; // GMT+3

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
    let seconds = (ms / 1000).toFixed(1),
        minutes = (ms / (1000 * 60)).toFixed(1),
        hours = (ms / (1000 * 60 * 60)).toFixed(1),
        days = (ms / (1000 * 60 * 60 * 24)).toFixed(1),
        weeks = (ms / (1000 * 60 * 60 * 24 * 7)).toFixed(1);

    if (seconds < 60)
        return seconds + ' ' + agreeWithNum(seconds, ['секунда', 'секунды', 'секунд']);
    else if (minutes < 60)
        return minutes + ' ' + agreeWithNum(minutes, ['минута', 'минуты', 'минут']);
    else if (hours < 24)
        return hours + ' ' + agreeWithNum(hours, ['час', 'часа', 'часов']);
    else if (days < 7)
        return days + ' ' + agreeWithNum(days, ['день', 'дня', 'дней']);
    else
        return weeks + ' ' + agreeWithNum(weeks, ['неделя', 'недели', 'недель']);
}

// https://stackoverflow.com/a/19700358
function msToTime(duration) {
    let seconds = Math.floor((duration / 1000) % 60),
        minutes = Math.floor((duration / (1000 * 60)) % 60),
        hours = Math.floor((duration / (1000 * 60 * 60)) % 24);

    minutes = (minutes < 10) ? '0' + minutes : minutes;
    seconds = (seconds < 10) ? '0' + seconds : seconds;

    return `${hours}:${minutes}:${seconds}`;
}

function msToDate(ms) {
    return new Date(ms).toISOString().split('T')[0];
}

flow.set('func', {
    TZ,
    agreeWithNum,
    msToDelta,
    msToTime,
    msToDate
}, 'memory');

node.status('Ready');
