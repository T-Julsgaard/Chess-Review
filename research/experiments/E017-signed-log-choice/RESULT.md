# E017: signed-log choice — working record

State: running. Development evidence; no fits or performance assessment yet.

Test whether fixed signed-log CP scaling predicts human legal choices better
than the sigmoid comparator. Both have one train-only temperature, complete
paired alternatives and identical sign-only mate handling. The new mate-position
harm guard and all other rules are frozen in [the plan](plan.md).

Protocol commit: `7c56836`. Eleven synthetic/source-binding checks pass, covering
known log values, symmetry/monotonicity, shrinking contextual gaps, mates/caps,
forced moves, fit bounds, training ownership and independent report/calibration
and mate-group arithmetic. Scalar fitting/probability machinery is reused from
the frozen E016 module; its raw-linear utility is not used by the candidate.

Next: register/commit the guarded input and exact source freeze before training,
then retain models before the single assessment. Reuse 600 choices / 45 budget
pairs; no new searches, human labels or consumed test targets. Scoring is B000.
