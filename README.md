# ♟ Chess Review

Free, open-source game review for your online chess games, powered by Stockfish NNUE running
locally in your browser. One click turns any **Chess.com** or **Lichess** game into a full
review — accuracy scores, move-by-move classifications, an evaluation graph, and an estimated
rating. No account, no server, no manual PGN copying.

**Source:** https://github.com/T-Julsgaard/Chess-Review

**Chrome webshop**: https://chromewebstore.google.com/detail/chess-review/pdbffcjdmcadihmnmenkadndbdbigfam?hl=en

**Firefox Add-ons**: https://addons.mozilla.org/en-US/firefox/addon/chess-review/

## Features

- **One-click review** of any Chess.com or Lichess game — or paste a game URL / raw PGN.
- **Accuracy estimates** for both players, calculated from local Stockfish analysis using the extension's scoring rules. Scores can differ from other review tools.
- **Move classifications** from Brilliant to Blunder, with an evaluation graph and best-move arrows.
- **Estimated rating** — a rough guide to the level each player performed at in the game.
- **Opening detection** from an offline book, named even for PGNs without headers.
- **Rated alternatives** while reviewing a game, using the same classification rules
  as the played moves. Exploring does not change the original game or its accuracy.
- **Stockfish 18 NNUE is the default**, with **Stockfish 19 Lite** as a compact
  alternative. Both are bundled locally and available in Settings.
- **Recoverable analysis errors** with a Retry button; unfinished reviews are not
  saved as completed games.
- **Analysis runs on your machine** — game lookup requests go directly to the chess platforms; no developer backend or analytics.

## Usage

1. Open a finished game on **Chess.com** or **Lichess**.
2. Click the extension icon → **Analyze this game**, or press `Ctrl+Shift+Y`.
3. Stockfish reviews the game in an analysis tab.

You can also paste a game URL or PGN into the popup. If your username cannot be
detected, enter it once; it is remembered locally. Chess Review is intended for
review after play.

Settings let you choose an engine, rating mode, board, pieces, sounds, coach and
category-badge appearance. Badge numbers describe move categories; they are
separate from position evaluation and game accuracy.

## Scoring and reproducibility

The current SF18 numerical calibration is fitted from public **Lichess CC0 games**,
using recorded outcomes and played moves with local Stockfish evidence. It does
not fit against Chess.com review scores or labels. SF19 has its own moves-only
rating model and uses engine WDL quality. Estimated ratings are rough indicators;
cross-platform transfer and short-game extrapolation are unvalidated.

With Node.js 24 or later, reproduce the bundled coefficients and reference scores
offline:

```sh
node tools/calibration/reproduce-public.mjs
```

The [public method](tools/calibration/PUBLIC_METHOD.md) explains the inputs,
search settings, fitting and limitations. This replay verifies the archived
evidence and calculation; it does not rerun engine searches or establish that
each move category is correct.

Move categories use declared rules separately from numerical fitting. The
ordinary loss cutoffs (2/5/10/20 percentage points) match
[Chess.com's published table](https://support.chess.com/en/articles/8572705-how-are-moves-classified-what-is-a-blunder-or-brilliant-etc).
They are policy settings, not fitted coefficients. Applying them to this
extension's own expected-points model does not reproduce Chess.com's full
classifier. [Brilliant rules](tools/calibration/BRILLIANT_MOVES.md) explain
special annotations and their sources.

experiments. The [repository guide](docs/REPOSITORY.md) explains which files
support the extension, development and reproduction.

## Install

Install from the Chrome Web Store or Firefox Add-ons using the links above.
For a local Chrome installation:

1. Download or clone this repository.
2. Open `chrome://extensions` and enable **Developer mode** (top-right).
3. Click **Load unpacked** and select the project folder.


## Privacy

Games are fetched from Chess.com's and Lichess's public APIs and analyzed locally
with bundled WebAssembly builds of Stockfish. Lookup requests include public player
usernames or game IDs. No games or analysis are sent to the developer or analytics services.
Firefox discloses the browsing activity and website content used for these requests.
Sharing a game copies an encoded, unencrypted PGN/metadata link to your clipboard;
anyone you send it to can read that information. See [PRIVACY.md](PRIVACY.md).

## Release packages

Run `npm ci`, `npm test`, `npm run verify:engines`, and `npm run build`.
The build creates separate Chrome and Firefox ZIPs under `web-ext-artifacts/`,
with browser-specific manifests and no development dependencies or tests. Each build
has its own release directory, source snapshot, and SHA-256 package checksums.
See [RELEASE.md](RELEASE.md) for store reviewer notes and validation commands.

## License & attributions

Chess Review's own code is licensed under the **GNU General Public License v3.0** (see
[`LICENSE`](LICENSE)), matching the bundled Stockfish engine. Bundled third-party assets (engine,
pieces, sounds, opening book, libraries) keep their own licenses — see
[`ATTRIBUTIONS.md`](ATTRIBUTIONS.md) and [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md).
Some asset redistribution rights remain unresolved as documented in the attributions;
the project's GPL license does not grant rights to those assets.
Corresponding source for the GPL/AGPL components is available
from the upstream projects listed there.

> **Disclaimer:** Chess Review is an independent, unofficial tool. It is **not affiliated with,
> endorsed by, or sponsored by Chess.com or Lichess**. Those names are used only to describe the
> sites it reads games from (nominative reference); all trademarks belong to their respective owners.
