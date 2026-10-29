# Repository guide

The checkout contains the extension, tools that maintain or verify it,
information needed to explain and distribute it, and a separate research workspace.
Many small asset files are intentional; removing them can break optional settings.

## Extension files

| Files or directory | What they do |
| --- | --- |
| `manifest.json` | Declares the extension, permissions, icons and browser entry points. |
| `popup.html`, `popup.js`, `analyze-flow.js` | Launch reviews and accept game URLs or PGNs. |
| `analysis.html`, `analysis.js`, `styles.css`, `move-grades.js` | Review screen, move classification, settings, board and category badges. |
| `background.js`, `browser-compat.js`, `gamecache.js` | Browser integration, shared API compatibility and local game/review storage. |
| `chesscom.js`, `lichess.js`, `content.js`, `lichess-content.js`, `content-button.css` | Fetch public games and add the review controls to supported sites. |
| `flags.js`, `flags/` | Country mapping and player flag images, selected dynamically. |
| `lib/` | Chess rules, numerical scoring, calibrated search/review logic and the transparent category-label renderer. |
| `engine/` | Two bundled Stockfish builds, the UCI client, checksums and source/license references. Large WASM files are required. |
| `data/book.json`, `data/calibration.json` | Offline opening dictionary and the current numerical model/settings. |
| `data/coaches/`, `data/coaches-anim/rigs/` | Coach phrase banks and animation pages/scripts. The HTML rigs are loaded by the review screen; they are not temporary previews. |
| `backgrounds/`, `pieces-img/`, `sounds/`, `fonts/`, `icons/` | Selectable visual/audio assets and app/category icons. Font license files must accompany the fonts. |

## Maintenance and important information

| Files or directory | Why they matter |
| --- | --- |
| `README.md` | Installation, usage, scoring overview and links to detailed information. |
| `LICENSE`, `ATTRIBUTIONS.md`, `THIRD_PARTY_NOTICES.md` | Project license, third-party notices and asset provenance. |
| `PRIVACY.md`, `SECURITY.md` | Actual data handling and how to report vulnerabilities. |
| `RELEASE.md`, [marketing/STORE_LISTING.md](../marketing/STORE_LISTING.md) | Packaging, store review guidance and prepared listing text. These are operational documents, even though the app does not execute them. |
| [marketing/video/](../marketing/video/README.md) | Finished introduction video and thumbnail in `media/`, linked from the main README, plus captions, script, cached narration and music, and the Remotion rendering project. It is not part of the extension package. |
| `CONTRIBUTING.md`, `.github/` | Contributor guidance, issue/PR forms and dependency update configuration. |
| `package.json`, `package-lock.json` | Commands and reproducible development dependency versions. |
| `scripts/` | Package builds, engine verification and optional browser smoke checks. `node scripts/generate-category-labels.mjs` rebuilds transparent PNG labels and SVG badge references with local Chrome and the bundled fonts. |
| `tests/` | Regression tests for retained code, current artwork and the active scoring method. |
| `tools/calibration/` | Current fitting code, eight frozen public evidence files, offline reproduction, the reusable engine harness and independent-label evaluator. See its [guide](../tools/calibration/README.md). |
| [research/](../research/README.md) | Maintained experiments, dataset provenance, positive/negative findings and promotion decisions for future scoring methods. Separate from active calibration; excluded from extension ZIPs and current release source snapshots. Start with its compact [index](../research/INDEX.md). |
| `.gitignore`, `.gitattributes` | Keep generated files out of Git and preserve required binary/line-ending behavior. Calibration evidence hashes depend on its exact bytes. |
| `docs/` | Repository guide, included in source snapshots. |

## Generated files

Keep short-lived outputs in ignored directories. `npm ci` recreates
`node_modules/`; `npm run build` writes packages and source snapshots to
`web-ext-artifacts/`. Use `scratch/` for temporary reports, one-off diagnostic
scripts, sample exports, and other investigation files; it is ignored by Git and
excluded from release packages. Lasting scoring research belongs in `research/`,
with bulk downloads, engine caches and intermediate outputs in ignored
`research/runs/`. Use `calibration-runs/` for active calibration inputs and logs.
The introduction video renders to `marketing/video/out/`, and its UI captures stay
in `marketing/video/public/captures/`.
Repository metadata lives in `.git/`.

Tracked files should support runtime, maintained tooling, reproduction or
documentation and be linked from the appropriate guide.

### Lichess compatibility

`npm run test:lichess-live` renders a public finished game in an isolated headless
Chrome profile, then runs the extension's content script and import flow against
that DOM. Set `CHROME_PATH` if Chrome is installed outside the platform default.
It checks the legacy redirect, current URL, Black/White perspective, and all 87
legal moves through both the live export and a forced DOM fallback.
It uses a browser API test facade for the analysis-tab handoff; it does
not install the extension or exercise the toolbar UI.

The `Lichess compatibility` GitHub workflow runs this check daily, on relevant pull
requests, or manually. Failures can mean changed URLs/markup, a removed public
game, a network problem, or a site challenge; inspect the run before changing the
integration. The daily check starts once its workflow reaches the default branch.
Offline URL, metadata, button and import regressions remain part of `npm test`.

The content script also reads Lichess's embedded `page-init-data` game ID when a
board exists and neither the current URL nor metadata can identify the game.
This provides a fallback independent of the game-page path. The live check still
flags an unknown canonical URL so it can be supported explicitly.
When export fails, replay pages' embedded full PGN takes priority over reconstructed
move-list text, preserving player names, ratings, result and any setup position.

The [research maintenance review](RESEARCH-MAINTENANCE.md) records the 2026-10-18
cleanup, evidence that must be preserved, and research decisions still open.
The [local folder cleanup](FOLDER-CLEANUP.md) records the October disk audits,
temporary browser-test and redundant source-ZIP removals, and material deliberately
retained.
