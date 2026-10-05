# E004: practical outcome calibration from fixed-node WDL

Registered 2026-10-05 before candidate results. Tracks: accuracy primitives and
contextual quality. D001 train only; no extension change or fresh confirmation.
New premise beyond F003: substantially more outcome observations, both colors,
move-number/strength interactions, and constrained monotonic calibration of WDL
instead of repeating the small-cohort centipawn sigmoid recipe.

## Target and distinction

Predict the actual game points (win1/draw0.5/loss0) of the player to move from
the original-root best WDL statistic and pregame context. This evaluates human
outcome prediction, not causal consequences of alternative moves, a displayed
accuracy percentage, human move labels, stable strength or the final contextual
rating adjustment. WDL calibration can be a useful quality primitive, but needs
separate restricted-move/choice evidence before adoption for move loss.

Both engines use their own existing 20,000-node/Hash32 observations. This is not
a direct comparison with SF18's depth16 centipawn accuracy model, nor a claim to
replace SF19's centipawn display formula. The current rating-quality primitive
uses raw WDL expected points; calibrating that quantity against human outcomes
is the concrete baseline question. Report additional benefit over a simple
training-fitted calibration, not only an easy gain over raw engine confidence.

## Population and observations

Take original-root `bestExpected` at predeclared plies 10,11,30,31,50,51,70,71
from retained rating-side evidence. Include forced choices for outcome prediction
(unlike accuracy aggregation). Exclude rows with bestMate != null for all models;
mate/terminal policy requires a separate study. Report short-game absence, omitted
rating sides and mate counts. Each game has unit total weight across retained
selected positions, including both colors.

Metadata-only inventory before registration: SF18 8,437 finite-WDL positions in
1,400 games, 155 mate positions excluded; SF19 4,525 in 750 games, 72 excluded.
No new candidate outcome metrics inspected. This balanced focal-rating archive
cohort is development evidence, not a representative population sample.

## Frozen models and tuning

Let x=logit(clamp(bestExpected,0.0005,0.9995)), t=clamp(ply/80,0,1),
s=clamp((mean recorded rating-600)/2400,0,1), d=clamp((own-opponent rating)/400,-3,3),
c=+1 for White to move and -1 for Black. Predict sigmoid(linear combination).

- Raw comparator: original WDL expected points, clipped only at 1e-12 for log loss.
- Scalar calibration: x with one nonnegative coefficient, no intercept.
- Static-context ablation: x (nonnegative), d and c (unconstrained).
- Phase/strength candidate: x*(1-t)*(1-s), x*(1-t)*s, x*t*(1-s), x*t*s
  with four nonnegative coefficients, plus d and c (unconstrained).

The candidate is monotone in engine expected points at any fixed context, and
color complementing negates the logit. The s/t weights sum to one. Move number
is only a phase proxy; no actual material or clock features are being claimed.
Recorded ratings are legitimate context for outcome prediction, not predictors
for moves-only rating. Without ratings this candidate's domain is unsupported;
scalar fallback must be evaluated separately before any production proposal.

Fit weighted fractional Bernoulli likelihood with L2 penalty on coefficients;
lambda grid {0.1,1,10}. All models use the same training-only coordinate Newton
optimizer with nonnegative constraints, objective backtracking and projected
gradient convergence tolerance 1e-7 per game, maximum 1,000 sweeps. Record fit
diagnostics; fail rather than silently score an unconverged selected model.

Five player-component outer folds from SHA-256 `E004-outer-v1:` + component's
minimum game ID, first eight hex digits modulo five. Three inner folds from
`E004-inner-v1:` modulo three tune each family's lambda by game-weighted log loss,
ties choose smaller lambda. No outer targets select models. Components preserve
both colors/repeated players; use the E001 component helper and assert overlap.
Do not score D001 validation/test targets.

## Primary gate and guardrails

For each engine, candidate must reduce out-of-fold game-weighted outcome log
loss by >=0.01 relative to scalar calibration, and the paired game-cluster
bootstrap lower improvement bound must exceed zero. Use 10,000 resamples,
seeds20261015/20261016, 97.5% two-sided percentile intervals for the two engine
primary claims. Brier error must not worsen; coverage must be identical. Report
raw and static-context comparisons and do not attribute a static-context gain
to the phase/strength interactions without the ablation evidence.

Predeclared groups: plies10/11,30/31,50/51,70/71; mean ratings <1200,1200-1999,
>=2000; WDL<0.1,0.1-0.9,>0.9; White/Black. At >=30 games per group, candidate
log loss deterioration vs scalar must be <=0.03 and Brier deterioration <=0.01.
Sparse groups are unresolved. Report calibration bins and squared point loss.
All coefficients/features must preserve monotonicity and color-complement symmetry.

Use the entire available cohort as a development screen; no power claim from
previously used data. Paired dispersion will inform a new locked confirmation
cohort if a candidate passes. One frozen family/grid, no further outcome-driven
feature search in E004. No inference about display scaling/category validity.

## Cost, reproduction and source basis

```sh
node research/experiments/E004-practical-outcomes/code/evaluate.mjs --smoke
node research/experiments/E004-practical-outcomes/code/evaluate.mjs
node --test research/experiments/E004-practical-outcomes/code/*.test.mjs
```

Node.js24; no dependencies, network or engine searches. Smoke on fifty games
per engine writes only ignored runs. Full budget ten minutes fitting, under
2 MB retained summaries/predictions. Commit code before full evaluation. Record
input/output/code hashes, split/tuning settings and numerical convergence. Repeat
complete numerical evaluation with tolerance1e-10; actual byte equality reported.

Sources reviewed for hypothesis design: [Regan/Haworth](https://cse.buffalo.edu/~regan/papers/pdf/ReHa11c.pdf)
on alternative-context skill models; [Chowdhary et al. abstract](https://arxiv.org/abs/2207.07780)
on skill-dependent behavior. We infer contextual calibration may help; neither
source validates this specific candidate. Existing B000 method separates engine
WDL from fitted human-outcome curves. Own data will test the hypothesis.

Amendments: none at registration.
