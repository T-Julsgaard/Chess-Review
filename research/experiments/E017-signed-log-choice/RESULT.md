# E017: signed-log choice — working record

State: running. Outcome: inconclusive benefit; acceptance gates fail.
Evidence maturity: development. Independent/exact/clean verification pending.

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

Next: commit the assessment, verify all vectors/diagnostics independently, refit
exactly and replay from a clean external archive. No new searches, human labels
or consumed test targets. Current scoring is B000.
