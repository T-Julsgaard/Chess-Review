# Chess Review — Agent Guide

## Project Overview
Browser extension (MV3) for Chess.com/Lichess game review with local Stockfish NNUE analysis.
Main entrypoints: `popup.html` → `analysis.html` (review UI), `content.js` / `lichess-content.js` (page integration), `background.js` (service worker).

## Commands
```bash
npm ci                    # install deps
npm test                  # run all Node tests (jsdom + vm)
npm run verify:engines    # verify bundled Stockfish WASM checksums
npm run lint              # web-ext lint
npm run build             # package Chrome + Firefox ZIPs to web-ext-artifacts/
npm run start:chrome      # run extension in Chromium (dev)
npm run start:firefox     # run extension in Firefox (dev)
```

## Test Notes
- Tests in `tests/*.test.mjs` use Node's native test runner + JSDOM
- Helper `tests/helpers/app.mjs` loads `analysis.js` in a vm context, stubs browser APIs and Engine
- Run single test: `node --test tests/classification.test.mjs`

## Architecture
- **Single-file app logic**: `analysis.js` (5700+ lines) — state machine, classification, UI rendering, engine coordination
- **Worker pool**: `engine/uci.js` wraps Stockfish WASM; `createEngine()` in analysis.js manages parallel workers
- **No build step for source** — extension loads raw JS/CSS; `npm run build` only packages for stores

## Key Files
| File | Purpose |
|------|---------|
| `analysis.js` | Core logic: PGN parse, Stockfish pool, move classification, accuracy, UI |
| `styles.css` | All styling (CSS variables for themes, move quality colors) |
| `manifest.json` | MV3 manifest (host perms: chess.com, lichess.org) |
| `engine/*.js/.wasm` | Bundled Stockfish 18 NNUE (default), 19 Full, 19 Lite |
| `data/book.json` | Opening book (EPD format) |
| `lib/chess.js` | Chess.js fork for move gen/validation |

## Critical Patterns
- **State object `S`** in analysis.js holds all mutable state — search for `const S = {`
- **Classification thresholds** in `CALIB` object (winK, clsWp) — tests inject overrides
- **Engine builds**: `ENGINE_BUILDS = { nnue, sf19full, sf19lite }` — fallback order in `ENGINE_FALLBACK_ORDER`
- **CSS variables** for move quality: `--q-brilliant` through `--q-blunder` (Chess.com palette)

## Engine Verification
`npm run verify:engines` checks SHA-256 of files in `engine/` against `engine/checksums.json`.
Full SF19 (99MB WASM) is `stockfish-19-single.wasm`; Lite is `stockfish-19-lite-single.wasm` (1.8MB).

## Gotchas
- Extension CSP requires `'wasm-unsafe-eval'` for Stockfish WASM
- Tests mock `Engine` class — real engine only runs in browser
- `analysis.js` has no exports; tests execute it in vm context and access `S` global
- No TypeScript, no bundler — plain ES modules
- Piece sets: only `cburnett` and `merida` are packaged (GPLv2+)