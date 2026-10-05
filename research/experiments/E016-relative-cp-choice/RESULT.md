# E016: relative CP choice — working record

State: running. Evidence maturity: development; training fitted, assessment pending.

The question is whether linear CP gaps predict human legal choices better than
the fixed sigmoid utility. Both models use the same alternatives and one fitted
temperature. [The frozen plan](plan.md) specifies mates, caps, split ownership,
gates, calibration and stability diagnostics before any performance look.

Implementation and synthetic mechanics checks pass: scalar odds, CP translation
invariance, caps/mates/forced moves, fit boundaries, training ownership,
independent calibration arithmetic and complete independent report reconstruction.
The guarded freeze binds 600 focal choices, five balanced training folds and 45
budget pairs. Exact shared source representations are retained before fitting.

Protocol commit: `5aa7e82`. Source/cohort freeze commit: `396566b`.
All twelve scalar fits converge with independent objective/derivative checks;
none reaches a numerical cap. Final training temperatures: comparator
15.464491662877617; linear CP 52.71675871488209 (0.26358379357441045 per pawn
inside the fixed CP bounds). Training objective is worse for the candidate;
this is a fitting diagnostic, not the held-development assessment.

Next: register/commit fitted models, then perform the single frozen assessment.
Zero new engine searches or human labels. No consumed test targets are evaluated.
Current scoring remains B000. Human reviews remain pending.
