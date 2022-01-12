from pymorphy2 import MorphAnalyzer
morph = MorphAnalyzer(lang='ru')

CASES = ['nomn', 'gent', 'datv', 'accs', 'ablt', 'loct']

def select(words, tags):
    matches = list(filter(lambda w: tags in w.tag, words))
    if len(matches) > 0:
        return matches[0]
    else:
        return None

words = morph.parse(payload)

word = select(words, {'NOUN', 'accs'})

if not word:
    word = select(words, {'NOUN', 'gent'})

if not word:
    word = select(words, {'NOUN', 'nomn'})

if not word:
    return None

def inflect(word, tags):
    new_word = word.inflect(tags)
    return new_word.word if new_word else word.word

forms = dict()

for case in CASES:
    forms[case] = inflect(word, {case, 'sing'})
    forms[f'{case}_plur'] = inflect(word, {case, 'plur'})

return forms

