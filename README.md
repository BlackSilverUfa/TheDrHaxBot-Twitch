# TheDrHaxBot-Twitch

Этот бот заточен под канал [BlackUFA](https://twitch.tv/blackufa) и делает полезные (и не очень) вещи. Бот сделан в [Node-RED](https://nodered.org/), поэтому здесь публикуются лишь обособленные участки кода. С полным кодом пока проблемы, так как его не существует.

## Команды для модераторов

> Примечание: Квадратными скобками отмечены места, куда вы должны подставить свои значения (сами скобки писать не нужно).

* `!анонс`
  * Анонс действует до 6:00 МСК следующего дня;
  * `!анонс update [текст]` - установить новый текст анонса;
  * `!анонс update [шаблон] /// [замена]` - заменить совпадающие части в текущем анонсе;
  * `!анонс tweet` - загрузить текст анонса из самого свежего твита;
  * `!анонс tweet [ID твита]` - загрузить текст анонса из твита по ID;
    * ID берётся из ссылки на твит. Например, у [этого твита](https://twitter.com/Sempai_Black/status/1473975922126737412) ID - `1473975922126737412`;
  * `!анонс vk [ID поста]` - загрузить текст анонса со стены группы ВК;
    * ID берётся из ссылки на пост. Например, у [этого поста](https://vk.com/b_silver?w=wall-28387068_3540519) ID - `3540519`;
  * `!анонс reuse` - восстановить предыдущий анонс (например, для нескольких выходных подряд);
  * `!анонс reset` - удалить текущий анонс (можно восстановить через `reuse`);

* `!игра`
  * `!игра set [название игры]` - установить название игры, если её нет в категориях;
  * `!игра rerun [ID стрима]` - привязать текущий повтор к оригинальному стриму (нужно найти стрим в архиве и взять его числовой ID);
  * `!игра reset` - отменить изменение и вернуть игру из категории;

* `!tlou2` - счетчик дней от последней шутки про TLOU2
  * `!tlou2 reset` - сбросить значение на текущий момент
  * `!tlou2 set [дата]` - установить другое значение
    * примеры: `2 часа назад`, `2 дня назад`, `22 декабря 18:00` и т.д.


### !tdhbot - создание новых команд

Команда `!tdhbot` позволяет создавать команды прямо из чата. Поддерживаются несколько видов команд:

* `helper` - простая команда со статичным ответом (как `!help` или `!правила`);
* `counter` - счётчик, который можно увеличивать или уменьшать на единицу;
* `alias` - альтернативное имя для другой команды (`!ананас` вместо `!анонс`);
* `function` - команда, которая вызывает другую команду от имени бота;

<details>
<summary><b>Посмотреть примеры использования</b></summary>

```
# helper

вы: !tdhbot add helper аможет а может тебя? Jebaited
бот: @вы, команда !аможет добавлена SeemsGood
вы: !аможет
бот: @вы, а может тебя? Jebaited

# counter

вы: !tdhbot add counter смерти умерли уже {n} {n#раз,раза,раз}
бот: @вы, команда !смерти добавлена SeemsGood
вы: !смерти
бот: @вы, умерли уже 0 раз CoolStoryBob
вы: !смерти +
бот: @вы, умерли уже 1 раз CoolStoryBob
вы: !смерти +
бот: @вы, умерли уже 2 раза CoolStoryBob
вы: !смерти -
бот: @вы, умерли уже 1 раз CoolStoryBob
вы: !смерти = 4221
бот: @вы, умерли уже 4221 раз CoolsStoryBob

# alias

вы: !шар
бот: @вы, что? Jebaited
вы: !tdhbot add alias шар куб
бот: @вы, шаблон "куб" добавлен в команду "шар" SeemsGood
вы: !куб
бот: @вы, что? Jebaited

# function

вы: !шар, а будет стрим?
бот: @вы, вероятность КРАЙНЕ мала NOPERS
вы: !tdhbot add function абудет !шар, а будет {query}
бот: @вы, команда !абудет добавлена SeemsGood
вы: !абудет стрим?
бот: @вы, хорошие шансы SeemsGood
```
</details>

#### Под-команды `!tdhbot`

> Примечание: Все команды, перечисленные ниже, используются с префиксом `!tdhbot`, например: `!tdhbot list`, `!tdhbot add` и т.д.

* `list` - показывает список всех команд, добавленных через `!tdhbot`. Если команда показана со звёздочкой, то у неё есть алиасы, которые можно посмотреть через `list [имя]`;

* `list [имя]` - показывает список алиасов команды;
  * Если `[имя]` указывает на алиас, то будет выведена информация о базовой команде, на которую он указывает;

* `add [тип] [имя] [значение]` - добавляет новую команду. У разных типов команд используются разные `[значения]`:
  * `add helper [имя] [текст ответа]`
  * `add counter [имя] [шаблон]`
    * Шаблоном может быть любой текст;
    * Чтобы добавить в текст значение счётчика, используйте `{n}` (обязательно);
    * Чтобы добавить в текст слово, согласованное с числом, используйте `{n#1,2,5}`, где:
      * 1 - форма слова, согласованная с 1 (например: 1 раз, 1 манул)
      * 2 - форма слова, согласованная с 2 (например: 2 раза, 2 манула)
      * 5 - форма слова, согласованная с 5 (например, 5 раз, 5 манулов)
      * Полный пример: `{n#раз,раза,раз}` или `{n#манул,манула,манулов}`
  * `add alias [имя] [regex]` - заставляет команду `[имя]` реагировать на другие команды, подходящие под регулярное выражение `[regex]`
  * `function [имя] [команда]` - создаёт команду, которая вызывает другую команду;
    * Бот может вызывать только свои команды. Внешние не поддерживаются, и в чат он ничего так не напишет;
    * В тексте команды можно использовать шаблон `{query}`, чтобы подставить текст, написанный пользователем, в оригинальную команду;

* `update [имя] [значение]` - обновляет значение команды. Как и в случае с `add` значение должно подходить под тип команды;
  * Изменение алиасов таким способом пока не поддерживается!;

* `update [имя] [шаблон] /// [замена]` - заменяет в тексте ответа первое совпадение с `[шаблоном]` на то, что указано в `[замене]`;
  * `///` - обязательная часть!

* `rename [старое имя] [новое имя]` - позволяет переименовывать команды и алиасы;
  * Если первый аргумент указывает на алиас, то во втором аргументе может быть регулярное выражение - совпадающее правило алиаса будет заменено;
  * Переименовать можно только команды, добавленные через `!tdhbot`;

* `remove [имя]` - полностью удалить команду и все её алиасы (если есть);
  * Если `[имя]` указывает на алиас, то будет удалено совпадающее правило из алиаса;
    * **Важно**: это означает, что при удалении `абрикос` будет удалено правило `а.*с` из команды `анонс`, т.е. удалится не только сам `абрикос`, но и все остальные вариации;
  * Удалить можно только команды, добавленные через `!tdhbot`;

#### Счётчики

Счётчики, создаваемые через `!tdhbot`, сами являются составными командами.

* `+` - увеличить значение на 1;
* `-` - уменьшить значение на 1;
* `= [число]` - установить произвольное значение;
* `public` - разрешить всем использовать команды `+` и `-`;
* `protected` (по умолчанию) - разрешить всем проверять значение, а менять - только модераторам;
* `private` - запретить проверять всем, кроме модераторов;
* `cooldown [число]` - разрешить изменять значение не чаще, чем раз в `[число]` секунд;
* `auto` - упрощённый режим, в котором проверка значения всегда прибавляет 1 (если есть доступ к проверке). Вызовите эту команду повторно, чтобы отключить этот режим;
