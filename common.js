// Code added here will be run once
// whenever the node is started.

const {
    intervalToDuration
} = dateFns; // = require('date-fns');

const { uniq, sum, reverse, padStart, range } = lodash; // = require('lodash');

function mulberry32(a) {
    return function () {
        var t = a += 0x6D2B79F5;
        t = Math.imul(t ^ t >>> 15, t | 1);
        t ^= t + Math.imul(t ^ t >>> 7, t | 61);
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }
}

const random = mulberry32(+new Date());
// const random = Math.random;

const throttle = (func, delay) => {
    let timer = null;

    return (...args) => {
        if (timer === null) {
            const res = func(...args);

            timer = setTimeout(() => {
                timer = null;
            }, delay);

            return res;
        }
    };
};

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

        return value + ' ' + pluralize(value, locale[mainPart]);
    }

    return smartJoin(parts
        .filter(p => duration[p] > 0 || zero)
        .filter((p, i) => !short || i === 0)
        .map((p) => duration[p] + ' ' + pluralize(duration[p], locale[p]))
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

async function telegram(call, payload) {
    const reply = await AF.invoke('telegram', { call, payload });
    if (reply.payload.ok === false) {
        node.error(reply.payload);
        return null;
    }
    return reply.payload;
}

const Patterns = {};
Patterns.COMMAND_NAME = /[a-zа-яё0-9\-_]{2,}/i;
Patterns.COMMAND = new RegExp(`^!\\s?(${Patterns.COMMAND_NAME.source}),?\\s*(.*)`, 'i');
Patterns.MENTION = /@([a-z0-9_]{4,25})/ig;
// Patterns.EMOJI = /\p{Emoji_Presentation}/ug;
Patterns.EMOJI = /\p{Extended_Pictographic}/ug;
Patterns.DOMAIN = /((?!-))(xn--)?[a-z0-9][a-z0-9-_]{0,61}[a-z0-9]{0,1}\.(xn--)?([a-z0-9\-]{1,61}|[a-z0-9-]{1,30}\.[a-z]{2,})/i;
Patterns.MATRIX_ID = new RegExp(`((@.*?):${Patterns.DOMAIN.source})`, 'ig');

const TZ = 3 * 60 * 60 * 1000; // GMT+3

function tokenize(text) {
    return (text || '').toLowerCase().trim().replace(/ё/g, 'е').split(' ').map((word) => {
        const match = word.toLowerCase().match(/[a-zа-я0-9]+/g);
        return match ? match.join('') : '';
    }).filter((w) => w);
}

function pluralize(num, words) {
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

function wchoose(list, weights) {
    const cumulative = weights.reduce((arr, curr) => {
        arr.push(last(arr) + curr);
        return arr;
    }, [0]);

    const total = last(cumulative);

    const x = Math.floor(random() * total);
    const y = Math.max(...cumulative.filter((weight) => weight <= x));
    return list[cumulative.indexOf(y)];
}

function choose(list, bias = null, biasWeight = 0.2) {
    if (bias) {
        const weights = list.map((item) => 100 * (1 + biasWeight * Math.sign(bias(item))));
        return wchoose(list, weights);
    }

    return list[Math.floor(random() * list.length)];
}

function rchoose(list) {
    const choice = choose(list);

    if (Array.isArray(choice.each)) {
        const res = [];

        for (let i of choice.each) {
            res.push(rchoose(i));
        }

        return res.join(choice.sep || ' ');
    }

    return Array.isArray(choice) ? rchoose(choice) : choice;
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
    const REGEX_FUNC = /^([a-z0-9]+)\((.*)\)$/i;

    (str.match(/\{.*?\}/g) || []).forEach((key) => {
        key = key.substring(1, key.length - 1);
        let value;

        if (key.match(REGEX_FUNC)) {
            let [_, func, args] = key.match(REGEX_FUNC);
            args = args.split(/\s?,\s?/);

            switch (func) {
                case 'rand':
                    value = choose(args) || '';
                    break;

                default:
                    value = '';
            }
        } else if (key.indexOf('#') !== -1) {
            const [valKey, args] = key.split('#');
            value = pluralize(vars[valKey], args.split(','));
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

const ptime = (t) => {
    let sign = 1;

    if (t[0] === '-') {
        sign = -1;
        t = t.slice(1);
    }

    return sign * sum(reverse(t.split(':')).map((x, i) => x * 60 ** i))
};

const ftime = (t) => {
    const sign = t < 0;
    if (sign) t = -t;

    return (sign ? '-' : '') + range(2, -1, -1).reduce((acc, cur) => {
        const res = Math.floor(t / 60 ** cur);
        if (cur === 2 && res === 0) return acc; // skip 0 hours
        t %= 60 ** cur;
        return [
            ...acc,
            acc.length > 0
                ? padStart(res, 2, '0')
                : res,
        ];
    }, []).join(':');
};

const parseEmotes = (text, manualRanges = []) => {
    const emotes = flow.get('emotes', 'file');

    let found = [];
    let emotesOnly = true;

    text.split(' ').reduce((acc, curr) => {
        const start = acc.length;
        const length = curr.length;

        if (emotes[curr]) {
            found.push({
                emote: emotes[curr],
                start,
                length
            });
        } else if (curr.match(Patterns.EMOJI)) {
            found.push({
                emote: {
                    name: curr,
                    source: 'emoji',
                    scope: 'global',
                },
                start,
                length
            });
        } else if (curr.match(/<:.+:[0-9]+>/)) {
            found.push({
                emote: {
                    name: curr,
                    source: 'discord',
                },
                start,
                length
            })
        } else if (curr.length > 0) {
            const manual = manualRanges.find(([x, y]) => x === start);

            if (manual) {
                const [x, y] = manual;

                found.push({
                    emote: {
                        name: text.substring(x, y),
                        source: 'manual',
                        scope: 'global',
                    },
                    start: x,
                    length: y - x,
                });
            } else {
                emotesOnly = false;
            }
        }

        return `${acc} ${curr}`;
    }, '');

    return [found, emotesOnly];
};

flow.set('func', {
    amongo,
    random,
    throttle,
    twitch,
    telegram,
    Patterns,
    TZ,
    tokenize,
    pluralize,
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
    parseEmotes,
}, 'memory');

node.status('Ready');

node.send({ init: true });
