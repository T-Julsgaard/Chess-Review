# F012: restricted chosen-move repair fails the joint consistency screen

2026-10-05. Outcome: **no improvement under the joint gates**, with a narrower
SF19 numerical gain. Development evidence; no promotion. Source:
[E014](../experiments/E014-root-pair-consistency/RESULT.md).

The candidate adds a restricted search of the unrestricted root's final chosen
move and compares its engine-WDL points with the equally restricted played
move. The baseline uses unrestricted-root versus restricted-played points,
including zero loss when the engine chose the played move. The reference is
the maximum over all legal restricted moves at that same requested budget.
It measures conditional finite-search consistency, not independent tactical
truth, human quality, displayed accuracy or playing strength.

The complete prior panels contain 40 SF18 enriched D001 training cases and
45 SF19 D002 focal choices (30 train, 15 development). Their differing selection
prevents a paired cross-engine claim. Plan `de22e91`, candidate/freeze `4a89e30`
and single-result `be9d584` preserve the pre-assessment sequence. No new searches,
fits, labels, replacements or reserved D002 target evaluations occurred.

| Engine / nodes | Baseline mean error | Candidate mean error | Paired gain, 98.75% interval |
| --- | ---: | ---: | --- |
| SF18 / 20k | .0059375 | .0188000 | -.0128625 [-.0487875, .0071375] |
| SF18 / 80k | .0036750 | .0063500 | -.0026750 [-.0164500, .0040500] |
| SF19 / 20k | .0111222 | .0013444 | .0097778 [.0000333, .0297778] |
| SF19 / 80k | .0101222 | .0047556 | .0053667 [.0008000, .0143000] |

Units are WDL expected-point loss errors. SF19 reductions of 87.91% and 53.02%
pass the >=25% gate and fixed paired-game interval gate. SF18's observed mean
errors increase and its intervals contain zero; neither numerical gate passes.
The SF19 20k lower bound is only .0000333, and all bootstrap intervals remain
approximate estimates conditional on these exposed samples.

Candidate cross-budget loss stability <= .05 occurs in 35/40 SF18 games
(87.5%, Wilson lower 73.8879%) and 38/45 SF19 games (84.4444%, lower 71.2161%).
Both fail the >=90% point / >=80% lower-bound gate. Mean drift increases by
.0116125 for SF18, exceeding .01, and .0050111 for SF19, within that guard.
Both engines' average candidate drift is higher than the baseline's.

All games/alternatives remain covered. False-near-best/query guards pass. SF18
baseline near-best agreement is 40/40 at both budgets, versus candidate 39/40
and 40/40; SF19 agreement improves from 43 to 44 and 40 to 43 of 45. The chosen
restricted move can still score below another restricted alternative: 9/5 SF18
and 7/6 SF19 cases at 20k/80k. Re-searching the chosen move is not an all-legal
maximum and can understate the played move's finite-search loss.

Intended candidate queries increase about 21–30% in these panels, at most three
per position versus two. Observed recovery requests are counted separately.
No deployed latency was measured; zero actual new searches were required for
the study. Equal requested budgets still yield earlier selected exact scores
and different score-bearing nodes, preserved in the reports.

The earlier E012/E013 diagnostic used raw root-minus-played loss without the
published scoring rule's `top` zero-loss exception. E014 includes that exception.
Earlier raw diagnostic discrepancies therefore do not establish an actual
published grading error. This study also uses engine WDL rather than the
published engine-specific CP/human-outcome curves.

Exact replay and independent raw-score arithmetic, confusions, summaries,
intervals and gates pass for all 85 games / 170 comparisons. The first clean
archive stopped at mixed-EOL source byte differences, before candidate replay.
A strict recorded/archive/canonical-digest and newline-range binding preserves
exact recorded byte reconstruction. Fresh external archive bb87254869e086f4b00e74f2fc915af1b444273c
passes exact and independent replay without Git metadata, new dependencies,
network, ignored inputs, fits or searches. The original failed replay is
retained; no candidate results or gates changed. Retained
[SF18 report](../experiments/E014-root-pair-consistency/evidence/results-SF18.json)
and [SF19 report](../experiments/E014-root-pair-consistency/evidence/results-SF19.json)
keep every paired comparison, subgroup, error, bootstrap and failed gate.

Do not promote a universal repair or claim human/rating/accuracy improvement.
Retain SF19's conditional gain with its stability failure, and do not treat
the successful engine/subgroup as a rescue of the registered joint hypothesis.
Future retries need a changed premise and fresh broader positions. Continue
distinct numerical research while both blinded human review packs await review.

[SF18 verification](../experiments/E014-root-pair-consistency/evidence/verification-SF18.json),
[SF19 verification](../experiments/E014-root-pair-consistency/evidence/verification-SF19.json),
[SF18 clean replay](../experiments/E014-root-pair-consistency/evidence/clean-replay-SF18.json),
[SF19 clean replay](../experiments/E014-root-pair-consistency/evidence/clean-replay-SF19.json)
and the two archive recipes bind the source/config/cohort/code/results.
Next register a distinct rating-conditioned legal-choice likelihood hypothesis.
It tests peer choice prediction, not a final estimated-rating adjustment, and
does not retry the failed F002/F004 target families.
