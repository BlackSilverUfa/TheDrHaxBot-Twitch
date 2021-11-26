const MIN_ICQ = 0;
const MAX_ICQ = 150;

function rand(min, max) {
    return min + Math.floor(Math.random() * (max - min + 1));
}

let db = flow.get('blackufa_icq', 'file') || {};
let user = msg.payload.userstate.username;

if (Object.keys(db).indexOf(user) === -1) {
    let icq = rand(MIN_ICQ, MAX_ICQ);

    db[user] = icq;
    flow.set('blackufa_icq', db, 'file');

    msg.icq = icq;
    msg.delta = 0;
} else {
    let icq = db[user];
    
    if (msg.payload.message.split(' ')[0].indexOf('?') !== -1) { // !icq?
        msg.icq = icq;
        msg.delta = 0;
        return msg;
    }

    let new_icq = rand(MIN_ICQ, MAX_ICQ);

    db[user] = new_icq;
    flow.set('blackufa_icq', db, 'file');

    msg.icq = new_icq;
    msg.delta = new_icq - icq;
}

return msg;
