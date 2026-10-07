# Authored development exposure and selection correction

2026-10-07. D001 guarded synthetic only; isolated research checkout, no external
games/engines/numerical fitting or extension changes.

First target: enemy Bd4 already checked Ka1, so own Ne3 did not answer check.
Move bishop to f4, keeping a legal capture of the blocker on e3. Stationary
own Bb2 already checked Kh8; use Bb1–c2 for the unrelated-move negative.
Author review corrects a rook capture refutation from Ra4 (checking Ka1) to
Rh4, keeping Rx e4 legal. No predicate or evidence requirement changes.

Guarded selected-text smoke confirms self-blocking commentary selected but
generic pawn-ending100/pawn-ending-transition101 hides fixation93.5. Before
decisive runs correct ONLY fixation priority to101.4, above generic endings,
below trades/promotions/urgent tactics; self-blocking remains94.5. Do not
weaken the selected-text test or alter parent selection. Plan retained verbatim
with this exposed deviation hashed as run input. Cheap target initially89/90
after geometry corrections, failed solely the selection expectation.

Add99-after-actual self-block fixture retaining terminal100-halfmove enemy
reply with no continuation, and actual100-halfmove negative. This exercises
explicit terminal branch recording separately from live all-reply fixation.

Final target98 tests (92 cases plus six proof/selection/guard groups), cumulative
E020–E0592,544 tests all pass; maintained source/diff pass before source commit.
Ignored adapter fallback initially referenced a missing old helper in this
isolated clone; author a new explicit adapter instead, before any full run.
