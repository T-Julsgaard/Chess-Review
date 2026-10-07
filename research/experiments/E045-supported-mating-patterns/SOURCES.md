# Definition sources and restricted scope

Read 2026-10-07, terminology metadata only. No source game, diagram, move
sequence, FEN, puzzle or evaluation imported into fixtures.

- [Chess.com: checkmate patterns](https://www.chess.com/terms/checkmate-chess)
  describes Damiano's queen mate supported by a pawn or bishop. This experiment
  retains the pawn form only.
- [Ward Farnsworth: Damiano's mate](https://www.chesstactics.org/mating-patterns/other-classic-mating-ideas/lollis-mates_damianos-mate/6_2_5_7.html)
  specifies the g6 pawn and h7 queen finishing geometry. We classify terminal
  shape, not a historical sacrificial sequence.
- [ChessWorld: checkmate-pattern glossary](https://www.chessworld.net/chessclubs/openingguide/checkmate-patterns-glossary.asp)
  distinguishes queen-and-advanced-pawn Lolli mates from other patterns.
- [ChessWorld: Hook Mate](https://www.chessworld.net/hook-mate.asp)
  describes rook check plus knight escape-square control, including horizontal
  and noncorner patterns. This implementation requires additional explicit
  pawn-to-knight-to-rook protection and an enemy blocker; broader variants remain
  outside this profile. Pawn support is not claimed to be uniquely necessary.

All evaluated boards are authored synthetic fixtures. Named labels state the
observed terminal pattern only. King placement does not assert actual castling.
