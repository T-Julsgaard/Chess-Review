# Interface languages

Chess Review supports **English** and **简体中文 (Simplified Chinese)**.

## What is translated

| Area | English | 简体中文 |
| --- | --- | --- |
| First-use language picker | ✓ | ✓ |
| Settings → Language | ✓ | ✓ |
| Settings (every category, tooltip, colour popover and readout) | ✓ | ✓ |
| Everything else: popup, review panels, coach commentary, Learn/puzzles, player profile, toasts outside Settings, the in-page review buttons | ✓ | English for now |

Some text inside Settings stays English on purpose:

- **Move grades** (Brilliant, Great, Best, Excellent, Good, Book, Inaccuracy, Mistake,
  Miss, Blunder). They appear across the untranslated review panels and keep the
  wording from PR #39. `tests/i18n.test.mjs` fails if one is added to a catalog.
- **Names**: coach characters (they are named the same way in the English coach
  panel), piece sets, font families, Lichess and the Stockfish builds.
- **Numbers with units** (px, ms, MB, %).

## How the language is chosen

- The workspace (`analysis.html`) asks on first use. The toolbar popup, the in-page
  review button and the keyboard shortcut all open the workspace, so the picker
  appears whichever way someone arrives. The game they were opening loads
  underneath and stays as it is.
- The suggestion comes from the browser's ordered languages (`navigator.languages`).
  Tags are matched by language **and script**: `zh`, `zh-CN`, `zh-SG` and `zh-Hans-*`
  are Simplified; `zh-TW`, `zh-HK`, `zh-MO` and `zh-Hant-*` are Traditional and are not
  offered Simplified. If nothing matches, English is suggested.
- Only **Continue** saves. Escape or **Decide later** closes the picker and it is
  offered again on the next visit. Screen-size previews never ask.
- The choice is stored in extension local storage under the `language` key
  (`"en"` or `"zh-Hans"`). That key is separate from `settings`, so release
  resets and the "Reset all … settings" buttons keep it, and it survives updates.
- Settings → Language (listed first) changes it immediately without reloading the
  workspace. Other open review tabs follow through `storage.onChanged`.

## Files

| File | Purpose |
| --- | --- |
| `lib/i18n/languages.js` | Supported languages: id, native name, flag (`flags/<code>.svg`) and the matching rules. |
| `lib/i18n/messages/en.js` | English source for strings with **stable identifiers** (`language.picker.title`, …). |
| `lib/i18n/messages/<id>.js` | A catalog: `messages` (stable ids), `text` (settings text keyed by its English source) and `context`. |
| `lib/i18n/index.js` | `createTranslator(id)` with `t`, `text`, `format` and `localize`; registers the catalogs. |
| `lib/i18n/language-picker.js` | The first-use dialog. |
| `tests/i18n.test.mjs` | Matching, fallback, picker, settings switching and a completeness check of every settings string. |

New interface text should use a stable identifier in `messages`. The existing
settings panel is written with English literals in `analysis.js`, so it is
translated after rendering by its English text (`text`), like a gettext msgid.
`{0}`, `{1}` mark placeholders; their values are translated again, so
`"{0} sound": "{0}音效"` also covers "Move sound" and "Capture sound".
When the same English has two meanings, add it under `context` and put
`data-i18n-context="<name>"` on an ancestor element (badge symbols use it for
"Check", the check mark, as opposed to the chess check). Elements with
`translate="no"` are never translated.

Anything missing from a catalog shows in English.

## Adding a language

1. Add an entry to `LANGUAGES` in `lib/i18n/languages.js`. Use a BCP 47 id and give
   `script` when the language is written in more than one (`zh-Hant` would be
   `{id: "zh-Hant", language: "zh", script: "Hant", nativeName: "繁體中文", flag: "TW"}`).
   Pick a flag that already exists in `flags/`. The native name is the identifier.
2. Copy `lib/i18n/messages/zh-Hans.js` to `lib/i18n/messages/<id>.js`, translate the
   values and import it in the `CATALOGS` map in `lib/i18n/index.js`.
3. Add `language.name.<id>` to every catalog.
4. Run `node --test tests/i18n.test.mjs`. The completeness test lists every settings
   string that is still English; extend it to the new language.
