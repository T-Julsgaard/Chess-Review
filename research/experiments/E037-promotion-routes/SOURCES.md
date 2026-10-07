# Definition sources

Reviewed 2026-10-07: [ChessBase rule of the square tutorial](https://learn.chessbase.com/en/page/the-rule-of-the-square)
describes the king's entry into the pawn's promotion-route square. Only the
definition is used, no source diagram/game position. Our label requires both
conservative tempo-adjusted distance geometry and an independently replayed
all-response promotion route. It never substitutes a distance for legal proof.

Legal pawn movement and promotion use maintained chess.js move generation.
Authored synthetic fixtures cover timing, king interference, captured promoted
queen, draws, histories, both colors and search exhaustion. No source game or
registered dataset game is evaluated. Promotion race remains deferred.
