# F016: choice mixture improves point estimates but misses acceptance

2026-10-05. Outcome: **inconclusive development benefit; acceptance gate fails**.
Source: [E018](../experiments/E018-choice-mixture/RESULT.md).
Exposed development evidence only; no confirmation or promotion.

The candidate keeps the published SF19 sigmoid CP and sign-only mate utilities.
Fit global temperature on training first, hold it fixed, then fit convex
weights of regular, twice-temperature and uniform legal-choice distributions.
This is a conditional two-weight optimum, not joint optimization or a claim
about human mental states. Final temperature 15.464491662877617; sharper
30.928983325755233; weights regular .175669, sharper .735847, uniform .088484.
All six scalar and six conditional fits converge; no temperature cap or active
simplex constraint. Independent objectives, gradients and supporting inequalities
verify. Plan `b1cf36d`, code/cohort freeze `f17a935`, models `ce8aeb5`,
then single assessment `fce4225` preserve the registered order.

| Fixed comparison | Games | Mean paired gain, nats | 97.5% game interval |
| --- | ---: | ---: | --- |
| Development comparator minus mixture NLL | 150 | .052790 | [-.023540,.125292] |
| Training cross-fit comparator minus mixture NLL | 450 | .171879 | [.083508,.278388] |
| Development uniform minus mixture NLL | 150 | 1.087364 | [.814214,1.358888] |

The comparator point gain clears .02 but its lower bound is not positive.
The mixture fails acceptance; do not describe it as a proven improvement.
Uniform, cross-fit mean, coverage, numerical and all eligible subgroup guards
pass. Cross-fit intervals condition on overlapping fits. Development has been
used in multiple studies, so no series-wide error-controlled inference follows.
The cross-fit point gain does not substitute for the failed development gate.

Five development groups are sparse: root-point tails 11/18 games, any mate
alternative 20 and rating tails 18/23. All cross-fit groups have sufficient
support. Mate/ordinary gains are +.685541/+.117610 cross-fit and
+.013964/+.058763 development. This does not establish a mate-specific effect.
The unchanged sign-only mate policy ignores distance. All complete alternatives
are used; no observed CP exceeds 100 pawns and no CP clipping occurs.

Descriptive Brier improves .809793→.791523 cross-fit / .797054→.789195
development. Top-choice five-bin calibration error improves .133113→.075168 /
.116826→.083644. No confidence or superiority claim is attached to these
diagnostics. Operational budget sensitivity worsens: mean complete-vector TV
.083789→.114492 over 45 pairs; paired reduction -.030703
[-.046763,-.015884]. TV<=.1 counts fall 28/45→21/45; candidate Wilson interval
[.329351,.609225]. Thirty pairs include training cases; higher budget is not
human truth. Stability is secondary here but remains an implementation concern.

Twelve exact refits, 600 vectors, 45 pairs, independent raw-score/probability/
optimality equations, every metric/guard and 40,000 bootstrap replicates pass
in the checkout and external archive. [The archive recipe](../experiments/E018-choice-mixture/evidence/clean-archive.json)
binds revision fce42257a13bff5e60d29d82d9ccccf7e4b3d9f9 and SHA
cab7fe6e500cc92f663e3b036e8c9418ba6552d943816c58cca0eee6985352e9.
Prefit source representations permit newline equivalence, not source edits.
Verification refits are reproduction, not new trials.

Stop this exact mixture as preregistered. Preserve the positive point estimates,
failed interval and adverse stability diagnostic together. Review precision,
cohort and input limitations before proposing a distinct experiment. D002 is an
exposed archive-prefix Lichess blitz convenience cohort, provisional status
unavailable, one focal choice per game. Its consumed test panel stays reserved
by role and cannot confirm revised models. Future confirmation needs fresh
registered evidence and a candidate that clears its development gates.
No improved Elo, displayed accuracy, human-category validity or deployable
all-alternative latency follows. Production B000 and both pending packs remain.
