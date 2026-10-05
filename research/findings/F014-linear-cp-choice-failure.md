# F014: linear CP choice utility fails despite lower search drift

2026-10-05. Outcome: **no-improvement**. Development evidence, no promotion.
Source: [E016](../experiments/E016-relative-cp-choice/RESULT.md).

Both models use the same complete SF19 20k legal alternatives and one train-only
softmax temperature. The comparator uses sigmoid(.368208*cp/100); the candidate
uses .5+clip(cp,-10000,10000)/20000; both map mates by sign to 1/0. Removing
sigmoid compression is the new premise. Subtracting the best utility in softmax
is algebraically neutral and is already done for the comparator.

Protocol `5aa7e82`, code/cohort freeze `396566b`, training models `24d724c` and
single assessment `1d38183` preserve the registered sequence. Final beta is
15.464491662877617 / 52.71675871488209; all twelve scalar fits converge with
independent optimality checks and no upper cap. Five reused, label-independent
90-game folds support train-only cross-fitting, not fresh confirmation.

| Fixed comparison | Games | Paired gain | 97.5% game interval |
| --- | ---: | ---: | --- |
| Development comparator minus candidate NLL | 150 | -.366494 nats | [-.537153,-.196215] |
| Training cross-fit comparator minus candidate NLL | 450 | -.700633 nats | [-1.082447,-.399710] |
| Development uniform minus candidate NLL | 150 | .668081 nats | [.554149,.792108] |
| 20k/80k comparator minus candidate TV drift, descriptive | 45 | .039495 | [.020116,.057610] |

Primary practical and interval gates, cross-fit mean and subgroup harm guards
fail. Development NLL is 2.390405 comparator / 2.756898 candidate / 3.424979
uniform. Complete coverage and numerical guards pass. Five eligible development
groups and eight cross-fit groups fail harm guards; sparse development groups
remain unresolved. The descriptive Brier .797054→.885680 and fixed five-bin
top-choice calibration error .116826→.276426 also worsen. Candidate mean top
probability is .071347 in its 133-case lowest-confidence bin, while that first
maximum alternative is chosen .345865 of the time. No calibration refit follows.

Mean vector drift decreases .083789→.044294; TV<=.1 counts increase 28/45→41/45
(candidate Wilson lower .792664). This includes 30 training cases and is an
operational diagnostic, not independent human validity. A less sensitive,
poorly predictive distribution can look stable: lower drift alone is insufficient
for adoption. No universal relationship between stability and quality is claimed.

Exact original/refitted models, 600 vectors, 45 budget pairs, all report fields,
four bootstrap intervals and independent raw-score equations/fit derivatives
verify. External Git archive replay passes with prefit source-byte/newline
bindings, without Git metadata, ignored inputs, downloads, dependencies or new
searches. [The archive recipe](../experiments/E016-relative-cp-choice/evidence/clean-archive.json)
binds revision 1d381837aba976aa83c69faa96927da68f73dcb0 and SHA
3f8f5891fb3813d072a281ac54be5a0dcc5f21a0e301f6700a545d750df6c42a.

No CP clipping occurs among 19,359 low / 1,555 high alternatives; mate counts
443/74 retain the fixed sign-only policy. Failure belongs to the whole linear
recipe, including mate semantics. These counts do not attribute the loss to
mates or establish that every relative/context-scaled utility fails. Retain
the negative result and stop this exact recipe; a different, prospectively
fixed context scaling and justified mate mapping would be a distinct hypothesis.

D002 remains exposed prefix-convenience Lichess blitz evidence with unavailable
provisional status and one focal choice per game. No improved Elo estimate,
displayed accuracy, category label, future population claim or deployable
all-alternative latency follows. Fresh confirmation needs registered D003.
Runtime B000 and both pending blinded human packs remain fixed.
