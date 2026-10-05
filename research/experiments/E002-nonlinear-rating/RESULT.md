# E002 result: small gain below the practical adoption threshold

State: complete. Outcome: no-improvement under the predeclared practical gate.
Evidence maturity: development. The candidate has a small measured improvement;
this outcome does not assert zero effect or equivalence.

Plan revision `0c646f4`; evaluation code `db2f4f7`. D001 train observations only,
five player-disjoint outer folds with three inner tuning folds, both colors
kept together. Fixed recipes were refitted inside folds; published coefficients
were not evaluated against their own training targets. No new engine searches.

| Engine / observations | Fixed recipe MAE | Retuned MAE | Nonlinear MAE | Fixed minus candidate, rating units (97.5% interval) | Required gain |
| --- | --- | --- | --- | --- | --- |
| SF18: 1,400 games / 2,798 sides | 328.476 | 327.980 | 323.985 | 4.491 [1.528, 7.377] | 25 |
| SF19: 750 games / 1,498 sides | 330.164 | 330.815 | 326.693 | 3.471 [0.079, 6.906] | 25 |

Both engines fail the practical gate. Uncertainty, eligible coverage, overall
tail error and predeclared subgroup deterioration gates pass. SF19's >=2500
group contains only 21 games and remains unresolved by the thirty-game subgroup
rule. The nonlinear-minus-retuned comparison gives a small gain too (SF18 3.996,
SF19 4.122 units); retuning alone does not explain all of the observed difference.
These are descriptive development comparisons, not independent confirmation.

The median comparator's MAE was 450.511 for SF18 and 455.852 for SF19. This
provides useful scale for the refitted current recipes, but does not confirm the
deployed model's future/general-population error. Pool selection was balanced
by focal rating and is not representative of all public blitz games.

Candidate inference added no searches and averaged about 0.012 ms per side in
the local warmed benchmark, below the 0.5 ms gate. Actual timings vary; see the
run record rather than treating this as a browser/device performance guarantee.
Two complete runs produced byte-identical results and compressed predictions.

Evidence: [results.json](evidence/results.json) contains models, tuning grids,
fold metrics, paired intervals and subgroups; [run.json](evidence/run.json)
contains code revision, environment, commands, hashes and benchmark. Exact
outer predictions are retained in `evidence/predictions.json.gz`, reconstructible
from public inputs without ignored runs or network access.
The independent [verification record](evidence/verification.json) checks all
stored outer prediction bindings, train-only scaler parameters and player
separation. Recheck it with `node research/experiments/E002-nonlinear-rating/code/verify.mjs`.

## Important diagnostic and limits

Fixed-recipe conditional bias is large at rating extremes: SF18 <1000 averages
about +381 units, 2000-2499 about -340, >=2500 about -556. SF19 exhibits the same
direction. This diagnostic was predeclared by band, but an explanation or cure
was not tested. Conditional shrinkage can occur when one game's features are
ambiguous; simply reversing it may worsen overall prediction. Do not claim
that this experiment measures a player's stable strength or validates the
single-game performance convention. E002 did not estimate uncertainty intervals
for individual ratings or validate contextual rating adjustments/categories.

No deviations or tuning changes after inspection. A fifty-game smoke preceded
the full frozen comparison, with its outputs kept in ignored runs. All fits
converged. Fitting retained the current side-weighted objective while evaluation
gave each game equal weight, as declared; two games had one eligible side.

Decision: do not promote this nonlinear family. Preserve it as a cheap negative
development finding [F002](../../findings/F002-small-nonlinear-rating.md).
Resume: numerical study is complete; next replay the archived SF19 accuracy
studies, then test uncertainty/opportunity-aware alternatives under a new plan.
Fresh confirmation and independent category judgments remain outstanding.
