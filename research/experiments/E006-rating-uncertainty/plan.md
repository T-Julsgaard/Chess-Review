# E006: game-calibrated intervals for moves-only rating

Registered 2026-10-05 before fitting or inspecting interval metrics. Track:
moves-only rating uncertainty. D001 train only; development evidence. New
premise beyond F002: improve honest uncertainty, not retry its point features.

## Target and population

Predict compatible **recorded Lichess blitz rating** from a single game's move
profile in the selected archive cohort. A range is not a confidence interval
for latent strength, FIDE Elo or a causal performance rating. Current runtime
has a point estimate and no validated prediction interval for this target.
Compare candidate interval adaptation with a simple constant-width calibrated
interval; retain the same point predictor and eligible sides for both.

Use SF18/SF19 retained train rating rows, >=10 nonforced decisions as B000.
Both sides stay together. Existing D001 players are unique across games; assert
this rather than claiming the calibration works for repeated-player clusters.
Reject nonsingleton player components in this design. Report omitted baseline
sides, cohort selection, historical exposure and provenance limitations.

## Frozen fitting, calibration and folds

Five outer folds: E001 player components, SHA-256 `E006-outer-v1:` plus minimum
game ID, first eight hex digits modulo five. For test fold k, calibration is
(k+1) modulo five; fit uses the other three folds. Three inner scale folds use
`E006-scale-v1:`. Each side's point model training settings are the fixed B000
recipe: nine E002 base features, Huber SF18 lambda1/delta100 or SF19 lambda10/
delta250. Refit scaling and coefficients only on the fit partition. Do not
reuse published coefficients fitted on these targets. Require convergence.

Comparator: symmetric interval point +/- q, q from calibration **game maxima**
of absolute residuals. Candidate: point +/- q*s(x), calibrating game maxima of
absolute residual/s(x). Target 90% simultaneous coverage of all retained sides
in a new game; the finite-sample quantile is order statistic
ceil((calibration games+1)*0.9), with infinite radius if rank exceeds sample size.
Do not treat two players as two independent calibration samples.

Candidate scale is a ridge lambda10 fit to log1p(abs residual) from three-fold
cross-fitted point predictions within the fit partition. Its predictors are
decisionsLog, contestedFraction, legalChoicesLog, topRate, logRmsLoss and the
training-only point prediction. Exponentiate minus one and clamp to [50,1000]
rating units. No outcome, own/opponent recorded rating, identity, selection band
or future information enters point/scale predictors. Targets may train the
models and calibration quantile but may not serve as prediction-time features.
No tuning grid; no post-result feature search. Store training and calibration
IDs, scales, diagnostics, quantiles and OOF intervals. Do not clip endpoints to
plausible pool ratings: artificial clipping can obscure missing coverage.

## Gates and reporting

Per engine, adaptive intervals must reduce game-weighted mean width by >=5%
and improve mean 90% interval score by >=5%, with positive 97.5% paired game
bootstrap lower bounds for both differences (10,000 draws, seeds20261025/26;
two-engine claims). Interval score is width plus 20 times distance outside the
interval. Both methods require observed simultaneous game coverage >=0.88;
candidate bootstrap lower coverage bound >=0.85. These are empirical development
gates, not a claim that conditional/future-population coverage is guaranteed.

Report per-fold coverage/width, side coverage, point MAE, median/90th-percentile
width, and calibration sample counts/ranks. Prespecified groups: recorded rating
<1000,1000-1499,1500-1999,2000-2499,>=2500; decision counts10-19,20-39,40+;
predicted rating<1200,1200-1999,>=2000. Group coverage means all selected group
sides within a game are covered. At >=30 games, adaptive coverage must be >=0.80
and no more than0.03 below constant coverage. Sparse groups remain unresolved.
True-rating groups diagnose failures only; they cannot select intervals at use.

Practical usability guardrail: >=25% of sides must have adaptive half-width<=300,
and the subset must have >=30 games with simultaneous subgroup coverage>=0.85.
This is an engineering threshold declared before results. Narrow-subset coverage
is assessed separately; marginal conformal coverage does not establish it.
Report this selection's fraction and actual coverage even if the gate fails.

## Validity, cost and replay

Split conformal's exchangeability assumption and marginal coverage differ from
conditional guarantees; see [Angelopoulos/Bates §§1,2.3,3](https://arxiv.org/html/2107.07511v6).
The [Oliveira et al. abstract](https://jmlr.org/papers/v25/23-1553.html) motivates
caution about nonexchangeability. We do not implement or claim its corrections.
This archive screen is balanced by focal rating and previously consumed; five
rotated evaluations are dependent. Game bootstrap describes paired development
variation, not the uncertainty of the complete cross-fitting algorithm or a
new-population coverage guarantee. Fresh locked evidence and clean replay are
required before any confirmation/promotion.

Use the guarded D001 loader and retain eligibility/input/code/output hashes.
No engine searches/network. Synthetic tests check finite-sample rank, game
dependence, leakage, scaling, interval score and coverage. Smoke fifty games per
engine to ignored runs; full budget two minutes and <2 MB retained evidence.
Commit plan and code before decisive evaluation. Replay numerical files exactly;
timing/revision/receipt may differ. Preserve earlier records when replaying.

Next: run the frozen study; retain useful and unsuccessful findings equally.
