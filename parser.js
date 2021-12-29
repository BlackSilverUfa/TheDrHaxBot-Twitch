const { Patterns: { MENTION, COMMAND } } = flow.get('func', 'memory');

function groups(str, regex, group) {
    group = group == null ? 1 : group;
    return [...str.matchAll(regex)].map(x => x[group]);
}

if (msg.payload.self) {
    return [null, null];
}

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
 * Parse mentions
 * Streamer is ignored to avoid distraction
 */

parsed.mentions_list = groups(msg.payload.message.toLowerCase(), MENTION)
    .filter(x => (x != msg.payload.channel.substring(1) || parsed.level <= 2));

parsed.mentions = parsed.mentions_list
    .map(x => `@${x}`)
    .join(', ');

/**
 * Parse command and query
 */

const command = msg.payload.message.match(COMMAND);

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
 * Deploy message
 */

msg.parsed = parsed;

if (command)
    return [msg, null];
else
    return [null, msg];

