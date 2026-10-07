# Definition and API sources

Read 2026-10-07. Metadata/definitions only; no source examples, games, boards,
FENs or move sequences used as fixtures.

- [FIDE Laws of Chess, 2023](https://rcc.fide.com/wp-content/uploads/2022/11/Laws_of_Chess-2023.pdf): attack geometry includes pieces constrained by their king; legal moves must not expose or leave their king in check (articles 3.1.3 and 3.9.2).
- [Maintainer chess.js documentation](https://github.com/jhlywa/chess.js/blob/master/website/docs/index.md): attackers includes pinned pieces; verbose legal moves provide actual capture, SAN and before/after records. Local maintained lib/chess.js is used and hashed, rather than assuming the current upstream version.
- Original supplied concept list: Counting attackers and defenders, X-ray defense. The latter already has a frozen alignment-only partial interpretation; E048 requires an actual four-move conditional recapture witness.

Counts alone establish neither safety nor profitable exchange. All comments
state legal options or a specific conditional sequence; qualityClaim is false.
