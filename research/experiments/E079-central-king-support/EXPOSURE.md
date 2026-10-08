# E079 development exposure

2026-10-08. Initial 38 focused tests passed; four saved within-center and
already-safe outcomes independently replayed and retained. All original roots
remain. Expanded history/terminal/foundation/nonking/capture/options gates are
under focused evaluation; final frozen runs not started.

One tracker-audit setup failure retained: generated regex adaptation contained
excess escaping, and a string replacement containing a dollar anchor mangled the
source, producing a syntax error before tracker rendering. Correct by copying
the frozen parent renderer function exactly and changing only registered scopes
and descriptive summary. No classifier predicate, occurrence acceptance gate,
fixture or scientific result changed or removed. Rerun independent 1,083-row
preservation audit before acceptance. Source inspection also retains original
start-history FEN consistently with validateHistory; positive history gate added.

Expanded focused run failed after 198.6s at history-mismatch-black: expected
final-FEN mismatch but inherited reflector replayed the short history and
replaced the intended final input, producing an illegal actual king move.
Retain that original reflected position as original-mismatched-history-reflection
negative. For malformed/mismatched histories reflect start/input/moves literally
without executing or replacing the mismatched final board. Valid histories still
reuse frozen reflector. Independent guarded setup probe also found that malformed
history reflection tried executing its illegal move, and castling fixture had
no rights because setup ignores a third argument. Retain no-rights position as
castling-without-rights negative and add proper explicit K rights to legal
castling case. No detector predicate, history gate or error acceptance weakened.

Targeted correction rerun retained one further fixture expectation failure:
original-mismatched-history-reflection-black has literal reflected fullmove
counter two while its one White history move ends at counter one; exact history
validation therefore refuses final-FEN mismatch before actual-move legality.
Retain both literal versions with explicit separate expected errors (original
illegal move, reflected final-FEN mismatch), preserving both fullmove counters
and histories. No error gate broadened, no original failed root removed.

Saved cumulative development pilot stopped at unavailable: missing inherited
expected king-promotion-support. Variant had copied positive fixture expected
event while explicitly setting kingSupportDepth zero. Preserve input and add
exact no-support-event expectation/absence; wrapper already correctly reports
unavailable with no new witness. No enabling of implicit older search flags.
Add prospective explicit actual mate/stalemate and king entry into rook/bishop/
knight/pawn/pinned-bishop attacks before final source freeze; no earlier case
removed. Final cumulative tests must include the expanded final fixtures.

Before final gates, make the new wrapper's registered strict boolean/integer
contract explicit: only undefined supplies defaults; explicit null is malformed.
Older parent option semantics stay untouched. Add null refusal fixtures and
check expected/absent inherited source events during focused tests as well as
the saved runner. This strengthens the prospective gates; no exposed failure
removed, no unknown condition converted to a positive.

Expanded focused rerun failed in 229.9s on nonking-pawn-move and its Black
reflection: c3c5 is an illegal double push from rank three, additionally blocked
by own king c4. Retain that exact root/move as nonking-pawn-original-illegal
refusal; use king d4 with legal pawn c3c4 for the intended nonking no-label gate.
No legality or nonking predicate changed. Already-started full/pilot evaluations
use that earlier fixture snapshot and their terminal outcomes must be retained.
Final gates will rerun the corrected complete fixture collection.

Previously started full suite terminated with the same two illegal-pawn fixture
failures after 394.8s; pilot likewise terminated at c3c5. Both terminal outcomes
retained; neither counted as passing final gates. Final error fixture reflection
now literally reflects every syntactically valid FEN/UCI refusal, preserving the
failed c6c4 Black root as well as c3c5 White; invalid syntax stays unchanged.
Malformed/mismatched histories remain literal and are never executed by reflector.
Cheap all-fixture geometry audit passed: 65 roots/130 cases, 64 direct legal-move
cases excluding intended refusals/foundation cases. This does not replace final
scientific tests or saved replay.

Corrected-source full suite passed in 362.6s, maintained source/diff passed; saved
pilot completed at source 05a145a in 569.079s with 5,182 cases/14 new witnesses.
Original pilot outputs remain in research/runs/E079/pilot. Ordered inheritance
audit then failed on two ordinary-illegal-black fingerprints: the new literal
error reflector had been applied to all prior fixture batches, replacing frozen
prior identical-error reflection with a different illegal move/error string.
Use frozen E078 reflector for every inherited batch and new reflector only for
this study's own fixture objects. No exact-hash requirement relaxed and no prior
result mutated; fresh ordered audit still required. Coach predicate unchanged.

Coverage audit found historical within-center/within-file-mirror fixtures begin
at c4/f4 outside registered core. Retain IDs/root/move with accurate entry display
name. Earlier RESULT within-center wording corrected: these were entries, not
core-to-core moves. Do not widen center definition. Separate guarded saved probe
independently proves genuine d4e4/d5e5 and Black reflections under identical source
proof, retained at research/runs/E079/development/genuine-within-center.json. Add
all four actual core-to-core directions with true file/color reflection, source
predicate unchanged; explicitly assert both from/to are core and frozen source
central-arrival attribute false. Rerun final full suite and expanded saved pilot.
No failed root removed or acceptance gate weakened.
