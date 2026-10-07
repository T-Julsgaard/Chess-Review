# Authored development exposures

2026-10-07. Definition metadata only; every board/history locally authored.
Standard kingside/queenside role counterparts used, rather than geometrically
reflecting e-file king origins/castling rights. Color reflection stays valid.

Initial target100/103 passes. In the queenside prior-pawn-loss negative,
Rb5xa5 captures the pawn that shielded Ka1, giving check. Proposed b4-b5
does not evade that check. Move that fixture's own king to h1 so the refuting
history and actual move are fully legal, still rejecting the lost prior pawn.
The counter-tamper test sets halfmove clock to0, already its original value;
use1 to make a real inconsistent-history mutation. These are authored fixture/
test corrections; no detector, predicate or priority relaxation.

Corrected target103/103 passes. Complete histories verify a legal castle before
both distinct advances, adjacent advanced pawn geometry, rights/EP chronology,
all replies including captures/terminal. Ordinary/double/capture steps and
staggered connection pass; no history, pre-castle first advance, king relocation,
wrong unit/flank, early/separated/same-pawn steps do not qualify. Actual mate
and promotion suppress labels; urgent pawn-loss/mate warnings preserve selection.
Demo highlights actual pawn, its companion and enemy king; canonical proofs
unchanged. Source freeze and full reproductions still pending.

First cumulative E020–E0633,042/3,042 passes, source verification/diff pass.
Before source freeze, add actual double-step EP reply on both standard castle
flanks/colors: capture removes the new storm pawn off the landing square,
retained pawn flags are correct, and urgent loss warning still wins selection.
Expanded target108/108 passes. Repeat cumulative after this added regression.

Final expanded cumulative E020–E063: 3,047/3,047 passes. Source verification and git diff --check pass. Target 108/108 passes. Freeze this source and exposure record before main, repeat, and initially clean full reproductions.
