// Code added here will be run once
// whenever the node is started.

const {
    intervalToDuration
} = dateFns; // = require('date-fns');

const { uniq, sum, reverse, padStart, range } = lodash; // = require('lodash');

function dateDistance(start, end, options) {
    let { parts, accusative, short, zero, timestamp } = options || {};

    const locale = {
        years: ['год', 'года', 'лет', 'г.'],
        months: ['месяц', 'месяца', 'месяцев', 'мес.'],
        days: ['день', 'дня', 'дней', 'дн.'],
        hours: ['час', 'часа', 'часов', 'ч.'],
        minutes: [accusative ? 'минуту' : 'минута', 'минуты', 'минут', 'м.'],
        seconds: [accusative ? 'секунду' : 'секунд', 'секунды', 'секунд', 'сек.'],
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
        }, 0).toFixed(1).replace(/\.0$/, '');

        return value + ' ' + agreeWithNum(value, locale[mainPart]);
    }

    return smartJoin(parts
        .filter(p => duration[p] > 0 || zero)
        .filter((p, i) => !short || i === 0)
        .map((p) => duration[p] + ' ' + agreeWithNum(duration[p], locale[p]))
        .filter(p => p != null));
}

const AF = global.get('actionflows');

async function amongo(collection, operation, query, payload) {
    if (operation !== 'update') {
        payload = query;
        query = null;
    }

    const reply = await AF.invoke('amongo', { collection, operation, query, payload });
    if (reply.error) {
        node.error(reply.error, { collection, operation, query, payload });
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
Patterns.COMMAND_NAME = /[a-zа-яё0-9]{2,}/i;
Patterns.COMMAND = new RegExp(`^!\\s?(${Patterns.COMMAND_NAME.source}),?\\s*(.*)`, 'i');
Patterns.MENTION = /@([a-z0-9_]{4,25})/ig;

const TZ = 3 * 60 * 60 * 1000; // GMT+3

function tokenize(text) {
    return (text || '').toLowerCase().trim().replace(/ё/g, 'е').split(' ').map((word) => {
        const match = word.toLowerCase().match(/[a-zа-я0-9]+/g);
        return match ? match.join('') : '';
    }).filter((w) => w);
}

function agreeWithNum(num, words) {
    if (num < 0) {
        num = Math.abs(num);
    }
    
    if (num >= 100) {
        num %= 100;
    }

    if (num >= 20) {
        num %= 10;
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

const ptime = (t) => (
    sum(reverse(t.split(':')).map((x, i) => x * 60 ** i))
);

const ftime = (t) => (
    range(2, -1, -1).map((i) => {
        const res = Math.floor(t / 60 ** i);
        t %= 60 ** i;
        return padStart(res, 2, '0');
    }).join(':')
);

flow.set('func', {
    amongo,
    twitch,
    Patterns,
    TZ,
    tokenize,
    agreeWithNum,
    dateDistance,
    msToDate,
    choose,
    rchoose,
    wchoose,
    smartJoin,
    updateText,
    renderTemplate,
    last,
    ptime,
    ftime,
}, 'memory');

node.status('Ready');

node.send({ init: true });
