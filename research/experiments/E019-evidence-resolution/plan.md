# E019: evidence resolution and target audit

2026-10-05. Exploratory measurement-design audit after E018/F016, before
computing the diagnostics below. No new candidate, fit or performance assessment.
The E018 results are already known and exposed; this is not a preregistered
confirmation or a rescue of its failed acceptance.

Question: how much paired game variation does the fixed choice assessment
contain, and what evidence is needed before making claims about accuracy or
estimated ratings? This can improve research efficiency by distinguishing a
measurement limitation from another model modification. B000 remains frozen.

Use only registered E018 predictions/results/verification from D002, admitted
through both D001/D002 guarded provenance. Inputs are 450 cross-fit and 150
development choices, already assessed; never use the consumed test panel.
No new raw games, searches, human labels or parameter selection. Keep all cases.
Require unique IDs, exact role/split counts and finite paired losses; retain
eligibility receipt and exact parent/source hashes. Existing F016 owns the
scientific comparison; E019 must not override it.

Compute per-role comparator-minus-mixture log-loss differences: count, mean,
sample SD (n-1), standard error under an explicitly hypothetical independent-
game model, positive/negative/zero counts, largest absolute difference and
fractions of centered squared variation in the largest 1/5/10 absolute
centered differences. No case IDs or raw positions in the compact output.
Independently verify these from saved predictions and match report means.

For development only, use z=2.241402727604947 (normal .9875 quantile, matching
the central 97.5% interval level) and fixed hypothetical half-widths
.01/.02/.05/.10 nats. Report ceil((z*SD/halfWidth)^2), minimum 2 games,
and current normal-reference half-width. These are planning approximations,
not required sample sizes, guaranteed bootstrap coverage, observed power or
significance tests. Frozen-model independent future-game variance is an
assumption; heavy tails, new populations, repeated players, model fitting,
multiple future looks and subgroup precision can change the design. Do not
use the observed positive effect as a target or increase the exposed sample.

[NIST mean-interval guidance](https://www.itl.nist.gov/div898/handbook/eda/section3/eda352.htm)
motivates SD/sqrt(N) scaling; its displayed interval uses Student t. Our normal
reference is a large-sample planning approximation, not a replacement for
E018's bootstrap. Source read 2026-10-05. No borrowed chess-site score is a target.

Success is computational integrity: two separate variance implementations,
independent tail ordering/counts/grid calculations, exact report means,
450/150/600 coverage and clean external replay. Synthetic known variance,
constant values, sign/scale invariance, invalid values/roles and tampering
must pass. No model superiority gate applies. One diagnostic execution,
verification is reproduction; stop after retaining the audit.

Budget: zero engine searches, model fits, new trials or human reviews; <=5s
diagnostics excluding guarded provenance; <=200KiB retained evidence. Reuse
Node built-ins and guarded loader; no dependencies. Commit this plan, then
code before diagnostics. Save run receipt, result, independent verification
and external archive receipt with source/input/output hashes.

Document claim prerequisites using the existing measurement contract: choice
prediction does not establish a displayed accuracy transform, moves-only rating
requires target-free player-disjoint prediction, contextual adjustment needs
independent repeated/future targets beyond recorded rating, and perceived
category validity needs the pending human labels. State a concrete next
question rather than authorizing another cheap utility sweep or implementation.
