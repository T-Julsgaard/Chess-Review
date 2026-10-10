# E149 development disclosure, 2026-10-10

After the registered smoke and first48focused checks, before corrected checks:
45passed,3failed. The equal-initial-groups history correctly emits no recorded
minority-plan label, but does emit the separately registered structural-health
label: own b5/c3 pawns have adjacent files, so neither is isolated despite their
rank separation. The test's blanket no-label expectation was wrong. Correct its
expected structural-only label; retain the minority-plan absence assertion.

Two adversarial tests assigned already-empty arrays and thus did not mutate
anything. Change them to nonempty false isolation lists. These are test repairs;
no claim, gate, detector or collected raw panel changes. Exact initial test
source and failure details retained in evidence/development-failure.json.
Initial ten raw panels remain compatible and are reused without recollection.

Before boundary-case evaluation, clarify group identity: the newly available
capturing pawn must itself belong to the counted wing, and the recorded own
recapturing pawn must start and finish on that wing. Otherwise contact can come
from an unrelated group across the d/e boundary. This tightens the intended
same-group causal scope, leaves all observed pilot hypotheses unchanged, and
does not alter raw collection. Add an outside-wing contact negative control.
