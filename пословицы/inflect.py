from pymorphy2 import MorphAnalyzer
morph = MorphAnalyzer(lang='ru')


CASES = ['nomn', 'gent', 'datv', 'accs', 'ablt', 'loct']


def parse(word, hints=[]):
    parsed = morph.parse(word)
    hints = set(hints)
    candidates = [w for w in parsed if hints in w.tag]
    return candidates[0] if len(candidates) > 0 else parsed[0]


def inflect(word, tags, fallback=None, title=False):
    new_word = word.inflect(tags)
    result = word.word

    if new_word:
        result = new_word.word
    elif fallback:
        result = fallback

    return result.title() if title else result


forms = dict()
hints = payload.get('hints') or []
words = [(parse(word, hints), word.istitle())
         for word in payload.get('text').split(' ')]

for case in CASES:
    forms[case] = ' '.join([
        inflect(word, {case, 'sing'}, title=title)
        for word, title in words
    ])

    forms[f'{case}_plur'] = ' '.join([
        inflect(word, {case, 'plur'}, title=title)
        for word, title in words
    ])

return forms
