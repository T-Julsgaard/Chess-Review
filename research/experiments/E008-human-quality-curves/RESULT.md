# E008: verified CP development gain; WDL candidate fails

2026-10-05. State: complete. Outcome: improved, evidence level: development. The CP
candidate passes the registered joint development gates; WDL fails. No fresh
confirmation, displayed-accuracy validation or production promotion yet.

## Result

450 train /150 development games, SF19 at20,000 configured nodes. Outcome
assessment excludes54 mate roots jointly, retaining3,640 roots in600 games.
Each game has unit outcome weight; one score-blind legal choice per game.
All legal alternatives are retained; coverage matches every candidate.

| Development metric | Fixed CP | CP refit | WDL refit |
| --- | --- | --- | --- |
| Outcome log loss |0.705194|0.665799|0.679834|
| Outcome Brier |0.236432|0.226111|0.232328|
| Legal-choice log loss |2.390405|2.324883|2.674774|

CP outcome gain0.039395,97.5% paired game interval[0.011472,0.070397]; choice
gain0.065521,[0.022158,0.112435]. Both practical/uncertainty gates, Brier,
matched coverage, fit-interior and adequately sized subgroup guardrails pass.
Sparse subgroups remain unresolved. CP is the sole development shortlist.

In particular, rating<1200 has19 outcome /18 choice games; rating>=2000 has
26/23, both below30. Extreme-point choice groups have11/18 games. Their
conditional behavior is unresolved, even though the overall screen passes.

WDL outcome gain0.025360,[-0.005235,0.061286] is unresolved; choice gain
-0.284370,[-0.383670,-0.177482] is deterioration. Joint/choice/subgroup gates
fail. Preserve this negative result; do not promote or retune on this validation.

Frozen train-only parameters: CP slope0.22349935786891822 per pawn, choice
inverse temperature20.939735269175777. Fixed-CP auxiliary temperature is
15.464491662877624. WDL coefficient0.16514509156690166, temperature
13.353740343925672. These are probability/choice primitives, not a new validated
display formula, game aggregation, rating model or category rubric.

## Collection and provenance

Plan `f47409d`, collector `e26d865`, evaluation/checks frozen before metrics.
Full collection terminal77316 exited0:23,584 unique searches,23,706 requests,
69 compatible reuses,1,794 seconds,4,453,580 compressed bytes; zero fits during
collection. Complete registered raw evidence committed in `1dc3283` before fit.
The two-game smoke had81 searches/82 requests and passed mechanics only.

8,372 searches retained an earlier exact iteration because final info had a
bound;122 unrestricted searches used the maintained harness's exact recovery.
Selected/final nodes range245–20,106: configured budget does not guarantee that
every selected score consumed20,000 nodes. Raw exact/final info and flags are
retained. No score-based exclusions or silent substitutions were made.

Evidence: [observations](evidence/sf19-observations.json.gz),
[collection receipt](evidence/collection-run.json), [results](evidence/results.json),
[predictions](evidence/predictions.json.gz), [fit receipt](evidence/run.json).
All are registered D002 derivatives with guarded eligibility. The D002 archive
prefix and unknown provisional-status limits remain; reserved300 games were not
searched, fitted or assessed. The extension remains B000.

## Verification and next action

[Verification](evidence/verification.json) reproduces exact reports/predictions
and independently checks fit stationarity,10,920 outcome predictions,1,800
choices and equal-game metrics. No new engine searches. The
[clean replay](evidence/clean-replay.json) from external archive `4858da5` passes
the same checks, without `.git`, network, ignored inputs or dependencies;
[archive recipe/hash](evidence/clean-archive.json) is retained. Numerical
verification is separate from scientific confirmation. See [F006](../../findings/F006-fresh-human-curves.md).

Reproduce `code/verify.mjs` with optional `--out research/runs/E008/replay`.
For clean replay, extract the recorded archive recipe externally and run
`research/clean-replay.mjs E008 <archive-commit-SHA>` from its root.
Do not rerun collection or fit a revised candidate on these validation results.

E009 is independently collecting a fixed45-game higher-budget diagnostic from
this cache. A positive CP development screen needs locked fresh confirmation,
candidate search stability and separate display/aggregation evidence before
adoption. E005 human review remains pending and does not block numerical work.
