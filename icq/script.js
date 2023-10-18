if (msg.init) {
    const settings = msg.settings;
    const { options: { range } } = settings;

    settings.groups.map((group) => {
        group.step = (range.max - range.min) / group.emotes.length;

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
const now = new Date();

function rand(min, max) {
    return min + Math.floor(Math.random() * (max - min + 1));
}

function emote(icq) {
    const groupData = settings.groups[icq.group];

    if (groupData.special && Object.keys(groupData.special).indexOf(`${icq.value}`) !== -1) {
        return groupData.special[`${icq.value}`];
    }

    return groupData.emotes[Math.floor(icq.value / groupData.step)];
}

async function performSwap(source, target) {
    [source.value, target.value] = [target.value, source.value];
    [source.group, target.group] = [target.group, source.group];
    [source.lock, target.lock] = [true, true];
    delete target.transfer;

    return Promise.all([
        amongo(DB, 'save', source),
        amongo(DB, 'save', target),
    ]);
}

async function abortSwap(target) {
    delete target.transfer;
    return amongo(DB, 'save', target);
}

async function cmdSwapRequest(icq, target) {
    const [oIcq] = await amongo(DB, 'find', { transfer: icq._id });

    if (oIcq) {
        msg.reply = `вы уже предложили обмен @${oIcq._id}. Используйте !icq cancel, чтобы отменить YEPPERS`;
        return msg;
    }

    let [rIcq] = await amongo(DB, 'find', { _id: target });

    if (settings.options.bots.indexOf(target) !== -1) {
        if (!rIcq) {
            rIcq = {
                _id: target,
                value: rand(settings.options.range.min, settings.options.range.max),
                group: wchoose(groups, groups.map((group) => settings.groups[group].weight)),
                last_check: now.toISOString(),
                checks: 1,
            };
        }

        msg.reply = `@${target} молча соглашается поменяться с вами ICQ: ${icq.value} ${emote(icq)} ↔ ${rIcq.value} ${emote(rIcq)} YEPPERS`;
        await performSwap(icq, rIcq);
        return msg;
    }

    if (!rIcq) {
        msg.reply = `получатель не найден peepoThink`;
        return msg;
    }

    if (rIcq.transfer) {
        msg.reply = `получателю уже поступил запрос от ${rIcq.transfer}`;
        return msg;
    }

    rIcq.transfer = icq._id;
    msg.reply = `@${icq._id} предлагает @${rIcq._id} поменяться ICQ: ${icq.value} ${emote(icq)} ↔ ${rIcq.value} ${emote(rIcq)}`;
    msg.reply += ' Используйте !icq accept/decline, чтобы принять/отклонить YEPPERS';

    await amongo(DB, 'save', rIcq);
    return msg;
}

async function main() {
    const _id = msg.payload.userstate.username;
    const [cmd, ...args] = msg.parsed.query_filtered.split(' ');
    let [icq] = await amongo(DB, 'find', { _id });

    switch (cmd) {
        case 'help':
            msg.reply = 'доступные команды: lock, unlock, help, swap';
            return msg;

        case 'swap':
            if (msg.parsed.mentions_list.length === 0) {
                msg.reply = 'укажите ник получателя через @';
                return msg;
            }

            return cmdSwapRequest(icq, msg.parsed.mentions_list[0]);

        case 'cancel':
            const [cIcq] = await amongo(DB, 'find', { transfer: _id });

            if (!cIcq) {
                msg.reply = 'активных предложений не найдено peepoThink';
                return msg;
            }

            delete cIcq.transfer;
            await amongo(DB, 'save', cIcq);

            msg.reply = 'предложение успешно отменено SeemsGood';
            return msg;

        case 'accept':
            if (!icq.transfer) {
                msg.reply = 'нет активных предложений peepoThink';
                return msg;
            }

            const [sIcq] = await amongo(DB, 'find', { _id: icq.transfer });

            await performSwap(sIcq, icq);

            msg.reply = 'обмен успешно завёршён! Используйте "!icq" для проверки или "!icq unlock" для перезаписи YEPPERS';
            return msg;

        case 'decline':
            if (!icq.transfer) {
                msg.reply = 'нет активных предложений peepoThink';
                return msg;
            }

            const sName = icq.transfer;

            await abortSwap(icq);

            msg.reply = `предложение об обмене ICQ с ${sName} отклонено`;
            return msg;

        case 'lock':
            if (!icq) {
                msg.reply = 'вы ещё не проверяли ICQ BUFANerd';
                return msg;
            }

            icq.lock = true;
            await amongo(DB, 'save', icq);

            msg.reply = 'теперь можно проверять ICQ без изменений peepoComfy Разблокировать можно командой "!icq unlock" YEPPERS';
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

    if (icq?.last_check && (+now - +new Date(icq.last_check) < 60000)) {
        msg.reply = 'ICQ можно проверять не чаще раза в минуту BUFANerd';
        return msg;
    }

    let value, delta, group;

    if (!icq) {
        icq = { _id };
        value = rand(settings.options.range.min, settings.options.range.max);
        delta = 0;
        group = wchoose(groups, groups.map((group) => settings.groups[group].weight));

        await amongo(DB, 'save', {
            ...icq,
            value,
            group,
            last_check: now.toISOString(),
            checks: 1,
        });
    } else {
        value = icq.value;
        group = icq.group || Object.keys(groups)[0];

        if (icq.lock || msg.payload.message.split(' ')[0].indexOf('?') !== -1) { // !icq?
            delta = 0;
        } else {
            const new_icq = rand(settings.options.range.min, settings.options.range.max);
            delta = new_icq - value;
            value = new_icq;
            group = wchoose(groups, groups.map((group) => settings.groups[group].weight));
        }

        await amongo(DB, 'save', {
            ...icq,
            value,
            group,
            last_check: delta !== 0 ? now.toISOString() : icq.last_check,
            checks: (icq.checks || 0) + 1,
        });
    }

    const groupData = settings.groups[group];
    let template = groupData.templates[delta !== 0 ? 'delta' : 'simple'];

    if (Object.keys(groupData.special).indexOf(`${value}`) !== -1 && delta != 0) {
        template += ' Вы можете закрепить это значение командой "!icq lock" YEPPERS';
    }

    return {
        ...msg,
        reply: renderTemplate(template, {
            value,
            delta: delta > 0 ? `+${delta}` : delta,
            emote: emote({ value, group }),
        })
    };
}

return main();
