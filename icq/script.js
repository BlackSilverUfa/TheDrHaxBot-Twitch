if (msg.init) {
    const settings = msg.settings;

    settings.groups.map((group) => {
        group.step = (settings.range.max - settings.range.min) / group.emotes.length;
    });

    settings.groups = Object.assign({},
        ...settings.groups.map((x) => ({ [x.name]: x }))
    );

    context.set('settings', settings, 'memory');

    node.status('Ready');
    return;
}

const { choose, wchoose } = flow.get('func', 'memory');

const settings = context.get('settings', 'memory');
const groups = Object.keys(settings.groups);

function rand(min, max) {
    return min + Math.floor(Math.random() * (max - min + 1));
}

function renderTemplate(str, vars) {
    Object.entries(vars).forEach(([key, value]) => {
        str = str.split(`{${key}}`).join(value);
    });
    return str;
}

let value, delta, group;

if (!msg.icq) {
    value = rand(settings.range.min, settings.range.max);
    delta = 0;
    group = wchoose(groups, groups.map((group) => settings.groups[group].weight));
} else {
    value = msg.icq.value;
    group = msg.icq.group || Object.keys(groups)[0];

    if (msg.payload.message.split(' ')[0].indexOf('?') !== -1) { // !icq?
        delta = 0;
    } else {
        const new_icq = rand(settings.range.min, settings.range.max);
        delta = new_icq - value;
        value = new_icq;
        group = wchoose(groups, groups.map((group) => settings.groups[group].weight));
    }
}

const groupData = settings.groups[group];
const template = groupData.templates[delta !== 0 ? 'delta' : 'simple'];

let emote;

if (Object.keys(groupData.special).indexOf(`${value}`) !== -1) {
    emote = groupData.special[`${value}`];
} else {
    emote = groupData.emotes[Math.floor(value / groupData.step)];
}

return [
    { // reply
        ...msg,
        reply: renderTemplate(template, {
            value,
            delta: delta > 0 ? `+${delta}` : delta,
            emote
        })
    },
    { // db
        payload: {
            _id: msg.payload.userstate.username,
            value,
            group,
            checks: (msg.icq && msg.icq.checks) ? msg.icq.checks + 1 : 1,
            last_check: new Date().toISOString()
        }
    }
];
