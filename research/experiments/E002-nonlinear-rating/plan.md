# E002: small nonlinear rating features

Registered 2026-10-05, before candidate evaluation. Track: moves-only rating.
Source baseline B000; measurement contract `133ae7c`; evidence audit `a676bce`.
Dataset D001, train rows only: SF18 1,400 games / 2,798 sides; SF19 750 / 1,498.
No fresh confirmation is claimed. Existing rating outcomes are development data.

## Hypothesis and scope

A small nonlinear extension of the current nine board/search features improves
out-of-fold prediction of recorded public blitz rating relative to the fixed
current fitting recipe. It may capture interactions between observed error,
engine-top frequency and legal-choice complexity without any new engine searches.
This assesses archive rating-level prediction, not true strength, FIDE transfer
or the meaning of a single-game performance deviation.

## Models (freeze before evaluation)

- Fixed recipe: existing nine features and Huber/ridge settings, refitted inside
  each outer training fold: SF18 delta100/lambda1; SF19 delta250/lambda10.
  Do not test the already fitted production coefficients on their training rows.
- Simple comparator: median rating of outer training sides.
- Retuned comparator: same nine features; lambda in {1,10,100}, delta in {100,250}.
- Nonlinear candidate: same nine features plus `logRmsLoss^2`, `topRate^2`,
  `legalChoicesLog^2`, `logRmsLoss*topRate`, `topRate*legalChoicesLog`;
  same six lambda/delta settings as the retuned comparator. No further features.

All candidates reuse exact current engine-specific WDL observations and original
feature definitions. Fitting uses the maintained Huber implementation and its
training-only scaling. Tuning chooses minimum game-weighted MAE across three
inner folds, with grid order lambda ascending then delta ascending as tie-break.
Fit loss and unweighted side fitting match the current recipe; evaluation gives
each game unit weight, divided between retained sides. Log this minor mismatch.

## Splits and exclusions

Five outer folds from SHA-256 of `E002-outer-v1:` + minimum game ID in a
player-connected component, first eight hex digits modulo five. Inner folds use
`E002-inner-v1:` + the same component key modulo three. Both colors and all shared
players remain in one component. Assert no game or player leakage for each split.
All normalization and tuning occur inside outer training data. No outer targets
select a model or gate. Report fold counts and settings chosen in each fold.

Include all retained train sides with at least ten eligible decisions. Verify
input hashes using E001. Fail rather than silently drop invalid features or
nonconverged selected fits. No recorded ratings, identities, results, opponents
or band labels enter predictor features. Rating/IDs only serve fit targets,
grouping and reporting. D001 validation/test rows are not scored by E002.

## Gates and analysis

Primary, separately for SF18/SF19: nonlinear minus fixed-recipe out-of-fold MAE
must improve by at least max(25 rating units, 5% of baseline MAE), and the lower
bound for baseline-minus-candidate paired improvement must exceed zero.
Use 10,000 deterministic game-cluster percentile bootstrap resamples, seed
20261005 for SF18 and 20261006 for SF19, 97.5% two-sided intervals (Bonferroni
for two engine primary claims). These are development intervals, not independent
confirmation; candidate/gate choices are now frozen but data were used previously.

Report MAE/RMSE/mean bias/90th absolute error, paired improvement against median
and retuned comparators, and per-fold metrics. The retuned comparison is an
attribution ablation: do not attribute a gain to features if retuning alone
matches or beats it. Its intervals are secondary descriptive, not new primary
confirmatory claims. No more candidate families or repeated looks in this study.

Guardrails: identical eligible coverage; candidate 90th absolute error cannot
exceed baseline by over 25 units. Predeclared rating bands <1000, 1000-1499,
1500-1999, 2000-2499, >=2500 and decision counts 10-19,20-39,40+: for groups
with at least thirty games, MAE deterioration must be <=50 and absolute mean
bias deterioration <=25 units. Sparse groups reported as unresolved. Candidate
inference must add no engine searches and average under 0.5 ms per side in a
10,000-side warmed local benchmark; timing is environment-specific.

Entire available training cohorts are used for a cheap development screen.
No power assertion: uncertainty and gate failure may yield an inconclusive
result. Any shortlisted candidate requires a new locked cohort and independent
replay before promotion, with confirmation sample size based on paired variability.

## Reproduction and budget

```sh
node research/experiments/E002-nonlinear-rating/code/evaluate.mjs --smoke
node research/experiments/E002-nonlinear-rating/code/evaluate.mjs
node --test research/experiments/E002-nonlinear-rating/code/*.test.mjs
```

Node.js 24, no new dependencies, network collection or engine searches. Smoke
uses the first fifty training games per engine, never substitutes for full
metrics and writes only under ignored runs. Budget: five minutes local fitting,
under 2 MB retained outputs/models/predictions; repeat once for deterministic
replay. Store code revision, input/output/config hashes and exact outer predictions.
Numeric replay tolerance 1e-10 on identical input bytes; record actual equality.
Stop on a pipeline/fit failure and repair with a logged amendment; do not change
features or acceptance based on model outcomes.

## Amendments

None at registration.
