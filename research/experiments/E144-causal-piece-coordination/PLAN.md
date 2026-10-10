# E144 — causal piece coordination and activity

2026-10-10 before implementation/evaluation, parent E143dfaa07b. Authorized
current main, research-only local commits/no push. Previous goal turn progressed:
E143 committed two forcing tempo/initiative scopes. D001-test preflight passed.
BUILD-FIRST.md focused work; no cumulative suite or engine/tablebase collection.

Queue: C0029 harmony, C0032 relative piece value, C0038 quality of pieces.
C0032's actual catalog definition is approximate pawn1,knight3,bishop3,rook5,
queen9 values. Reuse E020 VALUES rather than inventing a valuation estimator.
Add context comparing a lower nominal but necessary helper with a higher nominal
redundant unit. Nominal values are a convention, not measured game strength.
Sustainable perpetual attack and named rook defenses retain prerequisite gaps.

Default-false coordinationTags wrapper around E143, strict coordinationPlies
0..2 default2 and maxCoordinationNodes0..50000 default50000. Require supplied
full legal actual history. Query actual position after the move for actor mate.
Then examine EVERY own nonking unit after the move, including the actor: remove
it from the after-position in a separately declared fresh counterfactual frame
preserving turn/clock, validate legality, and query the SAME actor/bound. These
are board-mechanism comparisons, never claimed to be actual played continuations
or historical counterfactual outcomes. Actual queries retain actual full history;
fresh controls explicitly do not invent a played history. Refuse claim contexts.

Classify a unit as necessary only when actual mate is proved and its legal
removal frame has a complete bounded refutation. Invalid frames remain unavailable,
not necessary. Build a core containing the king and all individually necessary
own units, retaining the complete opposing army. Validate and positively prove
the core at the same bound: pairwise necessity alone is not sufficiency.
C0029 cooperating-mating-core requires necessary actual mover plus at least two
necessary other units and a sufficient core. No whole-army lasting harmony claim.

For each necessary nonmoving helper, enumerate ALL legal noncapturing,
nonpromoting, nonchecking moves by that helper in the original before-position.
Use each destination as an explicit synthetic replacement placement before the
actual move, preserving original turn/clock and inventory. Validate frame and
actual move there; record illegal frames/unavailable actual moves, never silently
delete them. Query each valid resulting position at the same bound. C0038
placement-dependent-piece-quality needs at least one complete failed relocation
for a necessary helper, showing activity matters with identical nominal inventory.
No arbitrary alternate history, null move or claim of universally bad relocation.

C0032 nominal-versus-role comparison displays the existing full1/3/3/5/9 convention
and a strictly lower nominal necessary helper versus a higher nominal unit whose
removal retains the mate. This is finite role evidence, not a fitted numerical
value or an assertion that lower nominal units generally outperform higher ones.
No accepted tracker/production/numerical changes. Broader original scopes stay open.

Reuse E143's actual actor query ONLY where full input/history/bound/source bindings
match; other queries are new cheap authored board mechanics. Store full query tick
traces, including discarded branches, and semantically replay exact budget cost.
If supplied coordinationCertificate is used, independently validate every query,
inventory, frame, counterfactual convention and trace before labels. Atomic cap
exhaustion clears new witness/events; parent output preserved. Draw claims anywhere
in search stop all new labels as claim-rule-prerequisite.

Prospective authored hypotheses: reuse E143's root and Qd8+ unchanged; Bf7,Ng4,
Pd4 may be independently necessary and jointly sufficient with Qd8/king. Add own
Ra2 as a prospective redundant higher-value comparison. Relocations are generated
prospectively by the full legal helper inventory, not selected after outcomes.
Reflect colors. Negative short bound, missing history, zero cap and absent Ng4.
Initial pilot<=12 cases, one cheap smoke before expansion; retain failed hypotheses
and dated amendments. No imported diagrams/games. Reuse hash-matched query caches.

Focused strict/disabled/positive/negative/budget/frame/trace mutations, representative
E143 checks, guarded small pilot and independent saved semantic replay, complete
source/config/history/cache hashes, source verification/diff. Combined cumulative
regression, exhaustive interaction/occurrence/history/priority/budget audit, exact
main/repeat/initially clean reproductions and real-game precision/usefulness deferred.
