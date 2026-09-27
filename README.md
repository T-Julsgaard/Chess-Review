# ♟ Chess Review

Free, open-source game review for your online chess games, powered by Stockfish NNUE running
locally in your browser. One click turns any **Chess.com** or **Lichess** game into a full
review — accuracy scores, move-by-move classifications, an evaluation graph, and an estimated
rating. No account, no server, no manual PGN copying.

**Source:** https://github.com/T-Julsgaard/Chess-Review

**Chrome webshop**: https://chromewebstore.google.com/detail/chess-review/pdbffcjdmcadihmnmenkadndbdbigfam?hl=en

## Features

- **One-click review** of any Chess.com or Lichess game — or paste a game URL / raw PGN.
- **Accuracy scores** for both players from local engine analysis.
- **Move classifications** from Brilliant to Blunder, with an evaluation graph and best-move arrows.
- **Estimated rating** — a rough guide to the level each player performed at in the game.
- **Opening detection** from an offline book, named even for PGNs without headers.
- **Explore board** from the popup, without loading a game: try legal moves, browse
  your move list, and see evaluations, opening names, and move ratings.
- **Rated alternatives** while reviewing a game, using the same classification rules
  as the played moves. Exploring does not change the original game or its accuracy.
- **Stockfish 19 NNUE** bundled locally, with Stockfish 18 NNUE and Stockfish 10
  alternatives. New installs default to 19; existing engine preferences are retained.
- **Recoverable analysis errors** with a Retry button; unfinished reviews are not
  saved as completed games.
- **Runs entirely on your machine** — your games never leave your computer.

## Usage

1. Open a game on **Chess.com** or **Lichess**.
2. Click the extension icon → **Analyze this game**, or press `Ctrl+Shift+Y`.
3. The game opens in an analysis tab where Stockfish reviews every position.

For older games you don't have open, paste a game URL or PGN into the popup. Your username is
detected automatically from the board; if it can't be found, enter it once in the popup and it's
remembered.

To explore without a game, open the popup and select **Explore board**. Click or
drag pieces to make legal moves. Use the move list, arrow keys, or Home/End to
navigate. Making a different move replaces the continuation from that position.

The opening dictionary is bundled offline and has no automatic downloads.
Stockfish 19 adds approximately 95 MiB and is heavier than the Stockfish 18 lite
build. Select a lighter engine in Settings if needed. The existing accuracy
calibration was fitted to Stockfish 18 lite; the accuracy agreement advertised
above has not been re-benchmarked for Stockfish 19.

## Install

 `Packed`

Goto: https://chromewebstore.google.com/detail/chess-review/pdbffcjdmcadihmnmenkadndbdbigfam?hl=en

 `Unpacked`
1. Download or clone this repository.
2. Open `chrome://extensions` and enable **Developer mode** (top-right).
3. Click **Load unpacked** and select the project folder.


## Privacy

Games are fetched only from Chess.com's and Lichess's public, documented APIs and analyzed locally
with a bundled WebAssembly build of Stockfish. Nothing is sent to any third-party server.

## License & attributions

Chess Review's own code is licensed under the **GNU General Public License v3.0** (see
[`LICENSE`](LICENSE)), matching the bundled Stockfish engine. Bundled third-party assets (engine,
pieces, sounds, opening book, libraries) keep their own licenses — see
[`ATTRIBUTIONS.md`](ATTRIBUTIONS.md). Corresponding source for the GPL/AGPL components is available
from the upstream projects listed there.

> **Disclaimer:** Chess Review is an independent, unofficial tool. It is **not affiliated with,
> endorsed by, or sponsored by Chess.com or Lichess**. Those names are used only to describe the
> sites it reads games from (nominative reference); all trademarks belong to their respective owners.
