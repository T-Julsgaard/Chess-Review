# E010: stability of the frozen CP candidate's probability distributions

Registered2026-10-05 after E008/F006 and the E009 assessment; before computing
candidate budget sensitivity. Operational development study, no new engine
searches, no fitting and no extension change. Reuse registered E008/E009 data.

## Changed premise and bounded hypothesis

E009's overall screen failed: raw WDL loss and fine-grained best-alternative
sets were unstable, although fixed-CP loss tolerance/current mean display drift
passed. Exact best-set stability is different from stability of a full softmax
choice distribution. E008's flatter CP curve already improves both human
likelihood targets in development. Test whether that frozen useful curve also
reduces the probability mass that changes when search budget increases.
This is a new, explicitly post-E009 hypothesis. It cannot supersede E009's
failed rank/WDL gates, establish human truth, or count as fresh confirmation.

## Frozen comparison and cohort

E008 candidate: slope0.22349935786891822 per pawn, inverse temperature
20.939735269175777. Comparator: fixed slope0.368208, temperature
15.464491662877624. Copy exact model objects from registered E008 results into
a hash-bound freeze artifact; register/commit it and code before assessment.
Neither model is refitted at80k or on the45 observations. No WDL candidate retry.

Use all45 E009 games (30 train /15 development), the exact E009 hash/role
selection and E008 focal choices. No score-driven subset or new cases. Every
legal alternative has matched20k/80k observations under the same bundled SF19
Lite build, options, reset and full history. Preserve earlier exact scores and
exact-recovery flags. D002 reserved300 games remain untouched. Training overlap
is disclosed: this operational check is not an out-of-sample human comparison.

## Measures, uncertainty and gates

For each model and budget, map restricted alternative CP scores through its
curve (mate sign0/1) and normalize softmax probabilities over every legal move.
Primary per-game total variation is one half the sum of absolute changes in
those probabilities. It measures changed probability mass, not rank identity.

Candidate stability screen, all gates required:

- Mean total-variation reduction vs fixed comparator>=5% of comparator mean,
  with positive95% paired game bootstrap lower bound (10,000 resamples,
  seed20261039). Fixed models; one focal choice per disjoint game.
- Candidate total variation<=0.10 in>=90% of games,95% Wilson lower>=80%.
- Candidate unrestricted-root expected-point drift<=0.05 in>=90% of games,
 95% Wilson lower>=80%. This focal root is not E008's full outcome-root panel.

Report baseline/candidate drift distributions, worst cases, coverage, actual
played-choice log-loss drift as a secondary descriptive measure, and role/
rating/ply/baseline-point groups. With<20 games a group remains sparse; no group
changes the overall gate. No human-predictive improvement is inferred from
budget drift alone. E008's separate development gain prevents claiming that an
arbitrarily uniform but uninformative predictor is a useful stability success.
No displayed percentage, game aggregation, rating estimate or category claim.

## Reproduction, limits and stopping

Guarded D001/D002 admission, retained eligibility receipts, exact code/input/
output hashes and explicit parent lineage. Validate every legal history/query/
score/role via the existing verified binding checks before assessment. Retain
all45 cases; mismatches fail the run rather than dropping cases. Independent
equations and a clean offline replay are required for a finding. A passing
screen still needs frozen fresh likelihood confirmation and separate display/
aggregation/human category evidence before any production proposal.

Budget: zero engine/network requests, under5 minutes/1 MiB new retained evidence.
Synthetic vector/mate/tie/role checks precede the single real assessment. No
tuning or repeated candidate search after the result. Log failures/deviations.
