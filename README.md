# ♟ Chess Review (Chrome extension)

Analyze your online chess games locally with Stockfish (NNUE/WASM) — straight from the browser,
no server and no pasting PGN manually.

## License & source

This project's own code is licensed under the **GNU General Public License v3.0** (see `LICENSE`),
matching the bundled Stockfish engine. Bundled third-party assets (pieces, sounds, engine, opening
book, libraries) retain their own licenses — see [`ATTRIBUTIONS.md`](ATTRIBUTIONS.md).

- **Source code:** `<ADD GITHUB URL HERE BEFORE PUBLISHING>`
- Corresponding source for the GPL/AGPL components is available from the upstream projects listed
  in `ATTRIBUTIONS.md`.

> **Disclaimer:** This is an independent, unofficial tool. It is **not affiliated with,
> endorsed by, or sponsored by Chess.com or Lichess**. "Chess.com" and "Lichess" are used
> only to describe the sites this extension can read games from (nominative reference). All
> trademarks belong to their respective owners. The extension only uses publicly available,
> documented endpoints and runs entirely on your own machine.

## How it works

1. You're on a game on chess.com (`.../game/live/{id}` or `/game/daily/{id}`).
2. Click the add-on icon → **Analyze this game** (or press `Ctrl+Shift+Y`).
3. The extension fetches the game's PGN from Chess.com's public API and opens an
   analysis tab, where Stockfish runs through every position and shows the eval graph
   + the best move per position.

Older games (that you don't have open): use the **"Older game"** field in the popup —
paste a game URL or raw PGN.

## Load in Chrome

1. Open `chrome://extensions`.
2. Turn on **Developer mode** (top right).
3. Click **Load unpacked** → select this folder.
4. Open a game on chess.com and use the popup or the shortcut. Your **username is
   detected automatically** from the bottom player (POV) — or from the profile page if
   you're looking at someone else's game. If it can't be found, type it yourself in the
   popup → **Save** (it's remembered afterwards).

## Files

| File | Role |
|-----|------|
| `manifest.json` | MV3 configuration (popup, shortcut, content script, CSP with `wasm-unsafe-eval`) |
| `chesscom.js` | Fetches games from the public API (`api.chess.com/pub/...`) |
| `analyze-flow.js` | Shared flow: find the game from the active tab → open the analysis |
| `background.js` | Service worker — handles the keyboard shortcut |
| `content.js` | Reads the game ID from the active chess.com tab's URL |
| `popup.html/js` | UI: username, "Analyze this game", paste URL/PGN |
| `analysis.html/js` | Board, move list, eval graph, engine control |
| `engine/uci.js` | Wrapper around the Stockfish worker (UCI) |
| `engine/stockfish.js` + `.wasm` | Stockfish 10 (WASM). `stockfish.asm.js` = fallback without wasm |
| `lib/chess.js` | PGN/FEN parsing (chess.js) |
| `icons/` | SVG badges for move classifications (brilliant … blunder) |
| `data/book.json` | Offline opening book (EPD → ECO/name) for true book detection + naming |
| `data/build-book.mjs` | Rebuilds `book.json` from `lichess-org/chess-openings` (`node data/build-book.mjs`) |

## Status (MVP — Phase 1)

- ✅ Fetch the game from the active tab via the public API
- ✅ Local Stockfish analysis (eval per position + best move)
- ✅ Board, move navigation, eval graph, light blunder marking
- ✅ Paste URL/PGN for older games
- ✅ Analysis mode: explore variations on the board (move with click/drag or click an engine line), live best move
- ✅ Engine settings (Engine tab): lines, depth, build, strength (Skill), hash — changes re-analyze the game
- ✅ True opening book (offline, `data/book.json`): book moves are marked from real theory, and the opening is named — also for pasted PGN without headers
- ⏳ Later: save analyses (IndexedDB), Lichess Opening Explorer panel (popularity/statistics), cross-game statistics

## Note

- The engine is **Stockfish 10 (single-threaded WASM)** — good for fast analysis.
  Later a newer/multi-threaded build could give more depth (requires cross-origin isolation).
- A game that just finished can take a few seconds before it's in your public archive.
  If that happens, you'll get a message — try again, or paste the PGN.
