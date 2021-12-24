const { choose } = flow.get('func', 'memory');

msg.reply = choose(msg.answers.split('\n'));

if (msg.parsed.command.toLowerCase() == 'поползень') {
    msg.reply += ' popCat';
} else {
    msg.reply += ' ' + choose([
        'BUFANerd',
        'SeemsGood',
        'CoolStoryBob',
        'YEPPERS',
        'PepoG'
    ]);
}

return msg;
