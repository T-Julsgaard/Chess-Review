# E015: verified unresolved rating-choice gain; primary gates fail

2026-10-05. [The protocol](plan.md) fixes one monotone affine temperature model,
global/uniform comparators, training-only fitting/folds, a 150-game development
likelihood screen and subgroup/convergence/coverage checks. This is contextual
peer-choice research, not an estimated-rating adjustment or fresh confirmation.

Previous E014 work is completed and locally committed. The one frozen performance assessment is complete. Five authored study tests pass: identifiable endpoint odds,
constant/decreasing/flat/cap controls, training-only/unique-ID rules, stable
vectors/mates/anchors, balanced folds/ownership and full independent
likelihood/optimality/prediction/gate checks with tampering rejection. An unused
draft helper had a syntax error in the first test invocation; removed before
real data access or any fit. Three source-replay tests pass, including recording
mixed-EOL representation before fitting and rejecting archive text edits.

Implementation uses the protocol's derivative/bracket tolerances; independent
first-order supporting inequalities at the three feasible triangle vertices
have tolerance 1e-5 (gradient error scaled by the 1000-unit parameter range).
The source-bound freeze and candidate code were committed as 1b63e37 before
the twelve prescribed fits. Keep both blinded packs and B000 scoring fixed. The
broad research goal remains active.

Guarded freeze completed: 450 train, 150 development, five balanced training
folds and 45 cached budget pairs. Actual engine configs/source/cohort/origin
hashes are retained. The freeze had zero fits/performance assessments and preceded training.

## Training complete; development assessment pending

All twelve train-only models completed (terminal exit 0) and independently
checked: final 450-game pair and five 360-game omitted-fold pairs. All numerical
convergence checks pass, no upper-cap optimum or rating clipping. Final global
temperature 15.464491662877617; candidate betaLow 0, delta/betaHigh
32.59543170030444, anchors [100,3000]. The lower endpoint is an allowed active
constraint, not a forced positive intercept. Training objective comparisons
served optimization only; no candidate validation/OOF metrics were examined.

Models and fit receipt were registered/committed in 6e32fdc before the one
performance screen.
The existing 150 development games remain exposed development evidence, not
fresh confirmation. No new searches, human labels or reserved-target use.

## Single frozen performance screen

Plan 9925e26, code/input freeze 1b63e37 and trained models 6e32fdc precede
the one assessment (terminal exit 0). Complete 450 omitted-fold / 150
development choices and 45 budget pairs are retained; no new fits/searches,
human labels, reserved-target evaluation or case replacement in scoring.

**Primary development gates fail; rating-context benefit is unresolved.**

| Paired comparison | Mean gain (nats / choice) | 97.5% game interval | Meaning |
| --- | ---: | --- | --- |
| Development global minus candidate, n=150 | .00114922 | [-.04383280, .04243666] | Below .02; interval includes zero |
| Cross-fit global minus candidate, n=450 | .02316114 | [-.02401839, .07449177] | Nonnegative mean guard passes; uncertain conditional gain |
| Development uniform minus candidate, n=150 | 1.03572331 | [.77762645, 1.28751150] | Both simple-comparator gates pass |

Coverage, convergence/cap, nonnegative cross-fit mean and all sufficiently
large subgroup harm guards pass. Sparse subgroup validity remains unresolved.
The 450 cross-fit interval conditions on overlapping fold fits; it is not
training-fit uncertainty or independent evidence for a future population.

The secondary 45-case probability-vector TV mean is global .08378902 versus
candidate .09061219. Paired reduction -.00682316, interval
[-.01454019,.00020554]; no resolved stability improvement. TV <= .1 occurs
in 28/45 global versus 26/45 candidate (Wilson lower 47.6299% / 43.3008%).
This diagnostic was not a primary gate or refitting trigger. Preserve it as
an adoption limitation, including the 30 training / 15 development composition.

Do not claim that rating never predicts choice, that an Elo estimate improved,
or that the candidate is equivalent to global. This fixed monotone recipe on
absolute CP utilities has no resolved development gain at the practical
threshold. It uses every legal alternative; cached evaluation cost does not
establish a cheap extension implementation or deployed latency.

The complete report/predictions/run were registered and committed in bdaeff5
before verification. Exact model refit, all predictions/report and independent
raw-score equations/KKT/gates pass. Clean replay from external archive
bdaeff5ce6ee8b2f8c3e07195394048060a4fbe6 passes with no Git metadata, ignored
inputs, new dependencies, network or engine searches. Archive SHA
fed818aaa7269ea03f0795f9b37c800d7e001f42d974b0f0620d805c6ed2365a. Source representations were
recorded before fitting; exact original checkout bytes are reconstructible.
Twelve initial fits plus twelve deterministic refits in each verifier/replay
are retained as reproduction, not additional candidate trials. No rescue refit
or promotion. B000 and both human packs are fixed.

## Verification and resume

All eight authored checks, source verification and local links pass. All handles
(freeze, fit, evaluate, verify, clean replay) are terminal. Independent evidence
covers 600 choice vectors, five fold ownership checks, twelve optimality checks,
45 budget pairs and 40,000 fixed bootstrap replicates.

Development global/candidate/uniform mean NLL: 2.39040465 / 2.38925543 /
3.42497875. Omitted-fold means: 2.44233009 / 2.41916895 / 3.31758254. All
cross-fit groups have >=30 games. Development sparse groups: fixed-points <.1
(11), >.9 (18), rating <1200 (18), >=2000 (23). Worst sufficiently large group
gain is -.02184263 cross-fit and -.02794844 development, within the -.05 guard.
Original fitting took ~1.238s and scoring ~.108s, excluding guarded provenance/
raw-history reconstruction. No deployed all-legal collection latency measured.

All small retained artifacts are registered under D002, within the 2 MiB cap:
[freeze](evidence/freeze.json), [freeze receipt](evidence/freeze-run.json),
[models](evidence/models.json), [fit receipt](evidence/fit-run.json),
[result](evidence/results.json), [predictions](evidence/predictions.json.gz),
[assessment receipt](evidence/run.json), [verification](evidence/verification.json),
[clean replay](evidence/clean-replay.json), [archive recipe](evidence/clean-archive.json).

```sh
node --test research/experiments/E015-rating-choice-context/code/study.test.mjs research/source-replay.test.mjs
node research/experiments/E015-rating-choice-context/code/run.mjs verify --out research/runs/E015/replay
```

Finding: [F013](../../findings/F013-unresolved-rating-choice-context.md). Stop
this exact monotone rating-temperature recipe. Next review the relevant source
literature and register a relative-CP choice utility comparison: a distinct
premise about position opportunities, not another rating-temperature fit.
No fresh confirmation, final estimated rating/adjustment or human category
validity is established. The broad research goal remains active.
