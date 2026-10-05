# F006: a flatter SF19 CP curve improves fresh development prediction

2026-10-05. Outcome: improved CP candidate / unsuccessful WDL candidate.
Evidence maturity: **development**, not confirmed. Source:
[E008](../experiments/E008-human-quality-curves/RESULT.md). No promotion record.

## Supported result

On D002's150 player-disjoint development blitz games, a train-only SF19 CP
expected-game-points slope0.22349935786891822 per pawn and legal-choice inverse
temperature20.939735269175777 improve both registered likelihood targets over
fixed slope0.368208 with its own train-only choice temperature15.464491662877624.

Outcome loss falls0.705194→0.665799 (gain0.039395,97.5% paired game
interval[0.011472,0.070397]); choice loss falls2.390405→2.324883
(gain0.065521,[0.022158,0.112435]). Outcome Brier improves0.236432→0.226111.
Both practical thresholds, positive interval bounds, coverage, interior-fit and
adequately sized prespecified subgroup guards pass. Sparse groups are unresolved:
rating<1200 has19/18 outcome/choice games, rating>=2000 has26/23; extreme-point
choice groups have11/18. Fits use450 separate training games; no rating enters
either model. Every legal alternative is evaluated at a score-blind focal choice;
root outcomes are actual human game points, game weighted. Two candidate families
were declared in advance.

The WDL-logit coefficient0.16514509156690166 / temperature13.353740343925672
fails. Its outcome gain0.025360 has interval[-0.005235,0.061286]; choice loss
deteriorates by0.284370, interval[0.177482,0.383670]. Subgroup/choice gates also
fail. This does not establish that every possible WDL model is inferior; this
registered simple curve was unsuccessful. Retain the raw searches and do not
retune it on the same development results.

## Integrity and claim limits

The registered raw evidence was committed before fitting. Exact replay,
independent gradient/prediction/metric equations and a separate external Git
archive replay pass, using no new searches, network, ignored input or installed
dependencies. Evidence/eligibility/code/input/output hashes and archive recipe
are linked from E008. These establish numerical integrity, not fresh confirmation.

The result concerns two prediction primitives for the exact bundled SF19 Lite
build,20,000 configured nodes, full-history cold searches and this convenience
archive-prefix cohort. Earlier exact iterations and exact-recovery queries are
preserved; a configured budget is not the selected score's node count. Mate roots
are jointly excluded from outcome assessment, mate alternatives map by sign.
Provisional-rating status is unavailable. No global/population, SF18, rating,
causal counterfactual, brilliance or instructional-usefulness claim is supported.

It does **not** validate a new displayed accuracy transform or game aggregation.
The fitted softmax temperature is an auxiliary human-choice predictor; it is not
the production SF19 display rule.300 reserved games remain unsearched/unassessed.
The old extension and public methodology stay B000.

## Implementation decision deferred

Next: register one frozen CP candidate/comparator and exact confirmation protocol
before activating fresh reserved evaluation. Separately assess candidate search
stability and the displayed scale/aggregation. A confirmation failure must be
retained and cannot be repaired using those same labels. Only then can a promotion
record specify an adoption scope. Matching another site's scores is no criterion.
