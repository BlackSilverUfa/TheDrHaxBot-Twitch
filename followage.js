const { twitch, dateDistance } = flow.get('func', 'memory');

function reply(text) {
    node.send({ ...msg, reply: text });
}

const [follow] = await twitch('helix', 'GET', 'users/follows', {
    from_id: msg.payload.userstate['user-id'],
    to_id: msg.payload.userstate['room-id'],
});

if (!follow) {
    reply('вы не отслеживаете этот канал Jebaited');
} else {
    const age = dateDistance(new Date(follow.followed_at), null, {
        parts: ['years', 'months', 'days'],
        accusative: true,
    });

    reply(`вы отслеживаете этот канал уже ${age} YEPPERS`);
}

