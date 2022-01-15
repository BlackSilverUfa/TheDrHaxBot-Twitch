// Code added here will be run once
// whenever the node is started.

const {
    intervalToDuration
} = dateFns; // = require('date-fns');

function dateDistance(start, end, options) {
    let { parts, accusative, short, zero, timestamp } = options || {};

    const locale = {
        years: ['год', 'года', 'лет'],
        months: ['месяц', 'месяца', 'месяцев'],
        days: ['день', 'дня', 'дней'],
        hours: ['час', 'часа', 'часов'],
        minutes: [accusative ? 'минуту' : 'минута', 'минуты', 'минут'],
        seconds: [accusative ? 'секунду' : 'секунд', 'секунды', 'секунд'],
    };

    const multipliers = [12, 30, 24, 60, 60, 1000];

    parts = parts || Object.keys(locale);
    end = end || new Date();

    const duration = intervalToDuration({ start, end });

    if (timestamp) {
        return ['hours', 'minutes', 'seconds']
            .map(p => String(duration[p]))
            .map((v, i) => i > 0 ? v.padStart(2, '0') : v)
            .join(':');
    }

    if (short) {
        const mainPart = parts.filter(p => duration[p] > 0)[0] || parts[parts.length - 1];
        const mainPartIndex = Object.keys(locale).indexOf(mainPart);

        const value = Object.keys(locale).reduce((a, k, i) => {
            if (duration[k] === 0) return a;

            let multiplier = 1;

            if (i < mainPartIndex) {
                multiplier *= multipliers.slice(i, mainPartIndex).reduce((a, v) => a * v);
            } else if (i > mainPartIndex) {
                multiplier /= multipliers.slice(mainPartIndex, i).reduce((a, v) => a * v);
            }

            return a + duration[k] * multiplier;
        }, 0).toFixed(1);

        return value + ' ' + agreeWithNum(value, locale[mainPart]);
    }

    return smartJoin(parts
        .filter(p => duration[p] > 0 || zero)
        .filter((p, i) => !short || i === 0)
        .map((p) => duration[p] + ' ' + agreeWithNum(duration[p], locale[p]))
        .filter(p => p != null));
}

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

async function twitch(namespace, method, call, payload) {
    const reply = await AF.invoke('twitch', { namespace, method, call, payload });
    if (reply.payload.error) {
        node.error(reply.payload.error);
        return null;
    }
    return reply.payload.data;
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

function fts(query, items, lambda) {
    query = tokenize(query);

    let max_rank = 0;

    return items.map((item) => {
        let words = tokenize(lambda(item));

        let rank = query.map((query_word) => (
            words.filter((word) => (
                word.startsWith(query_word)
            )).length > 0
        )).reduce((a, b) => a + b);

        if (rank > max_rank) {
            max_rank = rank;
        }

        return { item, rank };
    })
    .filter((item) => item.rank == max_rank && item.rank > 0)
    .map((item) => item.item);
}

function agreeWithNum(num, words) {
    if (num < 0) {
        num = Math.abs(num);
    }

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

function updateText(text, original, replacement) {
    if (replacement == null) return original;

    let regex;

    try {
        regex = new RegExp(original, 'g');
    } catch (e) {
        throw 'не удалось скомпилировать регулярное выражение';
    }

    if (!text.match(regex)) throw 'нечего менять';

    return text.replace(regex, replacement).trim();
}

function renderTemplate(str, vars) {
    (str.match(/\{.*?\}/g) || []).forEach((key) => {
        key = key.substring(1, key.length - 1);
        let value;

        if (key.indexOf('#') !== -1) {
            const [valKey, args] = key.split('#');
            value = agreeWithNum(vars[valKey], args.split(','));
        } else {
            value = vars[key];
        }

        str = str.replace(`{${key}}`, value);
    });

    return str;
}

function last(array) { // yes
    return array[array.length - 1];
}

flow.set('func', {
    mongo,
    twitch,
    Patterns,
    TZ,
    tokenize,
    fts,
    agreeWithNum,
    dateDistance,
    msToDate,
    choose,
    rchoose,
    wchoose,
    smartJoin,
    updateText,
    renderTemplate,
    last
}, 'memory');

node.status('Ready');
