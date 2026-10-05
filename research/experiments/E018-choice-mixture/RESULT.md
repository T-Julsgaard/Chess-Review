# E018: choice mixture — working record

State: complete. Inconclusive development benefit; acceptance fails; all proof checks pass.

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
simplex bound. Final beta 15.464491662877617; sharper beta 30.928983325755233.
Weights: regular .1756693745415215, sharper .7358466683400607, uniform
.0884839571184178. These are distribution coefficients, not human mental states.
Training objective 2.440913→2.268933 is a fitting diagnostic, not assessment.

Training-model commit: `ce8aeb5`, before the single performance look.
Development paired NLL gain +.052790 clears .02, but its 97.5% game interval
[-.023540,.125292] includes zero. Acceptance fails. Cross-fit gain +.171879
[.083508,.278388] and development gain over uniform +1.087364
[.814214,1.358888] pass their specified guards. Coverage, numerical checks
and all sufficiently large predefined subgroup mean-harm guards pass;
sparse subgroups remain unresolved. These are exposed development results,
conditional on fitted models; no study-series-wide confirmation follows.

All eligible cross-fit/development subgroups meet the -.05 mean-harm guard.
Development has five unresolved sparse groups: root-point tails (11/18 games),
any mate alternative (20) and rating tails (18/23). Mate-position gains are
+.685541 over 43 cross-fit games / +.013964 over 20 development games;
ordinary-CP gains +.117610 over 407 / +.058763 over 130. Sparse development
support does not resolve mate benefit, and neither subgroup establishes a cause.

Descriptive Brier improves .809793→.791523 cross-fit / .797054→.789195
development. Five-bin top-choice calibration error improves .133113→.075168 /
.116826→.083644. These descriptive changes have no superiority intervals.
No CP clipping is used, and no observed CP exceeds 100 pawns among
19,359 low / 1,555 high alternatives. Mates number 443/74; sign-only utilities
ignore mate distance. Complete alternatives are required by this recipe.

The operational budget diagnostic worsens: mean complete-vector TV drift
.083789→.114492 over 45 pairs; paired reduction -.030703
[-.046763,-.015884]. TV<=.1 counts fall 28/45→21/45. This secondary result
does not change the frozen primary gate but matters for eventual use.

Assessment commit: `fce4225`. Twelve exact refits, 600 probability vectors,
45 budget pairs and every report field reproduce. Independent raw sigmoid/
mate probabilities, conditional weight objectives/gradients/simplex supporting
inequalities, global derivatives, ownership, Brier/calibration, every subgroup
and 40,000 bootstrap replicates verify. External archive
`fce42257a13bff5e60d29d82d9ccccf7e4b3d9f9`, SHA
`cab7fe6e500cc92f663e3b036e8c9418ba6552d943816c58cca0eee6985352e9`,
passes without Git metadata, ignored inputs, dependencies, network or engine
searches. Prefit source representations bind exact checkout bytes across
newline differences. Verification refits reproduce the candidate, not new trials.
Initial fitting .731 seconds, scoring .130 seconds, excluding guarded provenance
reconstruction. Retained evidence 724,971 bytes is below 2 MiB.

[F016](../../findings/F016-unresolved-choice-mixture.md) retains the decision.
Evidence: [freeze](evidence/freeze.json), [models](evidence/models.json),
[results](evidence/results.json), [predictions](evidence/predictions.json.gz),
[verification](evidence/verification.json), [clean replay](evidence/clean-replay.json)
and [archive recipe](evidence/clean-archive.json).

Next: stop this exact mixture recipe as preregistered. Review the precision,
cohort and input limitations before another model trial; register a distinct
question that can inform accuracy or estimated ratings. Fresh independent
evidence is needed for future confirmation of a candidate that passes its
development gates. This study does not establish improved Elo, displayed
accuracy, human categories or deployment latency. No new searches, human labels
or consumed test targets; production scoring is B000 and both review packs remain.
