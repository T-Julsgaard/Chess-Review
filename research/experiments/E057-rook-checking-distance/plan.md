# E057: rook checking direction and immediate checking distance

2026-10-07. Frozen E056; research only, numerical goal paused, cutoff/shutdown
cancelled, no extension or push. Original list unchanged. Authored synthetic
only; published definition/lesson metadata, no copied boards/games/sequences.
Commit protocol before evaluation.

rookCheckTags boolean defaultfalse exact parent. maxRookCheckNodes integer
0..50000 default50000 shared budget; exhaustion drops ALL new labels and keeps
parent facts. Live before/after full-history canonical boards, no terminal
continuation. Actual moved rook gives a direct unobstructed check in a rook
ending: board contains only K/R/P, exactly one rook per side and at least one
enemy advanced passed pawn (relative rank5..7). Enemy passer definition is
independently enumerated against all own pawns ahead on adjacent/same files.

rear-rook-check: actual checker shares enemy king/passer file, behind that king
opposite its pawn's forward direction, with advanced passer beyond the king
in its forward direction. side-rook-check: actual checker shares enemy king
rank and that king shares an eligible advanced passer's file; passer beyond
king in its forward direction. Label states checking direction, not strength
or drawing technique. Exact complete eligible pawn set retained, deterministic
lexical selected pawn. No frontal-file checks mislabeled rear.

rook-checking-distance: eligible rear/side check with at least THREE clear
intervening squares, and EVERY legal enemy reply leaves original checker
uncaptured. No threshold-goodness, draw, perpetual-check or future-safety claim;
short comment states the actual separation and immediate noncapture fact only.
Closer checks retain direction labels but no distance label; capturable checker
also drops only distance label, retaining direction and stronger warnings.

Full actual move record, before/after canonical FENs, own/enemy rook and king,
complete pawn identities and eligibility set, typed clear rook ray, clear-square
count, ALL legal check-evasion records with exact FENs; checker-capture subset
explicitly stored even for direction-only unsafe examples. Independent replay
imports no detector helpers: reconstruct history, material/passer context,
actual direct checking ray, directions, all replies/capture subset and exact
text. Count positive-distance predicates independently. <=24 words,
qualityClaimfalse; direction priorities75.3/75.4, distance75.5 below urgent
threats/terminal/forks and stronger patterns, above generic check.

Author rear/side (both side directions), exact three-clear-square boundary,
closer checks, pawn capture of checker, rook capture/blocking evasion, pawn
promotion blocking a check, multiple eligible passers, captured unit on actual
landing square, full legal capture history; missing advanced passer, nonpassed
pawn, frontal/opposite-axis check, obstructed ray/no check, extra rook/minor,
king not on passer file, terminal threshold, unsafe/illegal actual move,
default/zero/midway budgets, omitted/modified reply/ray/pawn/history/text.
No positive EP evasion claimed after a nonpawn rook move resets EP rights.
Horizontal and color/rank variants preserve history/counters.

D001 test guard before fixtures; cheap target/smoke then cumulative E020–E057,
maintained source/diff. Source committed before main/repeat/initially clean
local clone; exact source/input/output/metrics, actual physical file hashes,
saved JSON independent replay, ordered inherited E056 fingerprints and
original-list hash unchanged. Full proofs below3MB with compact E053 demo.
Full run estimate~195s, overlap three. Synthetic mechanics only; real-game
precision and learning benefit unknown. Next numerical recipe stays paused.
