# E004 result: context gains below the practical threshold

Completed 2026-10-05. Outcome: **no-improvement under the declared gate**.
Evidence: development. Both engines fail; no confirmation or promotion.

| Engine | Games / positions | Scalar log loss | Candidate log loss | Improvement, 97.5% game interval |
| --- | --- | --- | --- | --- |
| SF18 | 1,400 / 8,437 | 0.641908 | 0.635448 | 0.006460 [0.000339, 0.012720] |
| SF19 | 750 / 4,525 | 0.642802 | 0.632853 | 0.009950 [-0.000444, 0.020144] |

Neither improvement reaches the frozen 0.01 threshold; SF19 also fails the
positive lower-bound requirement. Brier scores improve, all twelve prespecified
subgroups per engine have >=30 games and pass deterioration limits, coverage
matches, and fitted slopes remain nonnegative. A small positive development
effect is compatible with these results; failure is not proof of zero benefit.

Static context explains most of the gain. Additional phase/strength improvement
over static context is 0.000613 [-0.001672, 0.002818] for SF18 and 0.001489
[-0.002344, 0.005381] for SF19. Neither resolves a positive added effect.
Do not credit rating-difference/color gains to phase/strength interactions.

Raw WDL outcome log loss is 2.472432 / 2.754980, versus scalar 0.641908 /
0.642802. Quantized engine probabilities include exact zero/one; raw loss uses
1e-12 clipping and fitted inputs use 0.0005 clipping as registered. This large
comparison is sensitive to extreme probability handling. It is not evidence
that the elaborate candidate is needed or that current displayed accuracy is
wrong. This study evaluates actual game points at selected roots, not alternative
move consequences, human choices, rating estimation or instructional labels.

All selected fits converged. Mate exclusions: SF18 155; SF19 72. Two baseline
rating sides remain omitted for <10 nonforced decisions (E001). Selected later
plies are absent in shorter games; each retained game has unit weight. No new
engine searches. Full execution took about fourteen seconds; retained output
is under the 2 MB budget. Two complete runs produce identical result and
compressed prediction hashes. The verifier reconstructs unique coverage, player
folds, inputs, fit counts, predictions and metrics from guarded original data.

## Reproduce and resume

```sh
npm run research:preflight -- D001 --purpose train
node --test research/experiments/E004-practical-outcomes/code/model.test.mjs
node research/experiments/E004-practical-outcomes/code/evaluate.mjs
node research/experiments/E004-practical-outcomes/code/verify.mjs
```

Evidence: [results](evidence/results.json), [run and eligibility receipt](evidence/run.json),
[verification](evidence/verification.json), compressed per-position predictions.
Method: [plan](plan.md), [implementation](code/evaluate.mjs).
The D001 manifest registers result/prediction ancestry for reuse. Hash-matched
replay may change elapsed time, revision and eligibility receipt as policy records
evolve; numerical files must match. D001's legacy provenance and exposure prevent
new confirmation claims.

Policy integration: the first evaluation used the hash-bound guarded policy
while its separate installation change was in progress. After that change was
committed as `3170d07`, a complete additional replay and verification passed
from committed source with the same numerical hashes. No policy bypass or
additional dataset was used.

Next: stop this exact interaction family. Investigate uncertainty for rating
estimates and independently assess category constructs. A narrower calibration
study would need a new registered comparison with robust extreme-probability
handling and fresh evidence before promotion.
