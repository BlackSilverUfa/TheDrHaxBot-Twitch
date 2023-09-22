const { find, flatMap } = _;
const { renderTemplate, choose, ftime, last } = flow.get('func', 'memory');
const { getBaseSegment, resolveSegment } = flow.get('blackufa_db_func', 'memory');

const db = flow.get('blackufa_db', 'memory')();
const stream = flow.get('twitch_channels.blackufa', 'file');

const MAX_RESULTS = 8;

let query = msg.parsed.query_filtered;

function segmentLink(segment, at = 0) {
    let id = segment.segment;

    if (id.indexOf(',') !== -1) {
        [id, at] = getBaseSegment(segment, at);
    }

    return `drhx.ru/b/${id}${(at > 0) ? `?at=${at}` : ''}`;
}

function segmentName(segment, at) {
    if (!at) {
        return segment.name;
    }

    /*
     * Find subref closest to the provided timestamp
     */

    const refs = segment.games
        .map((gameId) => db.games.by('id', gameId))
        .map((game) => (
            find(game.streams, (ref) => ref.original === segment)
        ));

    const names = flatMap(refs, (ref) => (
        ref.subrefs.map((subref) => (
            ref.game.type == 'list' ? {
                name: subref.name, start: subref.start || 0
            } : {
                name: `${ref.game.name} - ${subref.name}`,
                start: subref.start || 0
            }
        ))
    )).sort((n1, n2) => n1.start - n2.start);

    const lastSubref = last(names.filter(({ start }) => start < at));

    return (lastSubref || names[0]).name;
}

function gameLink(game) {
    let link;

    if (game.segments.length == 1) { // segment
        const segment = game.segments[0];
        link = segmentLink(segment, game.start);
    } else { // game
        link = `drhx.ru/b/${game.original.id}`;
    }

    return link;
}

function formatSegment(segment, at = 0, t = 0) {
    let result = segmentName(segment, at);

    if (t > 0) {
        result += ` [${ftime(t)}] `;
    } else {
        result += ` [${Sugar.Date.format(segment.date, '%d.%m.%Y')}] `;
    }

    result += segmentLink(segment, at);

    return result;
}

function formatSegments(segments) {
    return segments.map(formatSegment).join(' | ');
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
            const segment = game.segments[0];
            result += ` [${Sugar.Date.format(segment.date, '%d.%m.%Y')}]`;
        }

        result += ' ' + gameLink(game);
        return result;
    }).join(' | ');
}

function findByID(query) {
    const [id, ts] = query.split(/\s/);

    if (!id.match(/^[0-9,\.]+$/)) return false;

    let at = Number(ts) || 0;

    if (at > 0) {
        let segment, t;
        [segment, at, t] = resolveSegment(db.segments, id, at);

        if (!segment) return false;
        msg.reply = formatSegment(segment, at, t);
        return true;
    }

    let segments = [];

    if (id.match(/^[0-9]+$/)) { // simple stream
        segments = db.segments.chain()
            .find({ streams: { $contains: id } })
            .where(({ games }) => games.length > 0)
            .data();
    } else if (id.match(/^[0-9]+\.[0-9]+$/)) { // specific segment
        segments = [db.segments.findOne({ segment: id })];
    } else if (id.match(/^[0-9]+(,[0-9]+)+$/)) { // joined streams
        segments = db.segments.chain()
            .find({ streams: { $containsAny: id.split(',') } })
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
    const games = db.index
        .chain()
        .find({ 'category.search': { $ne: false } })
        .search(query)
        .data();

    if (games.length == 0) {
        return false;
    }

    if (games.length > MAX_RESULTS) {
        msg.reply = renderTemplate(
            'найден{count#а,о,о} {count} игр{count#а,ы,}. Список можно ' +
            'увидеть тут: bsu.drhx.ru/?mode=games&q={query}',
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
        msg.reply += ' стрим ещё не появился в архиве';

        if (stream.vod) {
            msg.reply += '. Пока что VOD можно посмотреть здесь:';
            msg.reply += ` twitch.tv/videos/${stream.vod}`;
        }

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
