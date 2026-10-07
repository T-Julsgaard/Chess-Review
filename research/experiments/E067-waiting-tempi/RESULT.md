# E067: waiting tempi — development incomplete

2026-10-07. Research only; no extension, numerical work, pushes or shutdown.
Protocol committed 6142524 before pilots. Existing source/branch/checkouts reused.

A working opt-in prototype and independent history/frame replayer implement
separate Waiting move and Reserve tempo contracts. Both require a legal quiet
move preserving an existing all-defense mate-in-two opportunity on an explicit
legal hypothetical pass, with no immediate mate originally available. Reserve
additionally requires legal live removed-pawn frames proving the mating material
does not need that pawn. These conditions prevent ordinary quiet moves or
missed immediate mates receiving a useful-tempo label.

Two guarded locally authored pilots found no positive: 326 legal king/queen roots
(226 eligible), and 1,135 knight-assisted roots (682 eligible). Searches are
limited, exposed development evidence; zero hits do not prove impossibility.
Observed summaries and exact search recipes retained. No proof gate relaxed.
18 focused negative/default/budget/domain checks pass; maintained source/diff
and pilot syntax checks pass. No positive replay certificate has been obtained.

This study is NOT verified or complete. Cumulative/final source freeze, positive
tamper tests, complete runner/tracker, independent saved-proof replay and exact
main/repeat/clean reproduction still required. Original list and E066 cumulative
tracker unchanged: 291 verified names, 337 verified original entries.
Do not integrate this unfinished study into shared main.

[Queen pilot](evidence/pilot-queen.json), [knight pilot](evidence/pilot-knight.json),
[protocol](PLAN.md), [exposures](EXPOSURE.md).
Reproduce development searches:
`node research/experiments/E067-waiting-tempi/code/pilot-queen.mjs`
`node research/experiments/E067-waiting-tempi/code/pilot-knight.mjs`
Focused checks: `npm run research:coach-tests -- E067`.

Next: broaden locally authored king/material contexts under the existing gates
to seek separate positive waiting-move and removed-pawn reserve certificates.
Retain any further empty/failed outcomes; if no sound positive emerges, report
inconclusive and select another unimplemented concept rather than mark verified.
