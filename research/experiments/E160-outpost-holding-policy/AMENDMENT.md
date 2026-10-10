# E160 authored holding-position amendment

2026-10-10 after first six-family smoke, before corrected evaluation. Original
positive/general/no-pawn cases failed because a waiting enemy pawn/king move
retains Ng7xf5 as the next counterreply. Pawn support does not prevent capture.
Delayed-knight and support-removal negatives passed. Ra5 checks Ka1 at root,
making actual Nd4f5 illegal. failure-waiting-knight.json.gz preserves all six
results/errors, five complete independently replayed panels, sources and hashes.

Keep every policy/material/live/support/claim gate unchanged. Add White Nd5/Ne5
to positive, general, rook-defense, support-removal and no-pawn families. Hypothesis:
after waiting pawn move, Ne5g6 checks Kh8; after Kh8g8 or Kh8h7, Nd5f6 checks.
Such quiet responses force a king answer through the declared counterreply while
retaining Nf5/Pe4. Other enemy knight moves switch its square color, so cannot
recapture Nf5 on the immediately following enemy turn. Immediate ...Nxf5 still
requires actual exf5 and every subsequent counterreply. This is explicit finite
checking support from additional knights, not evidence for generic permanence.

Rook defense moves a5->f8, allowing legal ...Rxf5/exf5/Nxf5; unchanged pawn-
retention gate should reject it. Support-removal rook moves e8->e3, preserving
actual ...Rxe4 despite the added Ne5. Delayed-challenge control deliberately
retains original own single-knight army and Nb7, demonstrating missing holding
resources. Full armies remain explicit; this is not a one-piece isolated causal
comparison. Missing-history/zero-cap use amended base without affecting gates.
Only the tiny six-family smoke repeats because fixtures changed prospectively.
