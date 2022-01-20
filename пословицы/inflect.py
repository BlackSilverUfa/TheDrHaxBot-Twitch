from pymorphy2 import MorphAnalyzer
morph = MorphAnalyzer(lang='ru')


CASES = ['nomn', 'gent', 'datv', 'accs', 'ablt', 'loct']


def parse(word, hints=[]):
    parsed = morph.parse(word)

    for hint in hints:
        candidates = [w for w in parsed if hint in w.tag]

        if len(candidates) > 0:
            return candidates[0]

    return parsed[0]


def inflect(word, tags, fallback=None):
    new_word = word.inflect(tags)

    if new_word:
        return new_word.word
    elif fallback:
        return fallback
    else:
        return word.word


forms = dict()
hints = [set(payload.get('hints') or {'accs'})]
words = [parse(word, hints) for word in payload.get('text').split(' ')]


for case in CASES:
    forms[case] = ' '.join([inflect(word, {case, 'sing'}) for word in words])
    forms[f'{case}_plur'] = ' '.join([inflect(word, {case, 'plur'}) for word in words])

return forms

