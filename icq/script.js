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
const { intersection, flattenDeep, range, inRange } = _; // = require('lodash');
const { amongo, random, choose, wchoose, renderTemplate } = flow.get('func', 'memory');

const settings = context.get('settings', 'memory');
const groups = Object.keys(settings.groups);
const now = new Date();

function rand(min, max) {
    return min + Math.floor(random() * (max - min + 1));
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

function randGroup() {
    const totalWeight = groups
        .map((g) => settings.groups[g])
        .reduce((acc, cur) => acc + cur.weight, 0);

    const emotes = msg.parsed.emotes.map(({ emote: { name }}) => name);

    const weights = groups
        .map((g) => settings.groups[g])
        .map((group) => {
            if (group.weight >= 100) {
                return group.weight;
            }

            const groupEmotes = flattenDeep([
                group.emotes.map((e) => e.split(' ')),
                Object.values(group.special).map((e) => e.split(' ')),
            ]);
            const boosted = intersection(emotes, groupEmotes).length > 0;
            return group.weight + (boosted ? (totalWeight * 0.25) : 0);
        });

    return wchoose(groups, weights);
}

function newResult() {
    return {
        value: rand(settings.options.range.min, settings.options.range.max),
        group: randGroup(),
    };
}

function renderResult(icq, delta = 0) {
    const groupData = settings.groups[icq.group];
    let template = groupData.templates[delta !== 0 ? 'delta' : 'simple'];

    if (Object.keys(groupData.special).indexOf(`${icq.value}`) !== -1 && delta != 0) {
        template += ' Вы можете закрепить это значение командой "!icq lock" YEPPERS';
    }

    return renderTemplate(template, {
        value: icq.value,
        delta: delta > 0 ? `+${delta}` : delta,
        emote: emote({
            value: icq.value,
            group: icq.group,
        }),
    });
}

async function main() {
    const _id = msg.origin.userstate.username;
    const [cmd, ...args] = msg.parsed.query_filtered.split(' ');
    let [icq] = await amongo(DB, 'find', { _id });

    switch (cmd) {
        case 'help':
            msg.reply = 'доступные команды: lock, unlock, swap @пользователь, slot [номер]';
            return msg;

        case 'slot':
            icq.slot ||= 0;
            icq.slots ||= [];
            while (icq.slots.length < settings.options.slots - 1) {
                icq.slots.push(null);
            }

            if (args.length === 0) {
                msg.reply = 'у вас есть: ' + range(settings.options.slots).map((i) => (
                    i === icq.slot ? icq :
                    i === 0 ? icq.slots[icq.slot - 1] :
                    icq.slots[i - 1]
                )).map((data) => {
                    if (!data) return 'пусто';
                    return data.value + (data.lock ? '⁺' : '') + ' ' + emote(data);
                }).join(' | ');

                return msg;
            }

            const targetSlot = args[0] - 1;

            if (!inRange(targetSlot, 0, settings.options.slots)) {
                msg.reply = `укажите номер слота от 1 до ${settings.options.slots}`;
                return msg;
            }

            if (targetSlot === icq.slot) {
                msg.reply = 'этот слот уже выбран YEPPERS';
                return msg;
            }

            const [oIcq] = await amongo(DB, 'find', { transfer: icq._id });

            if (oIcq) {
                msg.reply = `вы предложили обмен @${oIcq._id}, сначала отмените с помощью "!icq cancel" YEPPERS`;
                return msg;
            }

            function swapSlots(icq, i) {
                icq.slots[i] ||= newResult();

                const slot = icq.slots[i];

                [icq.value, slot.value] = [slot.value, icq.value];
                [icq.group, slot.group] = [slot.group, icq.group];
                [icq.lock, slot.lock] = [slot.lock, icq.lock];
            }

            if (icq.slot) {
                swapSlots(icq, icq.slot - 1);
                icq.slot = 0;
            }

            if (targetSlot > 0) {
                swapSlots(icq, targetSlot - 1);
                icq.slot = targetSlot;
            }

            delete icq.transfer;
            await amongo(DB, 'save', icq);

            msg.reply = renderResult(icq);
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

    let delta = 0;

    if (!icq) {
        icq = {
            _id,
            ...newResult(),
        };

        await amongo(DB, 'save', {
            ...icq,
            last_check: now.toISOString(),
            checks: 1,
        });
    } else {
        icq.group ||= Object.keys(groups)[0];

        if (!icq.lock && msg.origin.message.split(' ')[0].indexOf('?') === -1) { // !icq?
            const res = newResult();

            if (icq.value != null) {
                delta = res.value - icq.value;
            }

            icq.value = res.value;
            icq.group = res.group;
        }

        await amongo(DB, 'save', {
            ...icq,
            last_check: delta !== 0 ? now.toISOString() : icq.last_check,
            checks: (icq.checks || 0) + 1,
        });
    }

    msg.reply = renderResult(icq, delta);
    return msg;
}

return main();
