# E143 — forcing tempo and tactical initiative

2026-10-10 before implementation/evaluation. Parent E14290f9691. Authorized
current main, research-only local commits/no push. Prior turn made progress:
E142 committed four tactical trade scopes. D001-test resumption preflight passed.
Use BUILD-FIRST.md focused checks; no cumulative suites, engine or tablebase probes.

Next compatible strategic scopes C0021 tempo and C0022 initiative. Sustainable
perpetual attacks and named rook defenses retain their unmet recurrence/history
and larger tablebase/policy prerequisites. These two new scopes require causal
legal alternative comparisons, not a check/attack tag or static piece count.

Default-false forcingTempoTags wrapper around E142; maxForcingTempoNodes strict
integer0..50000 default50000; remaining forcingTempoPlies strict0..2 default2.
Rebuild supplied full legal history where available; absent history is explicitly
unavailable, not assumed repetition-free. Prospective authored cases provide an
explicit initial history. Enumerate all legal moves and query complete mate trees
for BOTH sides after each move at the same remaining bound. Retain unresolved
results as such, never draw/safety. Actual move must be a noncapturing,
nonpromoting check that is not already mate and forces mate within two plies
against EVERY legal defense. Require a noncapturing nonchecking alternative by
the SAME unit that permits opponent forced mate within the bound. This supports
a concrete opportunity cost of spending the move differently, not exact best
move selection or general tempo valuation.

C0021 forcing-tempo-window: actual forcing check retains the mating result,
where a same-unit quiet move permits forced enemy mate. C0022 tactical-initiative:
add the explicit complete checking-defense panel; every legal response to the
actual check has an immediate mating response, so the opponent cannot execute
its otherwise certified counterattack first. Retain exact legal replies and
branch-specific mating responses. Initiative here is a finite forcing attack,
not a permanent strategic advantage. Other winning moves may exist; do not imply
uniqueness or optimality. Broad concepts and all original scopes remain open.

Atomic budget exhaustion removes witness/new labels and preserves parent output.
Draw-claim leaves anywhere cause claim-rule-prerequisite abstention; no automatic
history reset, null move or fabricated counterfactual. At most12 authored pilot
cases including color reflection, missing history, shorter bound, zero cap,
quiet actual move, and absent opponent counterattack. Independent checker imports
Chess/existing independent mate replay only, not query/detector/helper.

Prospective root: White Kg1,Qg5,Bf7,Ng4,Pd4,Pg2,Ph2 versus Black Kh8,Qd2,Rh7.
Hypothesis Qd8+ forces ...Kg7 Qg8#, whereas Qh5 allows ...Qe1#. This is authored
development, not a copied diagram. Preserve illegal/failed hypotheses and dated
amendments rather than rewriting this registration. Begin with one bounded smoke;
estimate panel nodes/time before expanding focused cases. Retain small compressed
pilot, complete source/config/history hashes, environment and guarded receipt.
Reuse compatible panels rather than repeated searches in tests/replay.

Focused positive/negative, disabled/strict/budget/mutation checks, representative
E142 parent checks, independent saved semantic replay, source verification and
diff. Combined cumulative regression, exhaustive priority/occurrence/history/
budget audit, exact main/repeat/initially clean reproductions and real-game
precision/teaching usefulness deferred. No accepted/production/numerical changes.
