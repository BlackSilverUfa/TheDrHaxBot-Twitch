const stream = flow.get('stream_status', 'file');
const { TZ, msToDate } = flow.get('func', 'memory');

const now = +new Date();
const lag = TZ - 6*60*60*1000; // reset date at 6:00

const query = msg.parsed.query_filtered;

if (msg.parsed.level <= 1) { // mods and up
    [cmd, ...args] = query.split(' ');

    switch (cmd) {
        case 'set':
            if (args.length == 0) break;

            stream.announcement = {
                text: args.join(' '),
                date: msToDate(now + TZ),
                source: {
                    twitch: msg.payload.userstate.username,
                },
            };

            flow.set('stream_status', stream, 'file');

            msg.reply = 'анонс обновлён SeemsGood';
            return [msg, null];

        case 'tweet':
            const id = args[0];

            if (id && isNaN(id)) {
                msg.reply = 'ID твита должен состоять только из цифр BUFANerd';
                return msg;
            }

            msg.message = msg.payload;
            msg.date = msToDate(now + TZ);
            msg.payload = { id };

            return [null, msg];

        case 'reuse':
            stream.announcement.date = msToDate(now + lag);
            flow.set('stream_status', stream, 'file');

            msg.reply = 'анонс обновлён SeemsGood';
            return [msg, null];

        case 'reset':
            stream.announcement.date = '0000-00-00';
            flow.set('stream_status', stream, 'file');

            msg.reply = 'анонс удалён bigBossSalut';
            return [msg, null];
    }
}

if (stream.announcement.date == msToDate(now + lag)) {
    const text = stream.announcement.text
        .replace(/\n/, ' ')
        .replace(/\s*<.*?>.*?<\/.*?>\s*/i, ' ');

    msg.reply = `сегодняшний ${msg.parsed.command}: ${text}`;
} else {
    msg.reply = `сегодня не было ${msg.parsed.command}а peepoSHAKE`;
}

return [msg, null];
