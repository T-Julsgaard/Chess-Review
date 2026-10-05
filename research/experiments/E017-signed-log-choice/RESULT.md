# E017: signed-log choice — working record

State: complete. Outcome: inconclusive benefit; acceptance gates fail.
Evidence maturity: development. Independent/exact/clean verification passes.

Test whether fixed signed-log CP scaling predicts human legal choices better
than the sigmoid comparator. Both have one train-only temperature, complete
paired alternatives and identical sign-only mate handling. The new mate-position
harm guard and all other rules are frozen in [the plan](plan.md).

Protocol commit: `7c56836`. Eleven synthetic/source-binding checks pass, covering
known log values, symmetry/monotonicity, shrinking contextual gaps, mates/caps,
forced moves, fit bounds, training ownership and independent report/calibration
and mate-group arithmetic. Scalar fitting/probability machinery is reused from
the frozen E016 module; its raw-linear utility is not used by the candidate.

Source/cohort freeze commit: `ffa1396`, before all twelve scalar fits. Every fit
converges and passes independent objective/derivative checks; no upper cap is
active. Final temperatures: comparator 15.464491662877617; signed-log candidate
23.816457262191143. Training objective is worse for the candidate; this remains
a fitting diagnostic, not the held-development assessment.

Model commit: `e1a2d56`, before the single frozen performance look.

| Fixed comparison/check | Result |
| --- | --- |
| Development paired gain, >=.02 and positive 97.5% lower bound | .012107 nats; interval [-.049058,.077830]; fails both |
| Development mean NLL | Comparator 2.390405; candidate 2.378297; uniform 3.424979 |
| Training cross-fit mean gain, >=0 | -.044678; interval [-.109923,.013941]; fails |
| Development gain over uniform | 1.046681; interval [.833912,1.260743]; passes |
| Paired coverage/numerics | 450/150/45; all twelve fits converge without upper cap; pass |
| Predefined sufficiently large subgroup harm | Fails; sparse groups unresolved |
| Mean 20k/80k TV drift, descriptive | Comparator .083789; candidate .083407 |
| Paired drift reduction, descriptive | .000382; interval [-.011407,.011655]; unresolved |
| TV <=.1, descriptive | 28/45 comparator; 32/45 candidate, Wilson lower .566315 |

The small positive development point estimate is not evidence of a resolved
improvement. Cross-fit and subgroup failures remain with it. Stop this exact
signed-log recipe; no offset/bounds/temperature rescue refit follows the result.

Five cross-fit groups fail the -.05 mean-harm guard: both root-point tails,
mate positions, late plies and the middle rating band. Eligible development
groups meet it, but five groups are sparse. Mate-position cross-fit gain is
-.380341 over 43 games; development gain is +.248287 over only 20 games, too
sparse for its guard. Non-mate gains are -.009215 over 407 cross-fit games and
-.024228 over 130 development games. Opposite mate-group signs and sparse
development support limit the positive aggregate point estimate; these fixed
subgroups do not justify a new fitted branch or causal attribution to mates.

Descriptive development Brier .797054→.802422 and top-choice calibration error
.116826→.151813 worsen. Cross-fit Brier .809793→.817409 worsens; cross-fit
calibration error .133113→.132935 changes little. No uncertainty or superiority
claim is attached to these descriptive changes. No CP clipping occurs among
19,359 low / 1,555 high alternatives; mates number 443/74. The sign-only mate
policy and ignored mate distance remain limits of the whole recipe.

Assessment commit: `13c4d9f`. Twelve exact refits, 600 probability vectors,
45 budget pairs and every report field reproduce. Independent raw CP/mate/log
utilities, fit derivatives, mate/fold ownership, calibration/Brier, all subgroup
guards and 40,000 bootstrap replicates verify. External archive
`13c4d9f978df24bfca1adcd93befa90e8869ac63`, SHA
`2d2eb25745eae4466e684f144653f474e65e48831bb4a3307eb06b28f76546ec`, passes
exact refit/replay without Git metadata, ignored inputs, new dependencies,
network or engine searches. Source representations recorded before fitting
bind newline equivalence without permitting code changes. Verification refits
reproduce the fixed candidate, not additional trials or performance looks.
Initial fitting 1.192 seconds, scoring .124 seconds, excluding guarded provenance
reconstruction. Retained evidence 713,000 bytes is below 2 MiB.

[F015](../../findings/F015-unresolved-signed-log-choice.md) retains the decision.
Evidence: [freeze](evidence/freeze.json), [models](evidence/models.json),
[results](evidence/results.json), [predictions](evidence/predictions.json.gz),
[verification](evidence/verification.json), [clean replay](evidence/clean-replay.json)
and [archive recipe](evidence/clean-archive.json).

Next: register a different choice-distribution family: a convex mixture of the
global comparator, a fixed sharper distribution and uniform choices. Freeze
the components, training sequence, weight constraints and gates before fitting;
the premise is variable choice dispersion, not another CP-curve adjustment.
No such mixture is fitted here. Fresh registered D003 is needed for eventual
confirmation. No new searches/human labels/consumed test targets; scoring is B000.
