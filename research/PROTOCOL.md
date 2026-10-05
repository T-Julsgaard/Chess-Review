# Research protocol

## Verify eligibility and provenance before use

Follow [DATA_POLICY.md](DATA_POLICY.md) before starting/resuming a research goal
or collecting, inspecting or using game data. Every source must be explicitly
public and free to use under documented compatible terms. Missing or ambiguous
permission prohibits all uses, including derivatives and cached models. Run the
preflight and use the guarded loader; retain its eligibility receipt per run.

Trace every game to its source and every result to hash-bound inputs, acquisition
records, transformations, selection/split decisions and exact method revisions.
Retain independent replay evidence and state any unverifiable historical steps.
Source eligibility and byte integrity do not prove scientific validity or confer
permission to inspect locked labels. Confirmation still requires the controls
below; no result is universally proven by a successful preflight.

## Define the claim first

Each experiment names one question, the target population, the baseline and
candidate, and a falsifiable hypothesis. State what the output is intended to
measure. An engine-derived statistic, a probability, a displayed percentage,
archive rating level and stable playing strength are different targets.

Before the decisive evaluation, commit a dated plan with the primary metric,
direction, minimum practically meaningful improvement, uncertainty method,
sample-size rationale, subgroup guardrails and resource budget. Declare candidate
searches, tuning, stopping rules and secondary metrics. Do not choose these from
the test result. Log every deviation, its timing and impact on the claim.

## Own the data and splits

- Register datasets with provenance, license, immutable hashes, selection rules,
  exclusions, identities, target definitions and all prior evaluation use.
- Keep both colors, positions and augmentations from a game in one split. Use
  player-disjoint splits for new-player claims; use an appropriate time split
  for future-game claims. Specify the grouping/overlap policy before collection.
- Separate training, tuning/development and locked confirmation sets. Existing
  public validation and training folds are development data. Holdout exposure
  includes manual inspection, candidate selection and stopping decisions.
- Record who or what may access confirmation labels, the freeze revision and
  every evaluation. Once inspected or used to choose changes, that set cannot
  confirm a revised candidate; record consumption and obtain fresh evidence.
- Keep the locked baseline and candidate on identical eligible observations.
  Report missingness, exclusion counts, abstentions and coverage for both.
  Never improve a headline by silently dropping difficult cases.

## Assess the appropriate target

| Track | Required distinction | Possible metrics to select in the plan |
| --- | --- | --- |
| Accuracy | Validate outcome/choice models separately from the meaning and aggregation of a displayed accuracy percentage. Define an external usefulness/validity target; the candidate's own engine loss cannot be its sole ground truth. | Outcome log loss/Brier and calibration; legal-choice log loss; independent quality/usefulness assessment; sensitivity to length/easy moves/search budget. |
| Moves-only rating | Define the platform/pool/time control and distinguish recorded rating prediction from latent strength and single-game performance. Exclude target-rating predictors. | MAE/RMSE against a declared rating target; calibration by rating band; interval coverage/width; sample-length and out-of-domain behavior. |
| Contextual rating | Quality-distribution prediction and final rating adjustment are separate claims. Compare against retaining recorded rating and relevant training-only predictors. | Peer-distribution CRPS; independent predictive value and calibration of the final adjustment against a declared target. |
| Categories | Define our own educational rubric before annotation. Blind reviewers to candidate/baseline labels, retain individual ratings and conflict reasons. Engine rules can establish tactical properties, not human consensus by themselves. | Paired agreement, macro-F1, per-class precision/recall, disagreement and abstention/coverage; rare-class uncertainty and instructional assessment. |

These are options, not preselected pass thresholds. An experiment must choose
metrics and numerical gates before evaluation. If independent human reviewers
or suitable data are unavailable, document that limitation; synthetic fixtures
and model-generated labels can check mechanics but cannot establish independent
human validity.

## Compare fairly and quantify uncertainty

Freeze the current implementation and include simple training-only baselines.
Assess paired differences on the same games. Account for dependent observations
with the declared unit (game, player or another defensible cluster); positions
and both sides are not independent samples. Report units, weights, effect sizes,
intervals and the baseline/candidate denominators, not only significance or
correlation. Plan how multiple candidates, metrics and repeated looks are handled.

Inspect predeclared subgroups and guardrails, including failures and fallbacks.
Keep exploratory subgroup discoveries explicitly exploratory. Measure engine
sensitivity and runtime cost separately from model quality. Store engine/build
hashes, NNUE, budget, options, reset, history, perspective, mate/WDL handling and
restricted-root settings; a higher-budget oracle is not automatically an
independent human target. Never silently transfer coefficients between engines.

## Preserve and reproduce

Keep a minimal rerun command from the repo root, dependency versions, seeds,
configuration, source revision and input/output hashes. Store raw observations
separately from transformations; document deterministic replay tolerances and
the variability expected from fresh searches. A second clean replay checks the
pipeline; confirmation on untouched observations checks the scientific claim.
Both are required before labeling a finding confirmed.

Commit sufficient evidence or an immutable, accessible retrieval/rebuild recipe.
Document collection/search cost and cache keys. Maintain only one canonical
result record per experiment. Record unsuccessful approaches, numerical/search
failures and missing data as evidence rather than discarding them.

## Conclusions and promotion

Use `improved`, `no-improvement`, `inconclusive` or `invalid` as the outcome.
Failure to resolve a small effect is inconclusive, not proof of equivalence.
Use these separate evidence levels:

- `exploratory`: hypothesis generation or inspected/uncontrolled observations.
- `development`: a declared comparison that informs candidate selection.
- `confirmed`: a frozen candidate passes predeclared practical and uncertainty
  gates on untouched, appropriate evidence, with a clean reproducibility replay.

A finding must state the exact supported claim, scope and remaining limits.
Confirmation is evidence under those conditions, not universal proof. Summarize
both useful failures and successes in findings; link their experiment evidence.

Before adoption, prepare a promotion record with supported claims, final-test
exposure history, independent replay, baseline comparison and subgroup guardrails.
Name exact algorithms/parameters/files to adopt, excluded parts, remaining risks,
dependencies, latency/storage cost, regression tests, cache/schema migrations,
fallbacks and rollback. Prefer small independently supported changes; a bundled
experiment does not justify every component without attribution/ablation evidence.

Research success does not authorize production changes. An implementation task
must explicitly select a promotion, update the active model/methodology and its
public reproduction evidence, run applicable extension checks, and record the
implementation commit and release status. Preserve failed and superseded findings.
