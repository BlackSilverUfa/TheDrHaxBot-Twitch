const DB = 'twitch_users';
const { mongo, twitch, smartJoin, dateDistance } = flow.get('func', 'memory');

const channel = msg.payload.channel.substring(1);
const username = msg.payload.userstate.username;

function reply(text) {
    node.send({ ...msg, reply: text });
}

async function findUserID(login) {
    let user = await mongo(DB, 'findOne', { login });

    if (!user) {
        [user] = await twitch('helix', 'GET', 'users', { login });

        if (!user) {
            return null;
        }

        user._id = user.id;
        if ((await mongo(DB, 'findOne', { _id: user.id })).length === 0) {
            await mongo(DB, 'insert', [user]);
        } else {
            await mongo(DB, 'replaceOne', [
                { _id: user.id },
                user,
            ]);
        }
    }

    return user.id;
}

const from_id = await findUserID(username);
const to_id = await findUserID(channel);

if (!from_id || !to_id) {
    return;
}

const [follow] = await twitch('helix', 'GET', 'users/follows', { from_id, to_id });

if (!follow) {
    reply('вы не отслеживаете этот канал Jebaited');
} else {
    const age = dateDistance(new Date(follow.followed_at), null, {
        parts: ['years', 'months', 'days'],
        accusative: true,
    });

    reply(`вы отслеживаете этот канал уже ${age} YEPPERS`);
}

