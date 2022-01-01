# TheDrHaxBot-Twitch

Этот бот заточен под канал [BlackUFA](https://twitch.tv/blackufa) и делает полезные (и не очень) вещи. Бот сделан в [Node-RED](https://nodered.org/), поэтому здесь публикуются лишь обособленные участки кода. С полным кодом пока проблемы, так как его не существует.

## Команды для модераторов

> Примечание: Квадратными скобками отмечены места, куда вы должны подставить свои значения (сами скобки писать не нужно).

* `!анонс`
  * Анонс действует до 6:00 МСК следующего дня;
  * `!анонс set [текст]` - установить новый текст анонса;
  * `!анонс tweet` - загрузить текст анонса из самого свежего твита;
  * `!анонс tweet [ID твита]` - загрузить текст анонса из твита по ID;
    * ID берётся из ссылки на твит. Например, у [этого твита](https://twitter.com/Sempai_Black/status/1473975922126737412) ID - `1473975922126737412`;
  * `!анонс reuse` - восстановить предыдущий анонс (например, для нескольких выходных подряд);
  * `!анонс reset` - удалить текущий анонс (можно восстановить через `reuse`);

* `!игра`
  * `!игра set [название игры]` - установить название игры, если её нет в категориях;
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

<details>
<summary><b>Посмотреть примеры использования</b></summary>

```
# helper

вы: !tdhbot add helper аможет а может тебя? Jebaited
бот: @вы, команда !аможет добавлена SeemsGood
вы: !аможет
бот: @вы, а может тебя? Jebaited

# counter

вы: !tdhbot add counter смерти умерли
бот: @вы, команда !смерти добавлена SeemsGood
вы: !смерти
бот: @вы, пока ещё ни разу не умерли CoolStoryBob
вы: !смерти +
бот: @вы, умерли уже 1 раз CoolStoryBob
вы: !смерти -
бот: @вы, пока ещё ни разу не умерли CoolStoryBob
вы: !смерти = 4221
бот: @вы, умерли уже 4221 раз CoolsStoryBob

# alias

вы: !шар
бот: @вы, что? Jebaited
вы: !tdhbot add alias шар куб
бот: @вы, шаблон "куб" добавлен в команду "шар" SeemsGood
вы: !куб
бот: @вы, что? Jebaited
```
</details>

#### Под-команды `!tdhbot`

> Примечание: Все команды, перечисленные ниже, используются с префиксом `!tdhbot`, например: `!tdhbot list`, `!tdhbot add` и т.д.

* `list` - показывает список всех команд, добавленных через `!tdhbot`. Если команда показана со звёздочкой, то у неё есть алиасы, которые можно посмотреть через `list [имя]`;

* `list [имя]` - показывает список алиасов команды;
  * Если `[имя]` указывает на алиас, то будет выведена информация о базовой команде, на которую он указывает;

* `add [тип] [имя] [значение]` - добавляет новую команду. У разных типов команд используются разные `[значения]`:
  * `add helper [имя] [текст ответа]`
  * `add counter [имя] [что считаем]`
  * `add alias [имя] [regex]` - заставляет команду `[имя]` реагировать на другие команды, подходящие под регулярное выражение `[regex]`

* `update [имя] [значение]` - обновляет значение команды. Как и в случае с `add` значение должно подходить под тип команды;
  * Изменение алиасов таким способом пока не поддерживается!;

* `update [имя] [шаблон] /// [замена]` - заменяет в тексте ответа первое совпадение с `[шаблоном]` на то, что указано в `[замене]`;
  * `///` - обязательная часть!

* `rename [старое имя] [новое имя]` - позволяет переименовывать команды и алиасы;
  * Если первый аргумент указывает на алиас, то во втором аргументе может быть регулярное выражение - совпадающее правило алиаса будет заменено;
  * Переименовать можно только команды, добавленные через `!tdhbot`;

* `remove [имя]` - полностью удалить команду и все её алиасы (если есть);
  * Если `[имя]` указывает на алиас, то будет удалено совпадающее правило из алиаса;
  * Удалить можно только команды, добавленные через `!tdhbot`;

#### Счётчики

Счётчики, создаваемые через `!tdhbot`, сами являются составными командами.

* `+` - увеличить значение на 1;
* `-` - уменьшить значение на 1;
* `= [число]` - установить произвольное значение;
