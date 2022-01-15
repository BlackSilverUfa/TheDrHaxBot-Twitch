const { renderTemplate, choose, fts, last } = flow.get('func', 'memory');

const db = flow.get('blackufa_db', 'memory');
const stream = flow.get('stream_status', 'file');

const MAX_RESULTS = 3;

let query = msg.parsed.query_filtered;

function segmentLink(segment) {
    let id = segment.segment;

    if (id.indexOf(',') !== -1) {
        const candidates = id.split(',').filter(sid => {
            const anotherSegment = db.segments.findOne({ segment: sid });
            return !anotherSegment || anotherSegment.games.length == 0;
        });

        if (candidates.length > 0) {
            id = candidates[0];
        }
    }

    return `bsu.us.to/${id}`;
}

function gameLink(game) {
    let link;

    if (game.segments.length == 1) { // segment
        const segment = db.segments.findOne({ segment: game.segment });

        link = segmentLink(segment);

        if (game.start > 0) {
            link += `?at=${game.start}`;
        }
    } else { // game
        link = `bsu.us.to/${game.id}`;
    }

    return link;
}

function formatSegments(segments) {
    return segments.map(segment => {
        let result = segment.name;
        result += ` [${segment.date.getFullYear()}] `;
        result += segmentLink(segment);
        return result;
    }).join(' | ');
}

function formatGames(games) {
    return games.map(game => {
        let result = game.name;

        if (game.segments.length > 1) {
            result += renderTemplate(
                ' [{count} стрим{count#,а,ов}]',
                { count: game.segments.length }
            );
        } else {
            const segment = db.segments.findOne({ segment: game.segments[0].segment });
            result += ` [${segment.date.getFullYear()}]`;
        }

        result += ' ' + gameLink(game);
        return result;
    }).join(' | ');
}

function findByID(query) {
    if (!query.match(/^[0-9.,]+$/)) return false;

    let segments = [];

    if (query.match(/^[0-9]+$/)) { // simple stream
        segments = db.segments.chain()
            .find({ streams: { $contains: query } })
            .where(({ games }) => games.length > 0)
            .data();
    } else if (query.match(/^[0-9]+\.[0-9]+$/)) { // specific segment
        segments = [db.segments.findOne({ segment: query })];
    } else if (query.match(/^[0-9]+(,[0-9]+)+$/)) { // joined streams
        segments = db.segments.chain()
            .find({ streams: { $containsAny: query.split(',') } })
            .where(({ games }) => games.length > 0)
            .data();
    }

    if (segments.length == 0) return false;

    msg.reply = formatSegments(segments);
    return msg;
}

function findByDate(query) {
    let date = Sugar.Date.create(query, { past: true });

    if (date == 'Invalid Date' || date.getFullYear() < 2005 || date > +new Date()) {
        return false;
    }

    date = Sugar.Date.beginningOfDay(date);

    const segments = db.segments.chain()
        .find({ date: { $dteq: date } })
        .where(({ games }) => games.length > 0)
        .data();

    if (segments.length == 0) {
        msg.reply = 'в тот день не было стримов KEKWait';
        return true; // date is recognized, we should stop now
    }

    msg.reply = formatSegments(segments);
    return true;
}

function findByName(query) {
    const games = fts(
        query,
        db.index.find({ 'category.search': { $ne: false } }),
        (game) => game.name
    );

    if (games.length == 0) {
        return false;
    }

    if (games.length > MAX_RESULTS) {
        msg.reply = renderTemplate(
            'найден{count#а,о,о} {count} игр{count#а,ы,}. Список можно ' +
            'увидеть тут: bsu.us.to/?mode=games&q={query}',
            {
                count: games.length,
                query: encodeURIComponent(query)
            }
        );

        return true;
    }

    msg.reply = formatGames(games);
    return true;
}

if (query.length == 0) {
    if (!db.segments.findOne({ segment: stream.vod })) {
        msg.reply = stream.active ? 'этот' : 'предыдущий';
        msg.reply += ' стрим ещё не появился в архиве.';
        msg.reply += ' Пока что VOD можно посмотреть здесь:';
        msg.reply += ` twitch.tv/videos/${stream.vod}`;
        return msg;
    } else {
        query = stream.vod;
    }
} else if (query.startsWith('дай')) {
    const randomGame = choose(db.index.find({ 'category.search': { $ne: false } }));
    msg.reply = formatGames([randomGame]);
    return msg;
}

if (findByID(query)) return msg;
if (findByDate(query)) return msg;
if (findByName(query)) return msg;

msg.reply = 'ничего не найдено KEKWait';
return msg;
