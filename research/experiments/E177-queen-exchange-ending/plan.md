# E177 — queen exchange into a certified winning rook ending

2026-10-10. Parent E176 1217943; runtime parent remains E175 because E176 adds
explicit scope APIs, not another explainMove wrapper. Authorized current main,
research-only local commits, no push. BUILD-FIRST applies. Preregister before
new evaluation; reuse E144 traced query/replay, no duplicated finite mate engine.

Separate bounded strategic-planning occurrences C0545 preparing a favorable
endgame and C0546 preventing counterplay. Prior E155 conversion proves actual
completed material-edge mate, not preparation of an ending. E172 refutes finite
attacks in a sacrifice context; E169 is a checked defense comparison. Neither
silently discharges these distinct new scopes. Full strategic meanings stay open.

Default-disabled endingPreparationTags wraps E175 exactly. Require genuine legal
history, endingAlternative (distinct legal noncapture, any own unit; checking
alternatives allowed), and root exactly two kings, two opposing queens and one
actor rook. Actual original queen must capture enemy queen without promotion.
endingMatePlies integer0..2 default2; this registered scope requires2. Strict
maxEndingPreparationNodes integer0..50000 default50000. Optional complete saved
endingPreparationPanel receives independent semantic admission. Missing/context/
horizon prerequisites abstain; malformed/illegal controls reject. Atomic
exhaustion preserves parent and discards all own events/witness with limit+1.

Keep both actual/alternative complete legal enemy reply inventories, every
enemy capture and every immediate own counterreply, exact genuine histories,
states/material/terminal/claim flags and complete E144 query traces for actor
mate within two continuation plies after either initial move. No null moves,
FEN turn swaps or deleted-piece frames. Any visited fifty/threefold claim
suppresses labels. Logical work charges context/history, variant/reply/counter
states, every query tick and derivation work equally for saved and fresh inputs.

C0545 requires a live actual endpoint and nonempty enemy defenses, ALL being
king recaptures of the moved original queen, each reaching live KRK with the
actor's original rook retained, actual actor mate query true and alternative
query false. This is a complete queen-exchange policy into a finite winning
rook ending, not inferred favorable value from nominal balance alone.

C0546 additionally requires zero enemy immediate profitable capture policies
under actual, but at least one under alternative. Gain is enemy nominal gain
relative to the SAME original root; a capture must retain strictly positive
gain through every nonempty live immediate own counterreply. Thus exchanging
queens is not confused with merely conceding the captured queen. All enemy
captures, failed captures and counters retained. This proves prevention of that
specific finite capture counterplay only; broader plans/initiative remain open.

Prospective authored root: White Kg6 Qf7 Ra1 versus Black Kh8 Qg8, White in
check. Qxg8+ is hypothesized to force Kxg8, then Ra8#. Alternative Qg7+ permits
Qxg7+ retaining enemy gain through all immediate counters. Alternative Kf6 is
the separating hypothesis: Qxf7 can be answered Kxf7, so C0545 alone expected.
Rf1 replaces Ra1 for a failed short rook-mate policy. Rg7 protects the exchanged
queen, making actual immediate mate rather than an ending transition; withhold
both. Register both colors, H0, missing history/alternative, zero cap, extra
enemy knight (unsupported material), and root halfmove99 whose noncapture
alternative reaches a fifty-move claim. Ten families, 20 cases. Amend before
any adaptive revision; preserve failed hypotheses and partial raw collection.

Small guarded smoke first; reuse exact full history/root/move/alternative/H and
collector dependency closure plus receipt. Check existing E144 query caches
before collecting; do not regenerate matching observations. Persist smoke
panels immediately so later failures cannot discard earlier complete queries.
Pilot uses all cached compatible panels, collects only missing reflections,
then reuses its retained observations. No engine/tablebase/new real games.
Soft evidence target500KB; retain required proofs even if exceeded.

Focused checks: both colors/separate labels, exact disabled parent, strict
controls/history, all-defense/endgame gate negatives, claim/terminal handling,
exact/one-short/fresh/saved/zero budgets, semantic panel/query/inventory/capture/
counter/ledger mutations and affected E175 representatives. Independent saved
replay imports no new detector/context/collector/derive. Source/diff checks,
complete recursive source bindings plus full E176 build. No cumulative suite,
long reproduction or historical recollection. Combined occurrence/priority/
history/budget audits and changed main/repeat/clean reproduction deferred.
Real-game precision, teaching usefulness, broad ending value/strategic
counterplay, other material classes and longer conversion remain unresolved.
