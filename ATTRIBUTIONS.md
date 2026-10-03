# Attributions & Licenses

This extension is an independent, unofficial tool. It is **not affiliated with,
endorsed by, or sponsored by Chess.com or Lichess**. Third-party components
retain their respective licenses. The records below identify known
sources and licensing terms; entries marked unresolved are not claims of
redistribution permission.

## Community contributions
- **[aciokie](https://github.com/aciokie)** — Contributor
- **[neuroflowinfinix](https://github.com/neuroflowinfinix)** — Contributor
- **[Kristian Julsgaard](https://github.com/Julsgaard)** — Contributor
- **[Arthur Guedes](https://github.com/arthurhguedes)** — Contributor
- **[T-Julsgaard](https://github.com/T-Julsgaard)** — Maintainer

## Chess pieces (bundled SVG sets)
Distributed by Lichess (lila); high-quality vector SVGs.
- **Cburnett** (`pieces-img/cburnett/*.svg`) — Author: Colin M.L. Burnett. License: **GPLv2+**.
- **Merida** (`pieces-img/merida/*.svg`) — Author: Armando Hernandez Marroquin. License: **GPLv2+**.
- **Source:** https://github.com/lichess-org/lila/tree/master/public/piece
- **Licensing reference:** https://github.com/lichess-org/lila/blob/master/COPYING.md
- Note: GPLv2+ permits redistribution (incl. commercial) provided the licence/source terms
  are met. Noncommercial piece sets are excluded from the current build allowlist.

## Board colors
- Boards use selectable flat-color palettes or custom colors. Honeywood is the default.

## Country flags
- **Files:** `flags/*.svg` (used as player avatars when a country is detected)
- **Pack:** **Flag Pack (1.0)** by **Kenney** (www.kenney.nl) — https://www.kenney.nl/assets/flag-pack
- **License:** **CC0 1.0** (public domain) — https://creativecommons.org/publicdomain/zero/1.0/
- Free for personal, educational, and commercial use. Attribution is **not required**; we credit
  **Kenney / www.kenney.nl** here voluntarily, as the pack's license suggests.
- The Chess.com country id → flag mapping in `flags.js` was compiled by hand (`flag_map.csv`) and
  is original to this project.

## Move / board sounds
- **Files:** `sounds/move-self.mp3`, `sounds/capture.mp3`, `sounds/Check.mp3`,
  `sounds/Castling.mp3`
- **Source:** Lichess sound set (lila) —
  https://github.com/lichess-org/lila/blob/master/LICENSE
- **License:** commercial sound license purchased by the maintainer.
- **Underlying sample credit:** the samples embed the tag
  "Copyright 2000, Sounddogs.com" (commercial royalty-free library, as redistributed
  by Lichess). Retained here for transparency.

## "Wrong answer" practice sound
- **File:** `sounds/Wrong/Incorrect.mp3`
- **Source:** [Pixabay](https://pixabay.com/sound-effects/) — used under the
  **Pixabay Content License** (https://pixabay.com/service/license-summary/):
  free for commercial and non-commercial use, no attribution required; the
  credits below are given voluntarily. (Bundling inside an app is permitted;
  redistributing the bare audio files on another stock/download platform is not.)
- **Creator:** "Training Program Incorrect2" by **timgormly**
  ([Freesound profile](https://freesound.org/people/timgormly/)) — originally a
  CC0 Freesound upload, mirrored to Pixabay via the `freesound_community` account.
  Source: https://pixabay.com/sound-effects/film-special-effects-training-program-incorrect2-88735/

## Chess engine
- **Files:** `engine/stockfish*.js`, `engine/stockfish*.wasm`
- **Project:** Stockfish.js by Nathan Rugg (nmrugg), a JS/WASM port of Stockfish —
  https://github.com/nmrugg/stockfish.js
- **Default:** Stockfish.js 18.0.0 Lite single-threaded NNUE, copyright 2026 Chess.com, LLC.
  Official files `stockfish-18-lite-single.js` and `.wasm` are renamed locally to
  `engine/stockfish-nnue.js` and `.wasm` without content changes.
  - Release: https://github.com/nmrugg/stockfish.js/releases/tag/v18.0.0
  - Source/build instructions: https://github.com/nmrugg/stockfish.js/tree/v18.0.0
- **Alternative:** Stockfish.js 19.0.0 Lite single-threaded NNUE, copyright 2026 Chess.com, LLC.
  Official files `engine/stockfish-19-lite-single.js` and `.wasm`, unchanged.
  - Release: https://github.com/nmrugg/stockfish.js/releases/tag/v19.0.0
  - Source/build instructions: https://github.com/nmrugg/stockfish.js/tree/v19.0.0
- **NNUE networks:** Stockfish team and contributors; 18 lite by Linmiao Xu (linrock),
  19 lite by sscg13. See https://tests.stockfishchess.org/nns
- **License:** GPLv3, included in [LICENSE](LICENSE).
  https://github.com/nmrugg/stockfish.js/blob/v19.0.0/Copying.txt
- **Upstream:** Stockfish by T. Romstad, M. Costalba, J. Kiiski, G. Linscott and contributors:
  https://github.com/official-stockfish/Stockfish
- File checksums, exact asset links, and engine choices: [engine/README.md](engine/README.md)
  and [engine/checksums.json](engine/checksums.json).

## Opening book
- **File:** `data/book.json` (bundled offline; updated only with extension releases)
- **Source:** `lichess-org/chess-openings`
- **License:** CC0 (public domain) — https://github.com/lichess-org/chess-openings

## Chess logic library
- **File:** `lib/chess.js`
- **Author:** Jeff Hlywa — **License:** BSD 2-Clause
- **Upstream version:** chess.js **1.0.0**, `dist/esm/chess.js` from the official npm package.
- **Original distribution:** https://registry.npmjs.org/chess.js/-/chess.js-1.0.0.tgz
- **Readable source:** https://github.com/jhlywa/chess.js/blob/v1.0.0/src/chess.ts
- **Release/build instructions:** https://github.com/jhlywa/chess.js/tree/v1.0.0
- **Verification:** The initial bundled file matches the official 1.0.0 distribution
  after normalizing line endings; the current file differs only by the local changes below.
- **Local maintenance:** Replace every PGN comment brace and remove a no-op newline
  masking helper while preserving regular-expression separators. The original license notice is retained.

## Adapted move classifier
- **File:** `analysis.js` (move classification, including attacker/defender and
  sacrifice logic; locally adapted evaluation handling and classification rules).
- **Project:** Brilliant-Chess by **Delo** (`wdeloo`).
- **Copyright:** Copyright (c) 2025 Delo <https://github.com/wdeloo>
- **License:** MIT. The complete copyright and permission notice is included in
  [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) and shipped with the extension.
- **Source:** https://github.com/wdeloo/Brilliant-Chess
- **License reference:** https://github.com/wdeloo/Brilliant-Chess/blob/56e8c48696d3df874f4f1e0f26cb47bedff3231c/LICENSE
- This reference identifies the verified license text; it does not claim that the
  original adaptation was made from that exact upstream commit.

## Move-category badges
- **Author:** T-Julsgaard, project maintainer.
- **Files:** `icons/brilliant.svg`, `icons/great.svg`, `icons/book.svg`,
  `icons/best.svg`, `icons/excellent.svg`, `icons/good.svg`, `icons/inaccuracy.svg`,
  `icons/mistake.svg`, `icons/miss.svg`, and `icons/blunder.svg`.
- **Source:** maintainer-created badge artwork. The maintainer confirmed authorship
  on 2026-09-30; this records that declaration, not independent verification of
  every creation input. The redesigned symbols retain the previous circle colours.
- **License:** GNU GPL v3.0, under the project's [LICENSE](LICENSE).
  numeric design and earlier iterations. Superseded drawings are retired;
  their circle geometry is retained as a small regression-test fixture.

## App logo / icon
- **Files:** `icons/icon16.png`, `icons/icon48.png`, `icons/icon128.png`, `icons/icon.png`
- Project logo composition incorporating Colin M.L. Burnett's ("Cburnett") white
  knight design. Copyright in the underlying knight remains with its author.
- **Underlying artwork / licensing reference:** "Chess nlt45.svg" by Colin M.L.
  Burnett: https://commons.wikimedia.org/wiki/File:Chess_nlt45.svg
- **Selected license for the logo adaptation:** **CC BY-SA 3.0 Unported** —
  https://creativecommons.org/licenses/by-sa/3.0/
- **Changes:** the knight is incorporated into the project icon composition and
  distributed as raster PNGs at the sizes above. The logo adaptation is available
  under the same CC BY-SA 3.0 license. No endorsement by the original artist is implied.
- The Commons artwork offers multiple licenses; this records the CC BY-SA basis
  separately from the GPLv2+ licensing of the bundled board-piece set.
- **Creation record:** on 2026-09-30 the maintainer recalled using AI with the
  Cburnett piece to create the logo. This records that recollection; the exact AI
  tool, prompt, and original input file have not been established. AI processing
  does not remove the underlying artist's attribution or share-alike conditions.
- The stated Cburnett basis has a documented adaptation licence. Original creation
  files can be retained if recovered; this is not an independent verification of
  those inputs.

## Original project sounds, backgrounds, and coach artwork
- **Author:** T-Julsgaard, project maintainer.
- **Source:** original project work. Authorship was confirmed by the maintainer on
  2026-09-30; this entry records that declaration, not an independent forensic
  verification of the original creation files.
- **License:** GNU GPL v3.0, under the project's [LICENSE](LICENSE).
- **Files:**
- `sounds/fx/chess_sound_01.wav` through `sounds/fx/chess_sound_09.wav`.
- `backgrounds/bg-slate.webp` and `backgrounds/bg-ember.webp`.
- Animated coach artwork and rigs in `data/coaches-anim/rigs/*.html` and `*.js`.

These original assets are separate from the four Lichess move / board MP3 recordings
listed above. Retain original recordings/design files as supporting provenance.
## Badge number fonts

The extension bundles unmodified fonts from the Google Fonts repository under
the SIL Open Font License 1.1. They permit use and redistribution, including
commercial use. Fonts load locally; selecting one sends no network request.
Each font's copyright notice and full license accompany it in `fonts/`:

- [Inter](https://github.com/google/fonts/tree/main/ofl/inter) — `fonts/inter-OFL.txt`
- [Manrope](https://github.com/google/fonts/tree/main/ofl/manrope) — `fonts/manrope-OFL.txt`
- [Sora](https://github.com/google/fonts/tree/main/ofl/sora) — `fonts/sora-OFL.txt`
- [Space Grotesk](https://github.com/google/fonts/tree/main/ofl/spacegrotesk) — `fonts/spacegrotesk-OFL.txt`
- [Rajdhani](https://github.com/google/fonts/tree/main/ofl/rajdhani) — `fonts/rajdhani-OFL.txt`
- [Space Mono](https://github.com/google/fonts/tree/main/ofl/spacemono) — `fonts/spacemono-OFL.txt`
