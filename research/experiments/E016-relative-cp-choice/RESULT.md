# E016: relative CP choice — working record

State: running. Evidence maturity: development; no models fitted or results yet.

The question is whether linear CP gaps predict human legal choices better than
the fixed sigmoid utility. Both models use the same alternatives and one fitted
temperature. [The frozen plan](plan.md) specifies mates, caps, split ownership,
gates, calibration and stability diagnostics before any performance look.

Implementation and synthetic mechanics checks pass: scalar odds, CP translation
invariance, caps/mates/forced moves, fit boundaries, training ownership,
independent calibration arithmetic and complete independent report reconstruction.
The guarded freeze binds 600 focal choices, five balanced training folds and 45
budget pairs. Exact shared source representations are retained before fitting.

Next: register/commit the input and code freeze, then fit on training only and
commit models before evaluation. Zero new engine searches or human labels.
Current scoring remains B000. Human reviews remain pending.
