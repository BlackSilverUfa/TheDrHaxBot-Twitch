const { dateDistance, ftime } = flow.get('func', 'memory');
const now = +new Date();

const key = 'twitch_channels.' + msg.command.channel.substring(1);
const stream = flow.get(key, 'file');

if (!stream || !stream.game_history) {
    msg.reply = 'недостаточно информации о состоянии канала 🤔';
    return msg;
}

const DATE_DIST_OPTS = {
    parts: ['hours', 'minutes', 'seconds'],
    short: true,
};

function timeline(stream, history) {
    history = history || stream.game_history;

    return history
        .map((game, i, arr) => {
            const name = game.name.replace(/\s\(.*?\)/, '');

            const end = arr[i+1] ?
                new Date(arr[i+1].date) :
                stream.active ?
                    new Date() :
                    new Date(stream.date_end);

            const start = new Date(game.date);

            if (+start > now) {
                const delta = dateDistance(now, start, DATE_DIST_OPTS);
                return `${name} (через ${delta})`;
            } else {
                const delta = dateDistance(start, end, DATE_DIST_OPTS);
                return `${name} (${delta})`;
            }
        }).join(', ');
}

function timecodes(stream, history) {
    history = history || stream.game_history;

    return history.map((game) => {
        const delta = (+new Date(game.date) - +new Date(stream.date)) / 1000;
        return `${ftime(delta)} - ${game.name}`;
    }).join(', ');
}

const [cmd] = msg.parsed.query_filtered.split(' ');
let answer;

switch (cmd) {
    case 'help':
        msg.reply = 'доступные команды: help, list';
        return msg;

    case 'list':
        answer = timecodes(stream);
        break;
    
    default:
        answer = timeline(stream);
}

if (stream.active) {
    msg.reply = `сегодня были: ${answer}`;
} else {
    msg.reply = `на предыдущем стриме были: ${answer}`;
}

return msg;
