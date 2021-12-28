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

const AF = global.get('actionflows');

async function mongo(action, payload) {
    const reply = await AF.invoke('mongo icq_results', { action, payload });
    if (reply.error) {
        node.error(reply.error);
        return null;
    }
    return reply.payload;
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

async function main() {
    const _id = msg.payload.userstate.username;
    let icq = (await mongo('find', { _id }))[0];

    let value, delta, group;

    if (!icq) {
        icq = { _id };
        value = rand(settings.range.min, settings.range.max);
        delta = 0;
        group = wchoose(groups, groups.map((group) => settings.groups[group].weight));
    } else {
        value = icq.value;
        group = icq.group || Object.keys(groups)[0];
        
        if (msg.payload.message.split(' ')[0].indexOf('?') !== -1) { // !icq?
            delta = 0;
        } else {
            const new_icq = rand(settings.range.min, settings.range.max);
            delta = new_icq - value;
            value = new_icq;
            group = wchoose(groups, groups.map((group) => settings.groups[group].weight));
        }
    }

    await mongo('save', {
        ...icq,
        value,
        group
    });

    const groupData = settings.groups[group];
    const template = groupData.templates[delta !== 0 ? 'delta' : 'simple'];

    let emote;

    if (Object.keys(groupData.special).indexOf(`${value}`) !== -1) {
        emote = groupData.special[`${value}`];
    } else {
        emote = groupData.emotes[Math.floor(value / groupData.step)];
    }

    return {
        ...msg,
        reply: renderTemplate(template, {
            value,
            delta: delta > 0 ? `+${delta}` : delta,
            emote
        })
    };
}

return main();
