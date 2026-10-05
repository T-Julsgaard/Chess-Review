# E016: relative CP choice — working record

State: running. Outcome: no-improvement. Evidence maturity: development.
The single assessment fails; independent/exact/clean verification is pending.

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

Fitted-model commit: `24d724c`, before the single assessment.

| Frozen check | Result |
| --- | --- |
| Development paired NLL gain, >=.02 and positive 97.5% lower bound | **-.366494** nats; interval [-.537153,-.196215]; fails both |
| Training cross-fit mean gain, >=0 | -.700633; interval [-1.082447,-.399710]; fails |
| Development gain over uniform | .668081; interval [.554149,.792108]; passes |
| Paired coverage and numerical checks | 450/150/45; all fits converge without upper cap; pass |
| Predefined subgroup harm | Fails; sparse groups remain unresolved |
| Mean 20k/80k vector drift, descriptive | Comparator .083789; candidate .044294 |
| Paired drift reduction, descriptive | .039495; 97.5% interval [.020116,.057610] |
| Vector drift <=.1, descriptive | Comparator 28/45; candidate 41/45, Wilson lower .792664 |

The candidate predicts human choices worse while changing less across search
budgets. That operational improvement does not justify adoption. No refit or
rescue is authorized by the plan; stop this exact linear CP recipe.

Next: commit the assessment, reconstruct all predictions/diagnostics independently,
then refit/replay from a clean external Git archive and retain the finding.
Zero new engine searches or human labels. No consumed test targets are evaluated.
Current scoring remains B000. Human reviews remain pending.
