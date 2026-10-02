# Repository guide

The checkout contains three useful kinds of files: the extension itself, tools
that maintain or verify it, and information needed to explain and distribute it.
Many small asset files are intentional; removing them can break optional settings.

## Extension files — keep

| Files or directory | What they do |
| --- | --- |
| `manifest.json` | Declares the extension, permissions, icons and browser entry points. |
| `popup.html`, `popup.js`, `analyze-flow.js` | Launch reviews and accept game URLs or PGNs. |
| `analysis.html`, `analysis.js`, `styles.css`, `move-grades.js` | Review screen, move classification, settings, board and category badges. |
| `background.js`, `browser-compat.js`, `gamecache.js` | Browser integration, shared API compatibility and local game/review storage. |
| `chesscom.js`, `lichess.js`, `content.js`, `lichess-content.js`, `content-button.css` | Fetch public games and add the review controls to supported sites. |
| `flags.js`, `flags/` | Country mapping and player flag images, selected dynamically. The historical `flag_map.csv` mentioned in comments is not in this checkout; the shipped tables are the available mapping. |
| `lib/` | Chess rules, numerical scoring and calibrated search/review logic. |
| `engine/` | Two bundled Stockfish builds, the UCI client, checksums and source/license references. Large WASM files are required. |
| `data/book.json`, `data/calibration.json` | Offline opening dictionary and the current numerical model/settings. |
| `data/coaches/`, `data/coaches-anim/rigs/` | Coach phrase banks and animation pages/scripts. The HTML rigs are loaded by the review screen; they are not temporary previews. |
| `backgrounds/`, `pieces-img/`, `sounds/`, `fonts/`, `icons/` | Selectable visual/audio assets and app/category icons. Font license files must accompany the fonts. |

## Maintenance and important information — keep

| Files or directory | Why they matter |
| --- | --- |
| `README.md` | Installation, usage, scoring overview and links to detailed information. |
| `LICENSE`, `ATTRIBUTIONS.md`, `THIRD_PARTY_NOTICES.md` | Project license, third-party notices and provenance, including unresolved or historical issues. Removal would discard important distribution information. |
| `PRIVACY.md`, `SECURITY.md` | Actual data handling and how to report vulnerabilities. |
| `RELEASE.md`, `STORE_LISTING.md` | Packaging, store review guidance and prepared listing/privacy text. These are operational documents, even though the app does not execute them. |
| `CONTRIBUTING.md`, `.github/` | Contributor guidance, issue/PR forms and dependency update configuration. |
| `package.json`, `package-lock.json` | Commands and reproducible development dependency versions. |
| `scripts/` | Package builds, engine verification and optional browser smoke checks. |
| `tests/` | Regression tests for retained code and the active scoring method. `fixtures/badge-circles.json` preserves only the historical circle geometry needed by the icon test. |
| `tools/calibration/` | Current fitting code, eight frozen public evidence files, offline reproduction, the reusable engine harness and independent-label evaluator. See its [guide](../tools/calibration/README.md). |
| `.gitignore`, `.gitattributes` | Keep generated files out of Git and preserve required binary/line-ending behavior. Calibration evidence hashes depend on its exact bytes. |
| `docs/` | This map and a compact badge design history, included in source snapshots. |

## Generated files

Keep generated outputs in ignored directories. Refer to current contributor
and packaging instructions before keeping new tracked files.
