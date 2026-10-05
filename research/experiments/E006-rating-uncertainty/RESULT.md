# E006: adaptive rating ranges do not improve useful precision

Completed 2026-10-05. Outcome: **no-improvement under the declared gates**.
Evidence: development. No promotion; B000 remains unchanged.

| Engine | Games / sides | Constant game coverage | Adaptive game coverage | Constant / adaptive mean width | Constant / adaptive interval score |
| --- | --- | --- | --- | --- | --- |
| SF18 | 1,400 / 2,798 | 89.86% | 89.43% | 1,472.27 / 1,477.69 | 1,653.99 / 1,651.75 |
| SF19 | 750 / 1,498 | 90.80% | 90.67% | 1,492.40 / 1,504.73 | 1,652.57 / 1,669.95 |

Coverage means **all retained players in the game** are inside their ranges;
single-side coverage is higher (about94–95%). The target is selected-cohort
recorded Lichess blitz rating, not FIDE Elo, stable strength or a confidence
interval for a player's true performance. Ranges are not clipped to a pool limit.

Constant minus adaptive mean-width differences are -5.42 [-13.18,2.47] for SF18
and -12.32 [-26.29,1.18] for SF19 (97.5% paired game percentile intervals).
Interval-score differences are +2.24 [-14.18,18.93] and -17.38 [-45.04,9.13].
Neither reaches the required5% reduction or resolves a positive gain. Constant
and adaptive methods both pass overall empirical coverage gates. Candidate
coverage lower bounds are87.50% /88.13%, above the85% gate.

**No side has adaptive half-width<=300 units**, so the frozen useful-precision
gate fails for both engines. Typical ranges span about1,500 rating units. This
is a result about the current nine-feature point model and this scale family;
it does not prove that all move-based rating methods are intrinsically this weak.

SF18's >=2500 recorded-rating subgroup has37 games and only72.97% coverage for
both methods, failing the80% subgroup guardrail. Other prespecified groups pass.
SF19's corresponding subgroup has21 games and is unresolved by the30-game rule;
its other groups pass. Overall coverage does not establish coverage for stronger
players or for a selected narrow-range subset. True-rating groups are diagnostics,
never inputs or prediction-time selectors.

Point MAE is329.31 /330.28; both interval methods share exactly the same points.
It differs slightly from E002 because the separate calibration partition leaves
three outer folds for fitting. Calibration counts by outer fold are SF18
302,287,245,258,308 and SF19 158,164,135,134,159. Quantiles use game maxima and
the finite-sample rank; both colors remain together. Two omitted sides follow
the unchanged >=10 nonforced-decision baseline rule (E001).

## Reproduction and limits

```sh
npm run research:preflight -- D001 --purpose train
node --test research/experiments/E006-rating-uncertainty/code/method.test.mjs
node research/experiments/E006-rating-uncertainty/code/evaluate.mjs --out research/runs/E006/replay
node research/experiments/E006-rating-uncertainty/code/verify.mjs --out research/runs/E006/verify
```

The canonical evidence is retained; replay writes elsewhere. Result and compressed
prediction hashes match exactly across two complete executions. Full computation
took about two seconds and no engine searches; retained evidence is under2 MB.
[Run](evidence/run.json) records exact revision, source/input/output hashes,
environment and guarded data eligibility. [Results](evidence/results.json)
include all point/scale/inner models, role IDs, calibration ranks and groups.
[Verification](evidence/verification.json) refits point/scale parameters from
the declared roles, reconstructs cross-fitted residuals and calibration game
maxima, and checks complete unique OOF coverage, bindings and interval metrics.
The initial verifier compared differently ordered ID lists; it now compares
canonical sorted sets. The evaluator/results required no numerical correction.

Theory/source scope is in [the plan](plan.md). Exchangeability and marginal
coverage do not imply conditional/future-population guarantees. Folds overlap
in fitting; bootstrap intervals describe paired development observations, not
uncertainty of the full fitting procedure. D001 is balanced by focal rating,
previously consumed and has legacy acquisition limitations. It cannot support
new confirmation, and this experiment cannot validate production uncertainty.

Next: stop this exact scale family. Build fully traceable fresh evidence for
new calibration hypotheses rather than repeating weak feature modifications on
D001. Human category reviews remain independently pending under E005.
