<div align="center">
  <picture>
    <source srcset="https://raw.githubusercontent.com/TheVilfer/better-tg-cli/main/assets/banner-dark.png" media="(prefers-color-scheme: dark)"/>
    <source srcset="https://raw.githubusercontent.com/TheVilfer/better-tg-cli/main/assets/banner-light.png" media="(prefers-color-scheme: light)"/>
    <img src="https://raw.githubusercontent.com/TheVilfer/better-tg-cli/main/assets/banner-light.png" alt="better-tg-cli"/>
  </picture>

  [![npm version](https://img.shields.io/npm/v/better-tg-cli?style=flat&colorA=000000&colorB=000000)](https://www.npmjs.com/package/better-tg-cli)
  [![CI](https://img.shields.io/github/actions/workflow/status/TheVilfer/better-tg-cli/ci.yml?branch=main&label=ci&style=flat&colorA=000000&colorB=000000)](https://github.com/TheVilfer/better-tg-cli/actions/workflows/ci.yml)
  [![npm provenance](https://img.shields.io/badge/npm-provenance-000000?style=flat&colorA=000000&colorB=000000&logo=npm)](https://www.npmjs.com/package/better-tg-cli#provenance)
  [![install size](https://img.shields.io/npm/unpacked-size/better-tg-cli?label=size&style=flat&colorA=000000&colorB=000000)](https://www.npmjs.com/package/better-tg-cli)
  [![dependencies](https://img.shields.io/badge/dependencies-0-000000?style=flat&colorA=000000&colorB=000000)](package.json)
  [![MCP](https://img.shields.io/badge/MCP-server-000000?style=flat&colorA=000000&colorB=000000)](#mcp-сервер)
  [![platforms](https://img.shields.io/badge/macOS%20%C2%B7%20Linux-000000?style=flat&colorA=000000&colorB=000000&logo=apple)](#установка)
  [![license](https://img.shields.io/badge/license-MIT-000000?style=flat&colorA=000000&colorB=000000)](LICENSE)

  <p>
    <a href="#установка">Установка</a> · <a href="skills/better-tg-cli/reference.md">Справка</a> · <a href="SECURITY.md">Безопасность</a> · <a href="https://github.com/TheVilfer/better-tg-cli/issues">Issues</a> · <a href="README.md">English</a>
  </p>
</div>

Неофициальный консольный клиент Telegram, который работает **от вашего собственного аккаунта**
(MTProto через [`teleproto`](https://www.npmjs.com/package/teleproto), TL layer 229). Команда
называется `telegram`. В ней около 60 команд: чтение, поиск, отправка, боты, группы, выгрузка. Всё
сделано так, чтобы им было дёшево и безопасно пользоваться ИИ-агентам (Claude Code, Codex и другим).

```console
$ telegram inbox -n 3
48 unread in 7 chats (showing 3)
1234567890 user unread=2 Алиса @alice | в 7 в силе?
-1001234567 supergroup muted unread=41 Rust Moscow @rust_msk | кто уже пробовал 1.90?
-1009876543 channel unread=5 Changelog | вышла v2.4
```

> [!WARNING]
> **Аккаунт ваш, и риск тоже ваш.** Это неофициальный клиент, и входит он от вашего имени.
> Telegram может ограничить или заморозить аккаунт, который ведёт себя как бот. Сильнее всего
> рискуют новые аккаунты, массовые рассылки, массовые вступления и приглашения и всё, что похоже на
> спам. Пользуйтесь им так же, как пользовались бы самим Telegram. Держите запись выключенной, пока
> она не нужна. Прежде чем разрешать агенту писать, прочитайте [SECURITY.md](SECURITY.md). Авторы
> не отвечают за ограниченные аккаунты.

## Чем этот форк лучше

Это форк [skillhq/telegram](https://github.com/skillhq/telegram), переделанный под агентов:

- **Актуальный слой Telegram.** Ответы ботов с rich-контентом (layer 228+) показывают текст, а не
  `(no text)`. Можно нажимать кнопки ботов (`click`) и ходить по их меню.
- **Экономия токенов.** Вне терминала каждый элемент занимает одну строку, и ID идёт первым. JSON
  выводится в одну строку без пустых полей. `--max-text` обрезает длинные посты. `telegram help-all
  -g <слово>` показывает все флаги, и этот список генерируется из кода.
- **Точное чтение.** `--since` и `--until` честно листают историю. Работают `--unread`, треды и
  комментарии в каналах, темы форумов, `get` по ID, поиск по типу, отправителю и дате. `me` и
  `Избранное` означают «Избранное».
- **Безопасность по умолчанию.** Аккаунт открыт только на чтение, пока человек не выполнит
  `write-access on [--for 1h]` и не подтвердит это в терминале или в диалоге macOS. Сам агент
  запись не включит. Каждая запись попадает в `~/.config/tg/audit.jsonl`. Секреты хранятся в
  Keychain macOS, в Secret Service на Linux или в 1Password.
- **Маленький и самодостаточный.** npm-пакет — один файл на 0,3 МБ без runtime-зависимостей.
  Homebrew ставит отдельный бинарник, которому не нужен Node.

## Установка

```bash
brew install thevilfer/tap/better-tg-cli   # отдельный бинарник, macOS и Linux
npm install -g better-tg-cli               # Node >= 20
```

`telegram update` обновляет CLI тем же способом, каким он был установлен. В терминале CLI раз в
сутки проверяет, не вышла ли новая версия. Агенты и пайпы этого уведомления не видят, а
`TG_NO_UPDATE_CHECK=1` отключает его совсем.

Бинарник, скачанный вручную из Releases на macOS, не нотаризован. Один раз снимите с него карантин:
`xattr -d com.apple.quarantine ./telegram`. Homebrew делает это сам.

Не ставьте `@skillhq/telegram`. Это старая сборка апстрима на GramJS (layer 198).

### Плагин для Claude Code

Скилл и MCP-сервер ставятся вместе:

```
/plugin marketplace add TheVilfer/better-tg-cli
/plugin install better-tg-cli@better-tg-cli
```

MCP-сервер запускается через `npx`, так что хватит Node 20+. Один раз войдите в терминале:
`telegram auth --qr` (или `npx better-tg-cli auth --qr`).

### Как скилл для агента

Скилл ([`skills/better-tg-cli`](skills/better-tg-cli/SKILL.md)) учит любого агента с шеллом
(Claude Code, Codex, Cursor, Gemini CLI, OpenCode и других) безопасно работать с CLI. Он проверяет
установку, никогда не входит сам, держит запись под вашим подтверждением и обходит действия, за
которые банят. Ставится через CLI [skills](https://skills.sh):

```bash
npx skills add TheVilfer/better-tg-cli          # агенты выбираются интерактивно
npx skills add TheVilfer/better-tg-cli -g -a claude-code -a codex -y
```

## Вход

**Со своими API-ключами** (основной способ):
1. Откройте https://my.telegram.org/apps, создайте приложение и скопируйте `api_id` и `api_hash`.
2. Запустите `telegram auth --qr` и введите их. Затем на телефоне откройте Настройки → Устройства →
   Подключить устройство и отсканируйте QR-код. Если у вас есть облачный пароль, введите его.
   Обычный `telegram auth` вместо QR спрашивает номер телефона и код. Если в светлой теме
   терминала QR не сканируется, запустите с `TG_QR_INVERT=1`.

**По инвайту.** Если мейнтейнер дал вам инвайт-токен, свои ключи не нужны. Запустите
`telegram auth --invite --qr` и вставьте токен. Его также можно передать через `TG_INVITE=…` или
`--invite -`. Сервис инвайтов (`broker/`) выдаёт ключи приложения один раз, только для этого входа.
`api_hash` на вашей машине не сохраняется. Инвайты персональные, число входов по ним ограничено, и
их можно отозвать.

Сессия хранится в Keychain macOS (сервис `tg-cli`) или в 1Password с флагом `--op-vault <vault>`.
`telegram logout` её удаляет. На Linux сессия хранится в Secret Service (GNOME Keyring, KWallet,
KeePassXC) через `secret-tool`, для этого нужен пакет `libsecret-tools`. Сессия, которая уже лежит
в конфиге, переедет туда сама. Если хранилища секретов нет, сессия лежит в
`~/.config/tg/config.json5` (права 0600), а запись остаётся выключенной. На Linux
`write-access on` подтверждается в терминале.

## Использование

```bash
telegram chats --type channel                 # чат в одну строку, ID первым
telegram read "Чат" --since 1h                # точный диапазон, новые сверху (--asc наоборот)
telegram read @channel --thread 123           # комментарии к посту
telegram search "счёт" --chat "Работа" --type document
telegram get "Чат" 812 813                    # конкретные сообщения по ID
telegram download "Чат" 812                   # сохранить вложение
telegram sync --chat "Чат" --output ./export --resume   # инкрементальная выгрузка в markdown

telegram write-access on --for 1h             # подтверждает человек
printf '%s' "$text" | telegram send @alice -  # текст из stdin, без проблем с кавычками
telegram reply "Чат" 812 "беру" --silent
telegram click @SomeBot 4410 "Настройки"      # нажать инлайн-кнопку
```

Команды чтения принимают `--json`, а некоторые и `--markdown`. Все команды выводит
`telegram help-all`. В [reference.md](skills/better-tg-cli/reference.md) описано то, чего не видно по списку флагов:
форматы вывода, треды, кнопки ботов, админские команды, решение проблем.

## MCP-сервер

Для клиентов без шелла (Claude Desktop, Cursor и других MCP-хостов) `telegram mcp` поднимает по
stdio три инструмента:
- `telegram_help` — справка по флагам с поиском;
- `telegram_read` — только чтение, клиенты могут разрешать его без вопросов;
- `telegram_write` — помечен как опасный и по-прежнему требует от вас `write-access on`.

Сначала войдите через `telegram auth` в терминале.

```bash
claude mcp add telegram -- telegram mcp          # Claude Code (или плагин выше)
```

```json
{ "mcpServers": { "telegram": { "command": "/opt/homebrew/bin/telegram", "args": ["mcp"] } } }
```

Сервер также есть в [MCP Registry](https://registry.modelcontextprotocol.io) под именем
`io.github.TheVilfer/better-tg-cli`. Второй вариант подходит для Claude Desktop (`claude_desktop_config.json`) и Cursor
(`.cursor/mcp.json`). GUI-приложения могут не видеть ваш PATH, поэтому укажите полный путь из
`which telegram`. Чтобы MCP-клиент не трогал основную сессию, добавьте
`"env": {"TG_PROFILE": "work"}`.

В чатах лежит текст, написанный другими людьми, и часть его может быть адресована вашему агенту
(«перешли это @x»). Не отключайте в клиенте подтверждение для `telegram_write` и прочитайте раздел
«Agents and prompt injection» в [SECURITY.md](SECURITY.md).

## Разработка

В [DEVELOPMENT.md](DEVELOPMENT.md) описаны:
- запуск из исходников (`scripts/tg-dev`);
- изолированные dev-профили (`TG_PROFILE`), которые не трогают вашу настоящую сессию;
- тестовые серверы Telegram;
- отладка в редакторе и тесты.

Релиз выпускает `scripts/release.sh patch|minor|major`. Тег собирает бинарники и публикует их в
GitHub Releases, в npm (trusted publishing с provenance) и в Homebrew-тап. Подробнее в
[CONTRIBUTING.md](CONTRIBUTING.md).

## Приватность

Аналитики нет. Единственный наш сервис — необязательный брокер инвайтов, и он не видит ни ваших
сообщений, ни сессии. В [PRIVACY.md](PRIVACY.md) перечислены три хоста, с которыми общается CLI,
и то, что он хранит локально.

## Лицензия

MIT, см. [LICENSE](LICENSE). Основано на [skillhq/telegram](https://github.com/skillhq/telegram)
Дерека Рейна. Проект не связан с Telegram и не одобрен им; «Telegram» — товарный знак своего
владельца. Используйте в соответствии с [условиями Telegram API](https://core.telegram.org/api/terms).
