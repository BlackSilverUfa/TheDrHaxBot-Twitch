const SELF = 'thedrhaxbot';

const { twitch, Patterns: { MENTION, COMMAND }, parseEmotes } = flow.get('func', 'memory');

function groups(str, regex, group) {
    group = group == null ? 1 : group;
    return [...str.matchAll(regex)].map(x => x[group]);
}

msg.payload.self = msg.payload.userstate.username === SELF;

/**
 * Methods
 */

let api = {};

api.delete = (id = msg.payload.userstate.id) => twitch(
    'helix', 'DELETE', 'moderation/chat', {
        broadcaster_id: msg.payload.userstate['room-id'],
        moderator_id: 573134756,
        message_id: id,
    },
);

api.timeout = (duration = 1, reason = '', id = msg.payload.userstate['user-id']) => twitch(
    'helix', 'POST',
    `moderation/bans?broadcaster_id=${msg.payload.userstate['room-id']}&moderator_id=573134756`,
    {
        data: {
            user_id: id,
            duration,
            reason,
        },
    },
);

msg.api = api;

let parsed = {};

/**
 * Level based on badges
 */

const badges = Object.keys(msg.payload.userstate.badges || {});

parsed.level = (
    msg.payload.userstate.username == 'thedrhax' ? -1 :
    badges.indexOf('broadcaster') !== -1 ? 0 :
    badges.indexOf('moderator') !== -1 ? 1 :
    badges.indexOf('vip') !== -1 ? 2 :
    badges.indexOf('subscriber') !== -1 ? 3 :
    4
);

/**
 * Support for threads
 */

const replyTo = msg.payload.userstate['reply-parent-display-name'];

if (replyTo) {
    msg.payload.message = msg.payload.message.substring(replyTo.length + 2);
}

/**
 * Parse mentions
 * Streamer is ignored to avoid distraction
 */

parsed.mentions_list = groups(msg.payload.message.toLowerCase(), MENTION);

let mentioned = msg.payload.userstate['reply-parent-user-login'] === SELF;

if (!mentioned) {
    mentioned = parsed.mentions_list.indexOf(SELF) !== -1;

    // if (mentioned) {
    //     parsed.mentions_list.splice(parsed.mentions_list.indexOf(SELF), 1);
    // }
}

// if (parsed.mentions_list.length === 0 && replyTo) {
//     let login = msg.payload.userstate['reply-parent-user-login'];
//     msg.payload.message += ` @${login}`;
//     parsed.mentions_list.push(login);
// }

/**
 * Parse command and query
 */

let command = msg.payload.message.match(COMMAND);

if (!command && mentioned) {
    let tmpmsg = msg.payload.message.replace(new RegExp(`@${SELF},?\s*`, 'ig'), '');

    command = [
        '!_main_ ' + tmpmsg,
        '_main_',
        tmpmsg,
    ];
}

if (command) {
    parsed.command = command[1];
    parsed.icommand = command[1].toLowerCase();

    let query = command[2];
    parsed.query = query;
    
    if (query) {
        query = query.split('|')[0];
        
        if (parsed.mentions_list.length > 0) {
            let index = parsed.query.toLowerCase().indexOf('@' + parsed.mentions_list[0]);
            query = query.substring(0, index);
        }
        
        parsed.query_filtered = query.trim();
    } else {
        parsed.query_filtered = '';
    }
}

/**
 * Format mentions
 */

parsed.mentions_list = parsed.mentions_list
    .filter(x => (x != msg.payload.channel.substring(1) || parsed.level <= 2));

parsed.mentions = parsed.mentions_list
    .map(x => `@${x}`)
    .join(', ');

/**
 * Parse emotes
 */

const [found, emotesOnly] = parseEmotes(command ? parsed.query : msg.payload.message);

parsed.emotes = found;
parsed.emotesOnly = emotesOnly && found.length > 0;

/**
 * Deploy message
 */

msg.parsed = parsed;

if (command)
    return [msg, null];
else
    return [null, msg];

