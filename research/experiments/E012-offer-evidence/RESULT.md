# E012: offer-evidence screen fails; verification next

2026-10-05. The offer-evidence/root-counterfactual audit is registered before
inspecting E005's actual cases/key or new searches. All24 cases are frozen;
train-only legacy D001, enriched8/8/8 strata, no human reviews yet.

Four authored mechanics tests pass. The first synthetic engine smoke failed
before case access: the code used a nonexistent SF18 filename. The path is fixed
to the maintained `engine/stockfish-nnue.js`/`.wasm` pair; its exact SF18 hashes
are enforced by the shared harness. The repeated starting-position smoke passes
at20k/80k (~82/149ms). No engine substitution or protocol change. `verify:source`
passes. Authored fixtures are mechanics evidence, not human judgments.

Code7dddf8f is committed. The canonical-line-ending board-function block matches
exact B000 source. The SF18 configs and policy are frozen/registered before
case collection; policy object SHAb11af208bbd622e9faf7a13214ba0e718ab44e919705842fd409586309d49661.
D001's exposure ledger and policy were committed in7c3b067 before collection.
The one collector is terminal (exit0):24 cases,822 legal alternatives per budget,
1,692 queries,1,695 engine requests,zero reuse,319,092 compressed bytes,~176s.
Complete histories, source/pack/policy/config bindings and all legal raw scores/
PVs pass before commit.20k/80k selected-node ranges495–20053 /495–80194;
210/181 earlier exact scores and1/2 exact recoveries are retained. Caps pass.
Raw observations and receipt are registered and committed inea9f615. No
property assessments, fits or human labels were used during collection. The
single frozen assessment is terminal (exit0); its report/run are registered.

## Frozen screen

**Operational screen fails; no category-improvement or human-validity claim.**
Supported heuristic offers at both budgets:0/8, Wilson95% interval[0,32.4408%],
versus required>=7/8. Engine-property eligibility agrees in21/24 (87.5%, interval
[68.9961%,95.6557%]), below required22/24. Full24-case coverage passes.

| Original stratum | Moved-piece heuristic | Full local offer | Supported / unsupported / unstable |
| --- | --- | --- | --- |
| Offer |8/8 |1/8 |0 /6 /2 |
| Loss |1/8 |1/8 |0 /8 /0 |
| Control |0/8 |2/8 |1 /6 /1 |

In the offer stratum, all8 are near-best at20k and7 at80k under complete
alternatives; only4 pass resulting-position soundness at each budget.
Competitive relevance passes7/6; combined engine properties pass3/1. None of
the8 passes all board/engine properties at both budgets. A legal lower-value
capture is a poor substitute for net voluntary material cost in this small
enriched pack; a near-best move can also retain a losing position. The controls
can contain other attributable offers omitted by the moved-piece heuristic.

Restricted-root maximum points exceed unrestricted-root points by>0.02 in5/24
cases at20k and4/24 at80k. These are finite-search discrepancies, not human
quality judgments or proof that80k is correct. Preserve exact/earlier score and
node evidence. No population prevalence/precision estimate follows from8/8/8
enrichment; neither the property status nor the sample stratum is a human label.
The existing reviewer page and key remain unchanged; reviews are still pending.

Next: commit report, run exact/independent verification and external clean replay.
Keep the failed gates. Durable cache remains in `research/runs/E012/sf18/`.
Then register improved review-case selection using net voluntary offers and
separate soundness/stability evidence; do not silently replace reviewed packs.
