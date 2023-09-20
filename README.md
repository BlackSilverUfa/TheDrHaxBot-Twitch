# TheDrHaxBot-Twitch

Этот бот заточен под канал [BlackUFA](https://twitch.tv/blackufa) и делает полезные (и не очень) вещи. Бот сделан в [Node-RED](https://nodered.org/), поэтому здесь публикуются лишь обособленные участки кода. С полным кодом пока проблемы, так как его не существует.

## Команды для модераторов

> Примечание: Квадратными скобками отмечены места, куда вы должны подставить свои значения (сами скобки писать не нужно).

* `!анонс`
  * Анонс действует до 6:00 МСК следующего дня;
  * `!анонс update [текст]` - установить новый текст анонса;
  * `!анонс update [шаблон] /// [замена]` - заменить совпадающие части в текущем анонсе;
  * `!анонс vk [ID поста]` - загрузить текст анонса со стены группы ВК;
    * ID берётся из ссылки на пост. Например, у [этого поста](https://vk.com/b_silver?w=wall-28387068_3540519) ID - `3540519`;
  * `!анонс reuse` - восстановить предыдущий анонс (например, для нескольких выходных подряд);
  * `!анонс reset` - удалить текущий анонс (можно восстановить через `reuse`);

* `!игра`
  * `!игра (set|split|replace) [название игры]` - установить название игры, если её нет в категориях;
    * `split` добавляет новый пункт в `!чобыло`;
    * `replace` заменяет последний пункт в `!чобыло`;
    * `set` заменяет, если предыдущая игра шла меньше 5 минут, в противном случае добавляет новый пункт;
    * Изменение категории стрима автоматически вызывает команду `!игра set ...`;
  * `!игра delete` - удаляет последний пункт в `!чобыло`;
  * `!игра reset` - отменить изменение и вернуть игру из категории;
  * `!игра edit [id] (get|name|time)` - редактирует указанный пункт;
    * `[id]` - порядковый номер игры в `!чобыло` (нумерация начинается с `1`!);
    * `get` - выводит основную информацию об игре (имя, время начала);
    * `name <имя>` - устанавливает новое название выбранной игре;
    * `time <время>` - устанавливает новое время начала выбранной игре;
      * время указывается в формате `HH:MM:SS`, `MM:SS` или просто как количество секунд с начала стрима;
      * игра не может начинаться раньше предыдущей (или начала стрима) или позже следующей (или текущего момента);

### !tdhbot - создание новых команд

Команда `!tdhbot` позволяет создавать команды прямо из чата. Поддерживаются несколько видов команд:

* `helper` - простая команда со статичным ответом (как `!help` или `!правила`);
* `counter` - счётчик, который можно увеличивать или уменьшать на единицу;
* `countup` - счётчик, который показывает время, прошедшее с последнего сброса;
* `alias` - альтернативное имя для другой команды (`!ананас` вместо `!анонс`);
* `function` - команда, которая вызывает другую команду от имени бота;
* `native` - команда, вызывающая произвольный код. Может быть добавлена только @TheDrHax;

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
вы: !смерти + 21
бот: @вы, умерли уже 22 раза CoolStoryBob
вы: !смерти -
бот: @вы, умерли уже 21 раз CoolStoryBob
вы: !смерти = 4221
бот: @вы, умерли уже 4221 раз CoolsStoryBob

# countup

вы: !tdhbot add countup test с момента добавления команды
бот: @вы, команда !смерти добавлена SeemsGood
вы: !test
бот: @вы, 0.2 минут с момента добавления команды
вы: !test reset
бот: @вы, 0.0 минут с момента добавления команды (было 0.7 минут)
вы: !test set 15 минут
бот: @вы, 15.0 минут с момента добавления команды (было 0.2 минут)

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

* `show [имя]` - показывает краткое описание команды;

* `list` - показывает список всех команд, добавленных через `!tdhbot`.
  * Если команда показана c +, то у неё есть алиасы, которые можно посмотреть через `list [имя]`;
  * Если рядом с командой есть знак ⏻, то она выключена (через `!tdhbot disable`);

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
  * `add countup [имя] [текст ответа]`
  * `add alias [имя] [regex]` - заставляет команду `[имя]` реагировать на другие команды, подходящие под регулярное выражение `[regex]`
  * `add function [имя] [команда]` - создаёт команду, которая вызывает другую команду;
    * Бот может вызывать только свои команды. Внешние не поддерживаются, и в чат он ничего так не напишет;
    * В тексте команды можно использовать шаблон `{query}`, чтобы подставить текст, написанный пользователем, в оригинальную команду;
  * `add native [имя]` - добавляет уникальную команду, к которой может быть подключён любой код;
    * Этот тип команд доступен только для тех, кто может менять код бота напрямую (сейчас это TheDrHax);

* `update [имя] [значение]` - обновляет значение команды. Как и в случае с `add` значение должно подходить под тип команды;
  * Изменение алиасов таким способом пока не поддерживается!;

* `update [имя] [шаблон] /// [замена]` - заменяет в тексте ответа первое совпадение с `[шаблоном]` на то, что указано в `[замене]`;
  * `///` - обязательная часть!

* `rename [старое имя] [новое имя]` - позволяет переименовывать команды и алиасы;
  * Если первый аргумент указывает на алиас, то во втором аргументе может быть регулярное выражение - совпадающее правило алиаса будет заменено;
  * Переименовать можно только команды, добавленные через `!tdhbot`;

* `disable [имя]` - отключить команду;
* `enable [имя]` - включить команду;

* `cooldown [имя] [канал] [польз.]` - установить временнЫе ограничения на использование команды;
  * Параметры:
    * `[канал]` - количество секунд между вызовами команды во всём канале;
    * `[польз.]` - количество секунд между вызовами команды одним пользователем;
  * Значения по умолчанию: 10 / 0
  * Допускается подстановка `-` для сохранения параметров неизменными:
    * `cooldown [имя] - - 10` - поле `[внутр.]` получит значение 10, а остальные не изменятся;

* `plugin [имя] [параметры]` - настройка разных плагинов;
  * `emote-chains [длина] [количество]` - продолжает цепочки смайликов в чате;
    * `[длина]` - минимальная длина цепочки перед продолжением (0 - отключено, 1 - повторять всё, 2 - дописывать 3-й смайл);
    * `[количество]` - максимальное количество смайлов в сообщении (по умолчанию: 3);
  * `chroot [канал]` - эмулирует нахождение на другом канале;
    * **Важно**: Только для Twitch, и только для администратора бота;

* `remove [имя]` - полностью удалить команду и все её алиасы (если есть);
  * Если `[имя]` указывает на алиас, то будет удалено совпадающее правило из алиаса;
    * **Важно**: это означает, что при удалении `абрикос` будет удалено правило `а.*с` из команды `анонс`, т.е. удалится не только сам `абрикос`, но и все остальные вариации;
  * Удалить можно только команды, добавленные через `!tdhbot`;

#### Counter

Доступные под-команды:

* `+` - увеличить значение на 1;
* `-` - уменьшить значение на 1;
* `+ [число]` - увеличить значение на `[число]`;
* `- [число]` - уменьшить значение на `[число]`;
* `= [число]` - установить произвольное значение;
* `public` - разрешить всем использовать команды `+` и `-`;
* `protected` (по умолчанию) - разрешить всем проверять значение, а менять - только модераторам;
* `private` - запретить проверять всем, кроме модераторов;
* `cooldown [число]` - разрешить изменять значение не чаще, чем раз в `[число]` секунд;
* `auto` - упрощённый режим, в котором проверка значения всегда прибавляет 1 (если есть доступ к проверке). Вызовите эту команду повторно, чтобы отключить этот режим;

#### CountUp

Данный вид счётчиков показывает время, прошедшее с определённой даты.
Величина (минуты/часы/дни и т.д.) зависит от прошедшего времени или от того, как сформирован текст ответа.
Например, если вы зададите текст `минут с такого-то события`, то счётчик всегда будет показывать значение в минутах.

Доступные под-команды:

* `help` - покажет список доступных команд;
* `set <дата>` - позволяет установить произвольную дату, от которой будет идти отсчёт;
  * Примеры дат:
    * Абсолютные: `25 октября`, `25 октября 20:00`, `1 апреля 2019` и т.д.
    * Относительные: `15 минут`, `7 дней`, `2 месяца` и т.д.
* `set_count <число>` - позволяет установить произвольное количество сбросов;
* `reset` - сбросить дату на текущую;

Доступные шаблоны:
* `{delta}` - позволяет разместить значение счётчика в любом месте ответа;
* `{count}` - показывает количество сбросов счётчика;

