# Attributions & Licenses

This extension is an independent, unofficial tool. It is **not affiliated with,
endorsed by, or sponsored by Chess.com or Lichess**. All third-party assets below
are used under their respective licenses.

## Chess pieces (bundled SVG sets)
Distributed by Lichess (lila); high-quality vector SVGs.
- **Cburnett** (`pieces-img/cburnett/*.svg`) — Author: Colin M.L. Burnett. License: **GPLv2+**.
- **Merida** (`pieces-img/merida/*.svg`) — Author: Armando Hernandez Marroquin. License: **GPLv2+**.
- **Source:** https://github.com/lichess-org/lila/tree/master/public/piece
- **Licensing reference:** https://github.com/lichess-org/lila/blob/master/COPYING.md
- Note: GPLv2+ permits redistribution (incl. commercial) provided the licence/source terms
  are met. We deliberately avoided Lichess's non-commercial (CC BY-NC-SA) sets.

## Chess pieces & boards (Kadagaden set)
By **Kadagaden**, from the `chess-pieces` repository.
- **Piece sets** (`pieces-img/kaneo/*.svg`, `pieces-img/kaneo_midnight/*.svg`,
  `pieces-img/kbyte_gambit/*.svg`) — "Kaneo", "Kaneo Midnight" and "1Kbyte Gambit".
- **Not bundled:** "Maestro B/W" was excluded — it derives from Lichess's "Maestro" set, which is
  **CC BY-NC-SA (non-commercial)**; that restriction is incompatible with this open-source project.
- **Board artwork** (`boards-img/*.svg`) — the bundled 8×8 board backgrounds
  (Green, Sand, Amber, Clay, Wood).
- **Source:** https://github.com/Kadagaden/chess-pieces
- **License:** **CC BY 4.0** — https://creativecommons.org/licenses/by/4.0/
- Only the standard chess pieces (K, Q, R, B, N, P) and 8×8 chess boards are bundled;
  the repository's fairy-chess / Janggi / Xiangqi / Sittuyin assets are not used.

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
- **Source:** Lichess sound set (lila), distributed under AGPL-3.0 —
  https://github.com/lichess-org/lila/blob/master/LICENSE
- **Underlying sample credit:** the samples embed the tag
  "Copyright 2000, Sounddogs.com" (commercial royalty-free library, as redistributed
  by Lichess). Retained here for transparency.

## "Wrong answer" practice sounds
- **Files:** `sounds/Wrong/*.mp3`
- **Source:** [Pixabay](https://pixabay.com/sound-effects/) — used under the
  **Pixabay Content License** (https://pixabay.com/service/license-summary/):
  free for commercial and non-commercial use, no attribution required; the
  credits below are given voluntarily. (Bundling inside an app is permitted;
  redistributing the bare audio files on another stock/download platform is not.)
- **Creators:**
  - `Wrong.mp3` — "Wrong" by **lionelmatthew001**
    ([Freesound profile](https://freesound.org/people/lionelmatthew001/)) — originally a
    CC0 Freesound upload, mirrored to Pixabay via the `freesound_community` account.
    Source: https://pixabay.com/sound-effects/people-wrong-83488/
  - `No.mp3` — "No" (male voice SFX) by **Mrstokes302**
    ([Pixabay artist](https://pixabay.com/users/mrstokes302/)).
    Source: https://pixabay.com/sound-effects/people-quotnoquot-male-voice-sfx-mrstokes302-423290/
  - `Incorrect.mp3` — "Training Program Incorrect2" by **timgormly**
    ([Freesound profile](https://freesound.org/people/timgormly/)) — originally a
    CC0 Freesound upload, mirrored to Pixabay via the `freesound_community` account.
    Source: https://pixabay.com/sound-effects/film-special-effects-training-program-incorrect2-88735/

## Chess engine
- **Files:** `engine/stockfish*.js`, `engine/stockfish*.wasm`
- **Project:** Stockfish.js by Nathan Rugg (nmrugg), a JS/WASM port of Stockfish —
  https://github.com/nmrugg/stockfish.js
- **Default build:** `engine/stockfish-nnue.{js,wasm}` is **Stockfish.js 18, © Chess.com,
  LLC** (per the file header), a NNUE-enabled build distributed via nmrugg's Stockfish.js.
- **Fallback builds:** `engine/stockfish.{js,wasm}` and `engine/stockfish.asm.js` are the
  Stockfish 10 builds from nmrugg's Stockfish.js.
- **NNUE evaluation network:** by Linmiao Xu ("linrock") —
  https://tests.stockfishchess.org/nns
- **License:** GPL / GPLv3 — https://github.com/nmrugg/stockfish.js/blob/master/license.txt
- **Upstream:** Stockfish by T. Romstad, M. Costalba, J. Kiiski, G. Linscott and
  contributors — https://github.com/official-stockfish/Stockfish
- Corresponding source for the bundled engine is available at the URLs above.

## Opening book
- **File:** `data/book.json` (built from `data/raw/*.tsv`)
- **Source:** `lichess-org/chess-openings`
- **License:** CC0 (public domain) — https://github.com/lichess-org/chess-openings

## Chess logic library
- **File:** `lib/chess.js`
- **Author:** Jeff Hlywa — **License:** BSD 2-Clause

## App logo / icon
- **Files:** `icons/icon16.png`, `icons/icon48.png`, `icons/icon128.png`, `icons/icon.png`
- Original artwork created for this project. The knight in the mark is derived from Colin M.L.
  Burnett's ("Cburnett") knight piece, so the logo is likewise made available under
  **CC BY-SA 3.0** with attribution to Cburnett.
