// Code added here will be run once
// whenever the node is started.

const AF = global.get('actionflows');

async function mongo(collection, operation, payload) {
    if (!Array.isArray(payload)) {
        if (operation == 'save') {
            if (payload._id) {
                operation = 'replaceOne';
                payload = [{ _id: payload._id }, payload];
            } else {
                operation = 'insert';
                payload = [payload];
            }
        } else {
            payload = [payload];
        }
    }

    const reply = await AF.invoke('mongo', { collection, operation, payload });
    if (reply.error) {
        node.error(reply.error);
        return null;
    }
    return reply.payload;
}

const Patterns = {};
Patterns.COMMAND_NAME = /[a-zа-яё0-9]{3,}/i;
Patterns.COMMAND = new RegExp(`^!(${Patterns.COMMAND_NAME.source}),?\\s*(.*)`, 'i');
Patterns.MENTION = /@([a-z0-9_]{4,25})/ig;

const TZ = 3 * 60 * 60 * 1000; // GMT+3

function tokenize(string) {
    string = string.toLowerCase().replace(/ё/g, 'е').trim();
    return string.split(' ').map((word) => {
        const match = word.match(/[a-zа-я0-9]+/g);
        return match ? match.join('') : null;
    }).filter((x) => x != null);
}

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

function choose(list) {
    return list[Math.floor(Math.random() * list.length)];
}

function rchoose(list) {
    const choice = choose(list);
    return Array.isArray(choice) ? rchoose(choice) : choice;
}

function wchoose(list, weights) {
    let total = 0;

    const cumulative = weights.map((x) => {
        const prev = total;
        total += x;
        return prev;
    });

    cumulative.push(total);

    const x = Math.floor(Math.random() * total);
    const y = Math.max(...cumulative.filter((weight) => weight < x));
    return list[cumulative.indexOf(y)];
}

function smartJoin(list, sep, last_sep) {
    sep = sep || ', ';
    last_sep = last_sep || ' и ';

    if (list.length == 0) return '';
    if (list.length == 1) return list[0];

    return list.slice(0, list.length - 1).join(sep) + last_sep + list[list.length - 1];
}

flow.set('func', {
    mongo,
    Patterns,
    TZ,
    tokenize,
    agreeWithNum,
    msToDelta,
    msToTime,
    msToDate,
    choose,
    rchoose,
    wchoose,
    smartJoin
}, 'memory');

node.status('Ready');
