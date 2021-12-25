const MIN_ICQ = 0;
const MAX_ICQ = 150;

function rand(min, max) {
    return min + Math.floor(Math.random() * (max - min + 1));
}

let icq, delta;

if (!msg.icq) {
    icq = rand(MIN_ICQ, MAX_ICQ);
    delta = 0;
} else {
    icq = msg.icq.value;

    if (msg.payload.message.split(' ')[0].indexOf('?') !== -1) { // !icq?
        delta = 0;
    } else {
        const new_icq = rand(MIN_ICQ, MAX_ICQ);
        delta = new_icq - icq;
        icq = new_icq;
    }
}

return [
    { // reply
        ...msg,
        icq,
        delta: 0
    },
    { // db
        payload: {
            _id: msg.payload.userstate.username,
            value: icq
        }
    }
];
