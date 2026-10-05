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
| `RELEASE.md`, [marketing/STORE_LISTING2.md](../marketing/STORE_LISTING2.md) | Packaging, store review guidance and prepared listing/privacy text. These are operational documents, even though the app does not execute them. |
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
