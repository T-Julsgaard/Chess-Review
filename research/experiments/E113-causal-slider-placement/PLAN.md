# E113 causal rook lifts and queen centralization

2026-10-09 prospective build-first batch, parent E112 abeaaef. Continue in
user-authorized current checkout/main, research only, local commits/no push.
Rank-filtered pending C0349 rook lift, C0361/C0725 queen centralization share
legal slider placement and complete mate-policy comparisons. Keep both duplicate
queen occurrence scopes. Reuse E029 query/replayQuery, E024 history and E112 parent;
do not change frozen accepted inputs or duplicate existing E068 swing claims.

Actual noncapturing rook/queen move in <=10-unit live position without castling
rights. Rook lift uses the original horizontal-transfer meaning: different files
on the same rank, specifically mover-relative third/fourth rank. Queen entry must
come from outside d4/e4/d5/e5 into that central set. Full actual known-history
AND fresh actual placement both force mate at H; then restore ONLY moved slider
from destination to its old square, preserving other units, side to move and
post-move clocks, clearing EP with fresh history. Restored frame must be legal
and fail the same complete mate policy. Artificial restoration is a comparison,
not a legal undo/null move, and illegal frames abstain. Actual terminal mate may
qualify. Do not infer central usefulness from geometry, permanence, best move,
general attack advantage or strategic slider quality. Broader scopes stay open.

Interface sliderPlacementTags defaultfalse wraps E112; sliderPlacementPlies
integer0..4 default2, maxSliderPlacementNodes integer0..50000 default50000.
One shared atomic budget: exhaustion discards all new witnesses/events even
after actual proof succeeds. Strict input/history/disabled equality; <=24-word
comments, qualityClaim:false. Retain actual/fresh/restored proof trees and full
inventory so independent checker reconstructs every field without candidate or
solver imports. Independent neutral E029 replay enforces complete branches.

Commit before evaluating. Authored both-color prospective hypotheses: rook
horizontal transfer on third rank with bishop/king closing king flights; queen
central checkmate with enemy pawn-blocked retreat squares. Hypotheses can fail;
retain failures without changing gates. Focused positive/negative cases include
both relevant ranks, geometric-only/no mate, mate surviving restoration, wrong
rank/vertical transfer, queen already central/noncentral destination, capture,
castling rights, clocks, known history, terminal input, zero/exact budgets,
strict controls, JSON and proof/frame/material/label mutations. Cheap guarded
D001 pilot, full source dependency hashes. No acquired games or engine searches.

Deferred cumulative regression, exhaustive integration/absence/priority/history/
budget checks, exact frozen changed main/repeat/initially-clean reproductions,
original-occurrence audit and real-game precision/teaching usefulness. Continue
the complete catalog after code-ready; accepted tracker and production unchanged.
