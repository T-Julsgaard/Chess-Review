# E117 — pawn defense policies

Preregistered 2026-10-09 under the approved build-first workflow. Parent E116.
Original occurrences C0211 (pawn weakness) and C0227 (pawn cover); original
strategic definitions remain open. No production or accepted-tracker changes.

Default-false pawnDefenseTags; pawnCoverPlies integer 0..4 (default 1);
maxPawnDefenseNodes integer 0..50000 (default 50000). Disabled behavior equals
E116 exactly. One atomic budget; exhaustion discards all new witnesses/events.
Validate actual history and live legal move. At most ten units for bounded cost.

C0211: enumerate enemy pawns in square order. After EVERY legal opponent reply,
the same pawn must remain at its square and there must be a legal capture of it
whose E022 certificate proves strictly positive nominal gain through EVERY next
enemy response. Capturers may vary. Retain complete defense inventories and
failed capture trial prefixes. Stop at first failing defense and first successful
pawn. This is an exact immediate inability to save a pawn, not lasting weakness
or a judgment about all material/tactical consequences of the initiating move.

C0227: after a quiet own pawn advance into king cover, with unchanged own king
on c/e/g home square, no castling rights and no current check, collect ALL own
pawns within one file and one/two forward ranks of that king. Full actual and
fresh-position enemy mate queries must both FAIL at H. Remove only that entire
cover (preserve side/clocks; clear EP), require a legal counterfactual and full
enemy mate query SUCCESS at the same H. Removing pawns can also affect escape
squares; this establishes cover's total bounded defensive effect, not only ray
blocking. No intent, long-term safety or general king-security assertion.
Reuse E029 solver and neutral replayer, E022 certificate; no new engine/search.

Focused positives/negatives: both colors, varying capturers, pawn movement/escape,
recapture and terminal refusal, cover/no cover, surviving alternative defense,
illegal removal frame, outside geometry, known history, strict inputs, exact
disabled compatibility and atomic budget. Independent saved checker reconstructs
all legal defense/capture inventories and nominal responses; never imports the
candidate or mate solver. Small guarded synthetic pilot plus source/diff checks.

Defer cumulative regression, exhaustive integration/priority/history/absence/
budget audit, original-occurrence review and pristine main/repeat/clean runs to
combined freeze. Real-game precision and usefulness remain unassessed. Synthetic
fixtures only; no acquired games or labels. Preflight D001 test passed before
registration. Save compact lossless evidence with source/input/runtime hashes.

Next: remaining tactical attack families; permanence and general opening advice
require explicit prerequisites rather than geometry-only labels.
