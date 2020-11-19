function get(context, key, store_name) {
    return new Promise((resolve, reject) => {
        context.get(key, store_name, (err, value) => {
            if (err) {
                reject(err);
            } else {
                resolve(value);
            }
        });
    });
}

function set(context, key, value, store_name) {
    return new Promise((resolve, reject) => {
        context.set(key, value, store_name, (err) => {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        });
    });
}

// -----------------------------------------

const MIN_ICQ = 0;
const MAX_ICQ = 150;

function rand(min, max) {
    return min + Math.floor(Math.random() * (max - min + 1));
}

async function main() {
    let db = await get(flow, 'blackufa_icq', 'file') || {};
    let user = msg.payload.userstate.username;

    if (Object.keys(db).indexOf(user) === -1) {
        let icq = rand(MIN_ICQ, MAX_ICQ);

        db[user] = icq;
        await set(flow, 'blackufa_icq', db, 'file');

        msg.icq = icq;
        msg.delta = 0;
        return msg;
    } else {
        let icq = db[user];
        
        if (msg.payload.message[4] == '?') { // !icq?
            msg.icq = icq;
            msg.delta = 0;
            return msg;
        }

        let new_icq = rand(MIN_ICQ, MAX_ICQ);

        db[user] = new_icq;
        await set(flow, 'blackufa_icq', db, 'file');

        msg.icq = new_icq;
        msg.delta = new_icq - icq;
        return msg;
    }
}

return main();
