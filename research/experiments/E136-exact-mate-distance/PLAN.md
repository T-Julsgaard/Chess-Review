# E136 — exact finite mate distance and lost pawn-ending transitions

2026-10-10 before implementation/evaluation. Parent E135f8036a4. Current main
authorized, research-only local commits/no push. BUILD-FIRST.md applies.

C0750: after actual move, exact minimax distance to checkmate IN PLIES for explicit
requested winning side, only if a complete forced-mate proof succeeds within H
AND complete refutation of every shorter bound is retained. Reuse E029 query,
not a competing mate-search implementation. Query increasing0..H; retain all
queries including failed bounds. Winner minimizes time, opponent maximizes/avoids.
Failed finite search is unresolved, never draw/loss or a numeric tablebase metric.
Not a tablebase probe, DTM file observation, DTZ or mate-in-moves estimate.

E029 uses chess.js terminal rules. Before issuing an EXACT distance, independently
walk every required query proof with full actual history; any draw leaf based on
50move/threefold claim makes exactness unavailable (claim-rule-prerequisite),
because voluntary claims cannot silently be modeled as compulsory attacker draws.
Stalemate/insufficient material and checkmate leaves remain mechanical. No global
clock/history approximation or fabricated exact value when claim semantics matter.
Combined broader claim/automatic-draw rule audit remains deferred. H<=5 small;
no long mate hunt, tablebase download or engine. Full history affects every branch.

C0878: additionally actual king/pawn nonpromoting capture of the last enemy rook
leaves only kings/pawns, and the exact requested opponent mate proof succeeds.
Supplied immediately preceding legal history must show that same enemy rook just
captured actor's last rook, both in a pure rook/pawn ending beforehand. Save prior
capture, exact exchange identities and pawn-ending inventory. Without history,
report only mate distance. Forced transitions allowed: do not infer a blunder,
avoidable loss, prior equality/winning status or player intention. General lost
pawn endings beyond mate horizon remain unresolved, not redefined by this scope.

Defaultfalse mateDistanceTags, strict maxMateDistanceNodes integer0..50000
default50000, mateDistancePlies integer0..5 default3, mateDistanceSide enum
actor/opponent defaultopponent. Disabled exactly E135, no implicit parent flags.
Atomic budget includes E029 state/edge ticks, actual/history/replay guards; exhaustion
drops all new events/witnesses, preserving parent. Independent checker imports
neither E029 solver nor detector; reuse E029 independent replayQuery for complete
tree semantics and additionally verify every required depth, minimum, claim leaves,
actual/history/winner/transition binding and exact labels. Strict invalid controls,
disabled/enabled-parent behavior, terminal/clock/repetition, horizons/budgets,
history and proof mutations tested. <=20 authored pilot cases, fixed50000smoke,
target seconds/tens of seconds. D001 guard receipt, no acquired games used.

Prospective authored exchange: Black to move initial White Ka2/Pa3/Ra1 versus
Black Kc2/Pb2/Rh1, ...Rxa1+ then Kxa1. Black ...b1Q should mate in1ply. Current
root with no history same mate metric only; history is required for lost-ending
label. Additional distance2 hypothesis White Kf6/Qe7 versus Kh8, actual Qf7,
requested actor: every black move should permit mate next, but none at0/1plies.
Verify these hypotheses without silently replacing failed positions. Both colors,
H0, neutral nonmating board, zero budget, malformed history and terminal controls.

Queue deviation: long/short-side, Philidor/Vancura and outside passer strategy
still need sustained defensive or full-outcome evidence; tablebase integration
needs a registered new data format and licensed source/probe provenance. No source
acquisition or changes to the shared data policy in this batch. Full original
catalog scope preserved. Exact small forced-mate metrics and known-loss transitions
advance genuine outcome machinery while those prerequisites remain explicit.
Deferred combined cumulative regression, exhaustive interaction/absence/priority/
history/budget/original-occurrence audit, exact main/repeat/initially clean
reproductions, real-game precision/usefulness and broader outcomes/tablebases.
Accepted tracker, numerical research and production unchanged.
