# E003 result: archived SF19 studies reproduce; both acceptance gates failed

State: complete. Outcome: inconclusive for the original improvement hypotheses;
exact numerical replay passes. Evidence maturity: retrospective development/
consumed-test evidence, not new confirmation.

Plan `defadd2`; replay implementation and raw input archives `8b433c9`.
Models were refitted from original training observations with current maintained
math. Both complete models and both complete development/test reports match the
original E001 snapshots exactly, including all paired bootstrap outputs.

| Original study / test scope | Candidate outcome log loss vs baseline | Outcome difference interval | Candidate choice log loss vs baseline | Choice difference interval | Original gate |
| --- | --- | --- | --- | --- | --- |
| Full curve: 25 games, 84 outcome observations, 25 choices | 0.647464 vs 0.674865 | -0.027401 [-0.145046, +0.057674] | 2.585752 vs 2.938201 | -0.352449 [-0.620665, -0.050200] | Fails: outcome uncertainty unresolved |
| Choice only: 25 different games, 72 outcome observations, 25 choices | 0.723465 vs 0.723465 (unchanged) | 0 [0,0] | 2.808278 vs 2.867358 | -0.059080 [-0.500243, +0.472324] | Fails: choice uncertainty unresolved |

Differences are candidate minus baseline; lower is better. Intervals preserve
the original 2,000 game-bootstrap resamples/seed18019 and are exploratory 95%
percentile intervals, not a new multiplicity-adjusted confirmation analysis.
Full-curve Brier error also improved numerically (0.208045 vs 0.212293), but
the joint original gate still failed. Both choice candidates beat uniform
likelihood numerically; that alone cannot satisfy the baseline comparison gate.

The choice-only development gain was -0.790947 nats per decision, compared with
-0.059080 on its consumed test sample. This difference is an observation, not
proof of overfitting, a fixed learning curve or the absence of a population effect.
No display aggregation or independent human quality/category target was assessed.

## Evidence and qualifications

- [inputs.json](evidence/inputs.json) records original compressed hashes and
  source provenance; two raw archives totaling 1,027,370 bytes are retained.
- [replay.json](evidence/replay.json) contains refitted models and reproduced
  original reports; [run.json](evidence/run.json) records code/input/output
  identity and environment.
- Two full numerical runs matched byte-for-byte. A separate source copy without
  `scratch/` or `calibration-runs/` inputs also reproduced the numerical output.
- All embedded game records match D001; legal-alternative/history checks and
  exact PV/bound checks pass. These validate retained data consistency, not
  every low-budget engine judgment or the original collection process.
- Legacy model sampling metadata says four choices per game, inherited from a
  shared fitter. Actual study counts are one selected choice in each of eighty
  training games. Numerical fitting is consistent with those actual eighty
  choices; the legacy description is inaccurate. It is preserved for exact
  replay and must not be copied as evidence of a larger sample.

No plan amendments, new searches, candidate changes or new holdout evaluations.
The original gates and models remain unchanged. The old public source flag about
test use predates these studies; D001's exposure ledger remains authoritative.

Decision: retain the narrow positive choice result and failed joint outcome gate
as separate claims; do not adopt either full model. Finding:
[F003](../../findings/F003-sf19-small-cohort.md).
Resume: archive verification is complete. Next needs a new hypothesis and richer
evidence; repeating the same small-cohort sigmoid/temperature fit is not a new
confirmation. Accuracy aggregation and move categories still require distinct
validity targets, and ratings need meaningful improvements/uncertainty evidence.
