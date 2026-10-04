# Release audit — 0.2.1

Checked October 4, 2026 on Windows, using isolated profiles in Chrome
154.0.8037.93 and Firefox 157.0. Four reproducible bugs were fixed. The checked
desktop paths pass after those fixes.

## Bugs fixed

| Problem | Trigger and impact | Fix |
| --- | --- | --- |
| Library entries or favorites disappear | A review tab saves its older copy of the library after another tab has saved a game, favorite, or practice completion. | Read the latest library and serialize modifications across tabs. Merge existing favorite/solved flags when reanalyzing and retain bounded analysis eviction. |
| Refresh loses the review | Successful startup removes the one-shot launch payload; a reload cannot find the game. Switching library games also needs to update the reload payload. | Keep the current PGN and metadata in tab session storage; validate stored analysis independently when reopening. Retain the launch payload if session storage is unavailable. |
| Clocks belong to the wrong move/player | A PGN omits a clock tag or includes other text around one. The previous parser compacted clock tags into a list, shifting later entries. | Associate mainline comments with their actual post-move positions, including black-to-move excerpts. Ignore clocks inside alternative variations. |
| A new practice session advances unexpectedly | The user exits a solved practice item and starts another session before the 1.3-second advance callback fires. | Only advance if the original practice session is still active. |

Cross-tab serialization uses the extension origin's Web Locks API. Both tested
browsers expose this API in their extension pages; its origin-scoped coordination
is documented in [MDN's Web Locks reference](https://developer.mozilla.org/en-US/docs/Web/API/Web_Locks_API).

## Coverage and results

- `npm test`: **250 passed**, zero failures or skips. Coverage includes PGN
  handling, popup launch, missing/stale content scripts, original-tab retries,
  engine fallback and failure recovery, exact scoring, cached-analysis validation,
  settings migration, navigation, move grades, coach output, visual controls,
  clocks, session recovery, and library concurrency/eviction.
- `npm run verify:source`, `npm run verify:history`, and
  `npm run verify:engines`: passed. All four bundled engine files match their
  recorded checksums.
- `node tools/calibration/reproduce-public.mjs`: all 13 reproduction checks passed.
- `npm run build`: separate Chrome, Firefox, and source ZIPs built successfully.
- `npm run test:browsers`: both engines start and complete a 22-ply game in both
  browsers; category glyphs, both rating modes, setting persistence/reanalysis,
  and refresh after launch-payload removal pass. Nine responsive fallback
  viewport sizes pass in each browser, including 320 and 390 CSS pixels.
- `npm run test:layout`: **20 rendered Chrome cases passed**, plus expanded popup
  sizing, narrow-window settings bounds, custom-layout reload/reset, migration
  from legacy settings, and concurrent writes from separate review tabs.
  Screenshots and measurements are saved beside the audited release record.
- Live read-only API checks imported Lichess game `CZmytj0X` and a public
  Chess.com game from `hikaru`'s current archive; lookup of that Chess.com game by
  ID returned the same PGN. Both imported games parsed successfully.
- Actual Firefox ZIP validation: **zero errors, zero notices, one warning**.
  `UNSAFE_VAR_ASSIGNMENT` concerns the existing DOM helper's HTML assignment;
  the bundled/generated-markup restriction is documented in RELEASE.md. It was
  not suppressed. The validator's own update-check permissions message does not
  change the package validation result.

## Window sizes and proportions

The native Chrome window audit covers 1920×1080, 1366×768, 1536×864, 1280×720,
1280×800, 1440×900, 1470×956, 1536×960, 2560×1440, 3440×1440, 3840×2160,
1024×768, 820×768, 768×1024, and a short 1280×480 window. Actual content viewport
measurements account for browser chrome and zoom. Small 390×844 and 320×640 CSS
viewports are emulated separately because desktop Chrome imposes a minimum native
window width. The remaining cases cover custom layout, its reload, and reset.

Every measured board remains square, and none of these cases introduces horizontal
page overflow. Desktop and saved desktop arrangements fit vertically. Narrow and
very short windows use the responsive grid and vertical scrolling. Representative
laptop and narrow-window screenshots were visually inspected. No production CSS
change was needed for the checked aspect ratios.

## New installations and updates

The native browser audit launches the first game with an empty storage area and
checks the current defaults. Its update fixture starts with the old full-SF19
engine preference, retired board/piece preferences, old badge options, an older
layout version, a saved library, and explicit coach/volume choices. It verifies
supported replacements, preservation of the explicit choices and library, and a
successful review with SF19 Lite.

Existing intentional migration behavior remains: layouts from a different layout
version reset to automatic; unsupported engines/assets migrate to bundled choices;
incompatible old analyses are recalculated. Existing tabs must reload to execute
the new extension code.

## Limits

A subsequent navigation-lag check added two rendering optimizations, with no
engine/scoring changes. Its assessment, timing comparison and verification are
recorded in [NAVIGATION_PERFORMANCE.md](NAVIGATION_PERFORMANCE.md).

These checks cover the desktop builds and simulated update state. They do not
exercise a store-delivered update, the oldest allowed browser versions, real
Android devices, every custom panel arrangement, or authenticated live game-over
dialogs. Content-script extraction and button lifecycle use DOM fixtures; live API
imports do not establish that every current platform page/modal selector works.
The 320/390 cases verify responsive CSS, not Android support. Asset/distribution
limitations already recorded in ATTRIBUTIONS.md and RELEASE.md remain separate
from this functional audit.

Repeat with `npm test`, `npm run build`, `npm run test:browsers`, and
`npm run test:layout`. CHROME_PATH and FIREFOX_PATH can override the default
Windows browser paths. All browser checks use disposable extension copies and
profiles, preserving the store ZIPs and the user's installed extension data.
