if (msg.init) {
    const settings = msg.settings;

    settings.groups.map((group) => {
        group.step = (settings.range.max - settings.range.min) / group.emotes.length;

        if (group.emotes.length === 1) {
            group.step += 1;
        }
    });

    settings.groups = Object.assign({},
        ...settings.groups.map((x) => ({ [x.name]: x }))
    );

    context.set('settings', settings, 'memory');

    node.status('Ready');
    return;
}

const DB = 'icq_results';
const { amongo, choose, wchoose, renderTemplate } = flow.get('func', 'memory');

const settings = context.get('settings', 'memory');
const groups = Object.keys(settings.groups);

function rand(min, max) {
    return min + Math.floor(Math.random() * (max - min + 1));
}

async function main() {
    const _id = msg.payload.userstate.username;
    const [cmd, ...args] = msg.parsed.query_filtered.split(' ');
    let [icq] = await amongo(DB, 'find', { _id });

    switch (cmd) {
        case 'help':
            msg.reply = 'доступные команды: lock, unlock, help';
            return msg;
        
        case 'lock':
            if (!icq) {
                msg.reply = 'вы ещё не проверяли ICQ BUFANerd';
                return msg;
            }

            icq.lock = true;
            await amongo(DB, 'save', icq);

            msg.reply = 'теперь можно проверять ICQ без изменений peepoComfy';
            return msg;

        case 'unlock':
            if (!icq) {
                msg.reply = 'вы ещё не проверяли ICQ BUFANerd';
                return msg;
            }

            icq.lock = false;
            await amongo(DB, 'save', icq);

            msg.reply = 'теперь каждая проверка будет изменять ICQ YEPPERS';
            return msg;
        
        default:
            break;
    }

    let value, delta, group;

    if (!icq) {
        icq = { _id };
        value = rand(settings.range.min, settings.range.max);
        delta = 0;
        group = wchoose(groups, groups.map((group) => settings.groups[group].weight));

        await amongo(DB, 'save', {
            ...icq,
            value,
            group
        });
    } else {
        value = icq.value;
        group = icq.group || Object.keys(groups)[0];

        if (icq.lock || msg.payload.message.split(' ')[0].indexOf('?') !== -1) { // !icq?
            delta = 0;
        } else {
            const new_icq = rand(settings.range.min, settings.range.max);
            delta = new_icq - value;
            value = new_icq;
            group = wchoose(groups, groups.map((group) => settings.groups[group].weight));
        }

        await amongo(DB, 'save', {
            ...icq,
            value,
            group
        });
    }

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
