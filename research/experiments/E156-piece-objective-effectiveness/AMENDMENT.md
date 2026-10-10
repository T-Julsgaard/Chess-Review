# E156 development amendment

2026-10-10 after all three smoke hypotheses passed and 41/42 focused tests passed.
The fifty-move test expected a claim from initial clock97 followed by Rxa7/Nxa7.
Both captures reset the clock; actual clock1/reply2 correctly emitted the ordinary
objective finding. This was a false fixture hypothesis, not a detector failure.
`evidence/failure-clock.json.gz` retains the failing input, full raw result,
receipt, original plan/exposure/build and all then-current E156 source text/hashes.

Before the next check, replace that test with a genuine current-root starting
history at clock98 and no preceding moves. Actual quiet move reaches99 and
quiet opponent replies reach100, requiring claim suppression. This is an authored
negative control, not a reconstructed exchange history. No detector, policy,
budget, admission, positive fixture or acceptance rule changes. Existing six
panels and three smoke observations remain hash-compatible and reusable.

After 44 focused and two parent checks passed, the pilot orchestration stopped
on an obsolete `weaknessAnalysis` property copied from E153. No pilot output
was written; the subsequent replay attempt correctly reported missing output.
`evidence/failure-runner.json.gz` retains the error, then-current E156 sources
and full source closure hashes. Replace that property with pieceObjectiveAnalysis
before retrying the pilot. Detector, raw panels, controls and gates unchanged.
