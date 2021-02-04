let categories = msg.categories;

let games = [].concat(...Object.keys(categories).map((key) => {
    let category = categories[key];
    
    if (category.search === false) {
        return [];
    }
    
    return [].concat(...category.games.map((game) => {
        game = {...game};
        game.group = category.name;

        let names = game.name.split(' / ');

        if (names.length > 1) {
            return names.map((name) => {
                let subref = {...game};
                subref.name = name;
                return subref;
            });
        } else {
            return game;
        }
    }));
}));

msg.payload = games;

return msg;
