# F017: precision and target evidence constrain the next study

2026-10-05. Outcome: **exploratory design finding; computational checks pass**.
Source: [E019](../experiments/E019-evidence-resolution/RESULT.md).
No model improvement, confirmation or promotion. E018's acceptance stays failed.

On the fixed E018 paired choice losses, development sample SD is .400591 over
150 games; cross-fit .918791 over 450. The top 1/5/10 absolute centered
differences account for 6.9%/25.3%/38.7% of development squared variation and
24.8%/72.2%/80.8% of cross-fit variation. This describes variance concentration,
not how much of the mean benefit those cases cause. All cases are retained.
Positive/negative/zero differences are 97/52/1 and 292/157/1 respectively;
win counts cannot substitute for mean proper log loss.

The normal independent frozen-model reference at SD .400591 has current
half-width .073312. Fixed prospective half-widths .01/.02/.05/.10 imply
8,062/2,016/323/81 games under that approximation. These are neither required
sample sizes nor guarantees, post-hoc power or a new test of E018. Dependence,
tails, population shift, fitting and subgroup precision can change the design.
[NIST mean-interval guidance](https://www.itl.nist.gov/div898/handbook/eda/section3/eda352.htm)
supports SD/sqrt(N) scaling; its Student-t interval differs from this normal
planning reference. E018's original bootstrap remains the scientific record.
Do not append cases to the exposed panel to seek a passing interval.

Plan 326ef9c, code 3990c48 and diagnostic commit 8492aea preserve order.
Seven synthetic/source checks, two independent variance algorithms, tail/count/
grid checks and exact previous means pass. All 600 cases reproduce in external
archive 8492aeaf39a6c8946c3905ea895fda23aa2734b8; SHA
387b38da32ead2d32b112dd8b48f438ab4384a7e580ea5b76f6f50fbf8d0a016.
No new fit, trial, search, label, raw game acquisition or consumed test target.

| Intended change | What the existing choice evidence supports | Evidence still needed before adoption |
| --- | --- | --- |
| Choice-distribution model | Development behavior-prediction comparisons, including failures | A passing candidate, fresh frozen confirmation, budget and latency checks |
| Displayed accuracy | No validated percentage transform | Outcome/choice validity plus aggregation, opportunity/length and independent quality/usefulness checks |
| Moves-only estimated rating | No improved rating estimate from E018/E019 | Target-free player-disjoint prediction in a declared pool, baseline/median, bias and useful uncertainty |
| Contextual performance adjustment | No adjustment claim | Independent future/repeated performance target and improvement beyond retaining recorded rating |
| Brilliance/instructional category | Tactical mechanics in existing packs only | Pending blinded human annotations and class-specific uncertainty/usefulness |

This audit reinforces the existing measurement contract rather than changing
its gates. Next register an opportunity-aware game-level rating evidence/
feasibility study: determine whether complete-alternative context can supply
strength information missing from average loss summaries, before an expensive
full collection or model fit. Smoke acquisition/cost needs admitted traceable
public data; define enough nonforced moves, pool, player-disjoint roles,
target-free predictors, baseline/median, precision and confirmation ownership.
This is a proposed distinct question, not a fitted or accepted candidate.
B000 and both pending human packs stay unchanged.
