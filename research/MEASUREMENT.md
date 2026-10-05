# Measurement contract v1

Drafted 2026-10-05 before new candidate evaluation. These are research design
choices, not findings or changes to the published extension.

## Outputs and targets

| Output | Proposed meaning | Evidence needed | What is insufficient |
| --- | --- | --- | --- |
| Move quality | Preservation of practical expected game points relative to available alternatives, with search uncertainty | Outcome calibration on human games; root-consistent alternatives; stability against independent budget/build checks | Treating a low-budget engine as infallible; fitting and evaluating against the same derived loss |
| Game accuracy | A bounded summary of decision quality that remains interpretable across game lengths and opportunity difficulty | Validate the underlying outcome/choice model; then assess aggregation stability and independent instructional/quality judgments | A good likelihood alone does not identify the correct percentage transform |
| Moves-only rating | Rating level whose decision profile is compatible with the observed game in a declared pool | Player-disjoint out-of-sample rating prediction, conditional bias and uncertainty; later repeated-game assessment | Calling archive blitz-rating prediction FIDE Elo or established true strength |
| Contextual rating | A declared performance deviation from recorded rating, conditional on the opportunities in this game | Validate peer distribution first; validate deviation against independent subsequent/repeated performance targets, beyond recorded-rating baseline | Predicting the reviewed recorded rating while using that identical value as input |
| Ordinary categories | Ordinal descriptions of the consequence of a decision, with documented tactical context | Our rubric, blinded independent judgments and per-class behavior; tactical fixtures for mechanics | Matching another site's bands or labels |
| Special annotations | Explanations of properties such as sacrifice, uniquely important choice, or missed opportunity | Verifiable board/search properties plus independent perception/instructional assessment where the claim concerns people | Equating engine-best with brilliance or using generated reviews as independent human evidence |

## First numerical development gates

Choose an experiment-specific target and freeze its rule before running.
Initial minimum effects are engineering decision thresholds, not literature
constants: 0.02 nats per decision for choice log loss; 0.01 per observation for
outcome log loss with no Brier deterioration; 25 rating units or 5% (whichever is
larger) in MAE for rating prediction; 0.03 macro-F1 for label agreement with no
coverage loss. A candidate must also have a paired interval favoring it. Adjusting
a threshold requires a dated rationale and fresh decisive evaluation.

These gates shortlist candidates, not certify a displayed scale or latent
strength. Report subgroup error/coverage, tails and bias alongside the headline.
For numerical experiments use the same eligible games for all models; preserve
both colors and dependence between repeated players. Keep engine-specific models.
Category studies additionally require a rubric/reviewer protocol before labels.

## Rating features and evaluation policy

The moves-only predictor must not receive recorded ratings, IDs, results,
opponent ratings or sample-selection bands. IDs may define disjoint folds only;
bands may define reporting groups only. All scaling, imputation, fitting and
hyperparameter selection belong inside training folds. Include a training-only
median predictor. Assess both the deployed model (where truly held out) and the
current recipe refitted within folds; a deployed model tested on its own training
rows cannot serve as an out-of-sample baseline.

Use player-connected components when both sides of games are evaluated: every
game linked by a shared player stays in one fold. Record component sizes and
fold balance. A tiny component count or a giant component may require a new
dataset rather than pretending ordinary game folds are player-disjoint.

## Research basis and applicability

- [Regan and Haworth, Intrinsic Chess Ratings (2011)](https://cse.buffalo.edu/~regan/papers/pdf/ReHa11c.pdf)
  models decisions in the context of available alternatives and maps fitted skill
  parameters to ratings. This motivates testing opportunity-aware features;
  those experiments and their historical engine do not establish our validity.
- [Tang et al., Maia-2 (2024), abstract/version 2](https://arxiv.org/abs/2409.20553v2)
  treats human behavior as dependent on skill. This motivates skill-stratified
  assessment and separating imitation from decision quality. We have not adopted
  its model, data or reported performance as an acceptance benchmark.
- [Zaidi and Guerzhoy, move brilliance (2024), abstract](https://arxiv.org/abs/2406.11895)
  studies human perception separately from optimal play. This supports requiring
  perception evidence for aesthetic claims; it does not supply our label rubric.
- [Glickman, Glicko-2 specification (2022)](https://www.glicko.net/glicko/glicko2.pdf)
  includes rating deviation and volatility. We infer that uncertainty should be
  explicit in our own single-game assessment; its formulas are not a validated
  uncertainty model for move-based predictions.
- [Lichess public database](https://database.lichess.org/) provides CC0 game
  archives. It is a data source, not a target scoring system. Our retained
  archive frame hashes verify local inputs, not entire monthly archives.

Read scope: Regan paper/model sections, Glicko-2 specification, the two named
abstracts and database documentation. These sources motivate hypotheses, not a
comprehensive literature review or proof. Future experiments should extend the
relevant source review, then test against our baseline with independent evidence.
