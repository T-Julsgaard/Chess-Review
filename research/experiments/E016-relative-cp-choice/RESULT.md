# E016: relative CP choice — working record

State: complete. Outcome: no-improvement. Evidence maturity: development.
The single assessment fails; independent/exact/clean verification passes.

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
| Development mean NLL (lower is better) | Comparator 2.390405; candidate 2.756898; uniform 3.424979 |
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

Descriptive development Brier worsens .797054 to .885680; five-bin top-choice
calibration error worsens .116826 to .276426. The candidate's lowest-confidence
bin contains 133/150 choices with mean top probability .071347 and observed top
selection .345865. These fixed diagnostics do not select a replacement model.
Five sufficiently large development groups fail the -.05 harm guard; all four
development tail rating/root-point groups are sparse. Eight of nine cross-fit
groups fail. No CP is clipped among 19,359 low-budget / 1,555 high-budget
alternatives; mates number 443/74. Failure applies to this complete recipe,
including fixed sign-only mate handling; attribution to a component needs a
separate prospective ablation.

Assessment commit: `1d38183`. Exact twelve-fit refitting and every retained vector,
report and diagnostic reproduce. Independent raw CP/mate parsing, derivatives,
fold ownership, calibration/Brier, 40,000 bootstrap replicates and 45 budget pairs
verify. External archive `1d381837aba976aa83c69faa96927da68f73dcb0`, SHA
`3f8f5891fb3813d072a281ac54be5a0dcc5f21a0e301f6700a545d750df6c42a`, passes
exact refit/replay without Git metadata, ignored inputs, network or dependencies.
Prefit source representations bind mixed-newline equivalence without permitting
code changes. Twelve original fits plus twelve verification refits in each
checkout/archive run are deterministic reproduction, not new candidate trials.
Initial fitting 1.163 seconds and scoring .119 seconds exclude guarded provenance
reconstruction. Retained evidence totals 681,547 bytes, below the 2 MiB cap.
Zero new engine searches/human labels/consumed test assessments.

[F014](../../findings/F014-linear-cp-choice-failure.md) retains the decision.
Evidence: [freeze](evidence/freeze.json), [models](evidence/models.json),
[results](evidence/results.json), [predictions](evidence/predictions.json.gz),
[verification](evidence/verification.json), [clean replay](evidence/clean-replay.json)
and [archive recipe](evidence/clean-archive.json).

Next: register a signed-log CP utility comparison, using
`sign(cp)*log1p(abs(cp)/100)` before softmax centering. Freeze bounds, scale,
mate handling and gates before fitting; keeping sign-only mates would isolate
the CP transformation while retaining its limitation. This is a new hypothesis,
not an evaluated replacement. Eventual confirmation requires fresh D003.
Current scoring remains B000. Human reviews remain pending.
