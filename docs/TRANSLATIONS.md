# Interface languages

Chess Review is in **English** by default. Settings can also be shown in 15 other
languages:

| Language | id | Flag |
| --- | --- | --- |
| English (default) | `en` | GB |
| Português (Brasil) | `pt-BR` | BR |
| Español | `es` | ES |
| Русский | `ru` | RU |
| Türkçe | `tr` | TR |
| Bahasa Indonesia | `id` | ID |
| Français | `fr` | FR |
| Italiano | `it` | IT |
| Tiếng Việt | `vi` | VN |
| Deutsch | `de` | DE |
| Polski | `pl` | PL |
| Українська | `uk` | UA |
| العربية | `ar` | SA |
| हिन्दी | `hi` | IN |
| 简体中文 | `zh-Hans` | CN |
| Dansk | `da` | DK |

## What is translated

- **Settings**: every category, tooltip, colour popover and readout, plus Settings → Language.
- **Everything else** (popup, review panels, coach commentary, Learn/puzzles, player
  profile, toasts outside Settings, the in-page review buttons) is English for now.

Some text inside Settings stays English on purpose:

- **Move grades** (Brilliant, Great, Best, Excellent, Good, Book, Inaccuracy, Mistake,
  Miss, Blunder). They appear across the untranslated review panels.
  `tests/i18n.test.mjs` fails if one is added to a catalog.
- **Names**: coach characters, piece sets, font families, Lichess and the Stockfish builds.
- **Numbers with units** (px, ms, MB, %).

Arabic text is shown in the normal left-to-right Settings layout; the panel is not mirrored.

## How the language is chosen

- **English is always the default.** The browser's language is never used to guess
  one, and there is no first-use prompt.
- **Settings opens on Visual** each time the workspace loads, with Language as the
  next category right beneath it. If they pick another category, Settings
  stays on it until the workspace is closed and opened again.
- Choosing a language applies at once, without reloading the workspace, and saves it
  in extension local storage under the `language` key. That key is separate from
  `settings`, so release resets and the "Reset all … settings" buttons keep it, and it
  survives updates. Other open review tabs follow through `storage.onChanged`.

## Why a translation can never break English

- English is built in (`lib/i18n/messages/en.js`) and never loads a catalog.
- Every other catalog is a separate file, imported only when someone chooses that
  language (`loadLanguage`). A catalog that is missing, has a syntax error or has the
  wrong shape makes `loadLanguage` resolve `false`: the interface stays English, the
  choice is not saved, and startup carries on.
- Entries that are not non-empty strings are dropped, and any error while translating
  shows the English text. Anything missing from a catalog shows in English.

## Files

| File | Purpose |
| --- | --- |
| `lib/i18n/languages.js` | Supported languages: id, native name and flag (`flags/<code>.svg`). |
| `lib/i18n/messages/en.js` | English source for strings with **stable identifiers** (`language.settings.title`, `language.name.<id>`, …). |
| `lib/i18n/messages/<id>.js` | A catalog: `messages` (stable ids), `text` (settings text keyed by its English source) and `context`. |
| `lib/i18n/index.js` | `loadLanguage(id)` and `createTranslator(id)` with `t`, `text`, `format` and `localize`. |
| `tests/i18n.test.mjs` | Defaults, fallback, broken catalogs, settings switching, and a completeness check of every catalog. |

New interface text should use a stable identifier in `messages`. The existing
settings panel is written with English literals in `analysis.js`, so it is
translated after rendering by its English text (`text`), like a gettext msgid.
`{0}`, `{1}` mark placeholders; their values are translated again, so
`"{0} sound": "Son : {0}"` also covers "Move sound" and "Capture sound".
When the same English has two meanings, add it under `context` and put
`data-i18n-context="<name>"` on an ancestor element (badge symbols use it for
"Check", the check mark, as opposed to the chess check). Elements with
`translate="no"` are never translated.

## Adding a language or a string

1. A new language: add an entry to `LANGUAGES` in `lib/i18n/languages.js` (a BCP 47 id;
   give the script when the language has more than one, e.g. `zh-Hant`), pick a flag
   that exists in `flags/`, add `language.name.<id>` to `en.js` and every catalog, and
   create `lib/i18n/messages/<id>.js` by copying `zh-Hans.js` and translating the values.
2. A new settings string: add it to `zh-Hans.js` and to every other catalog. The tests
   require every catalog to have exactly the same entries as `zh-Hans.js`, with the
   same placeholders.
3. Run `node --test tests/i18n.test.mjs`. The completeness test lists every settings
   string that is still English in Simplified Chinese.
