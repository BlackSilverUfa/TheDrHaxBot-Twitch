const stream = flow.get('twitch_channels', 'file').blackufa;
const { TZ, msToDate, Patterns: { COMMAND }, updateText } = flow.get('func', 'memory');

const LINK = /\s*<.*?href="(.*?)".*?>.*?<\/.*?>\s*/ig;
const channel = msg.payload.channel.substring(1);
const CHANNEL_LINK = new RegExp(`(https?://)?twitch\.tv/${channel}[^\\s]*`, 'i');

const now = +new Date();
const lag = TZ - 6*60*60*1000; // reset date at 6:00

const query = msg.parsed.query_filtered;
const command = msg.payload.message.match(COMMAND)[1];

if (msg.parsed.level <= 1) { // mods and up
    const [cmd, ...args] = query.split(' ');

    switch (cmd) {
        case 'set':
        case 'update':
            try {
                stream.announcement = {
                    text: updateText(
                        stream.announcement.text,
                        ...args.join(' ').split(/\s\/{3}\s|\/{3}/)
                    ),
                    photo: stream.announcement.photo,
                    date: msToDate(now + TZ),
                    source: {
                        twitch: msg.payload.userstate.username,
                    },
                };
            } catch (e) {
                msg.reply = e;
                return msg;
            }

            flow.set('twitch_channels.blackufa', stream, 'file');

            msg.reply = 'анонс обновлён SeemsGood';
            return msg;

        case 'reuse':
            stream.announcement.date = msToDate(now + lag);
            flow.set('twitch_channels.blackufa', stream, 'file');

            msg.reply = 'анонс обновлён SeemsGood';
            return msg;

        case 'reset':
            stream.announcement.date = '0000-00-00';
            flow.set('twitch_channels.blackufa', stream, 'file');

            msg.reply = 'анонс удалён bigBossSalut';
            return msg;
        
        case 'help':
            msg.reply = 'доступные команды: update, vk, reuse, reset';
            return msg;
    }
}

if (stream.announcement.date == msToDate(now + lag)) {
    let text = stream.announcement.text
        .replace(/\n/g, ' ')
        .replace(LINK, (a, b) => b)
        .replace(CHANNEL_LINK, ' ');

    msg.reply = `сегодняшний ${command}: ${text.trim()}`;
} else {
    msg.reply = `сегодня не было ${command}а peepoSHAKE`;
}

return msg;
