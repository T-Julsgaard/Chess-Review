# E009: SF19 score and decision stability at a higher search budget

Registered2026-10-05 before E008 fitting/results and before E009 searches.
This is an operational development check, not a human-validity comparison.
The extension and its published calibration stay unchanged.

## Question and observations

How stable are current SF19 decision losses and displayed move quality when
the identical bundled engine/history/options receives80,000 rather than20,000
nodes? Higher-budget output is a comparison reference, not ground truth.
Reuse E008's registered20,000-node observations; do not recollect them.

Select30 D002 training and15 development validation games by the minimum
SHA-256 `E009-games-v1:` + game ID within each role. No score, rating, outcome,
target or E008 success/failure enters selection. Use each game's already frozen
E008 focal choice, unrestricted root and every legal restricted alternative.
Reserved300 games remain excluded. The45 games are development observations;
overlap with E008 is deliberate and disclosed. No model fitting occurs here.

80,000-node searches retain raw exact and final info, full history, Hash32,
one thread, MultiPV1, UCI_ShowWDL, cold reset and the exact E008 engine build.
Preserve the maintained harness's exact-recovery flags and earlier exact
iterations. Cache keys bind configuration/history/restriction. The collector
must first admit registered E008 evidence through the shared loader; unfinished
or unregistered partial caches cannot be resumed or consumed.

## Frozen measures and diagnostic gates

One choice per game, equal weight. Primary quantities at20,000 and80,000 nodes:

- Played CP expected-point loss and current SF19 move quality, using the
  published `sf19MoveQuality` rules, including top-move zero loss and mate signs.
- Played engine-WDL expected-point loss, with the same top-move rule.
- Whether the20,000-node best restricted legal alternative remains in the
 80,000-node best set. Sets include alternatives within0.001 fixed-CP expected
 points of the maximum. Exact equality of tied move sets is also reported.

Development stability screen:>=90% of choices have absolute CP loss drift
<=0.05 and>=90% have absolute WDL loss drift<=0.05; each95% Wilson lower bound
must be>=80%. Best-alternative overlap must likewise be>=90% with95% lower
bound>=80%. Mean absolute current displayed move-quality drift must be<=5
percentage points. These are engineering tolerances, not perceptual thresholds.
Passing does not validate a displayed percentage, categories, or latent strength.

Report every continuous drift, maximum/median/90th percentile, unrestricted
bestmove changes, root-versus-restricted negative residuals, mate transitions,
and selected-score/final nodes. Report own-rating, ply and baseline fixed-CP
point groups from E008's definitions; with<20 games a group is explicitly sparse.
No subgroup can silently change the overall gate or selection. No budget or
model tuning after these results. Any fitted E008-curve stability assessment
needs a separate frozen supplement; it is not this study's primary claim.

## Cost and reproducibility

Expected~1,500 searches,5–10 minutes; hard caps30 minutes/6,000 requests/5 MiB
compressed. Record observed cost; no network acquisition. Before the full run,
check two authored startpos searches at80,000 nodes and the selection/metric
mechanics. Do not fit on synthetic inputs or treat them as real-player evidence.

Register and commit complete raw evidence before assessment; register results
before verification/replay. Check every score/history/restriction/legal move,
matched coverage, fixed selection, and independent numerical reconstruction.
Successful replay proves numerical integrity only. Preserve negative results
and limitations in RESULT/findings. No production promotion is implied.
