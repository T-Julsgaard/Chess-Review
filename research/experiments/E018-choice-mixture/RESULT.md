# E018: choice mixture — working record

State: running. Development evidence; training fitted, performance assessment pending.

Test a convex mixture of regular, fixed twice-temperature and uniform choice
probabilities. The comparator temperature is fitted first on training, then
held fixed for the two-weight fit. [The plan](plan.md) fixes the recipe, caps,
mate/forced handling, ownership, gates and proof requirements.

Protocol commit: `b1cf36d`. Eleven synthetic/source-binding checks pass, covering
known interior/edge optima, degenerate components, stable complete/log-space
probabilities, forced choices, training/fold ownership, independently computed
KKT/calibration/mate groups and tampered model/report fields. A rounded-uniform
fixture distinguishes floating-point ties from material gains. The guarded
freeze binds complete cached queries, roles, components, mate groups and source
representations; the earlier signed-log utilities are not used for scoring.

Source/cohort freeze commit: `f17a935`, before all twelve fits. Independent global
derivatives and conditional candidate objectives/gradients/simplex supporting
inequalities pass; all fits converge, with no component temperature cap or active
simplex bound. Final beta15.464491662877617; sharper beta30.928983325755233.
Weights: regular .1756693745415215, sharper .7358466683400607, uniform
.0884839571184178. These are distribution coefficients, not human mental states.
Training objective2.440913→2.268933 is a fitting diagnostic, not assessment.

Next: register/commit fitted models, then perform the single frozen assessment.
Reuse 600 focal choices and 45 budget pairs. No new searches, human labels or
consumed test targets. Production scoring is B000.
