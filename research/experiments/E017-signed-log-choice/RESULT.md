# E017: signed-log choice — working record

State: running. Development evidence; training fitted, performance assessment pending.

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

Next: register/commit models, then perform the single frozen assessment on
450 omitted-fold / 150 validation choices and 45 budget pairs. No new searches,
human labels or consumed test targets. Current scoring is B000.
