# F010: a capture offer is insufficient sacrifice-review evidence

2026-10-05. Outcome: **no-improvement on the operational support/stability
screen**; development diagnostics, no confirmed human category improvement.
Source: [E012](../experiments/E012-offer-evidence/RESULT.md). B000 is unchanged.

E005's24 blinded cases were selected as8 legal moved-piece capture offers,
8 substantial-loss moves and8 low-loss controls. E012 audited every case with
the unchanged B000128-node voluntary-attributable local-exchange predicate and
all822 legal root alternatives at SF1820k/80k nodes. Full source history, board
and score perspective are retained.
Actual cost:1,692 queries,1,695 requests,~176s,319,092 compressed bytes.

The declared>=7/8 offer-support screen fails: **0/8** meet local-offer and all
engine properties at both budgets (Wilson95%[0,32.4408%]). Engine-property
eligibility agrees in21/24 (87.5%,[68.9961%,95.6557%]), below required22/24.
Coverage24/24 passes. These intervals describe the conditional case screen;
enriched training convenience sampling does not support population inference.

| E005 stratum | Moved-piece offer heuristic | Full local offer | Supported / unsupported / unstable |
| --- | --- | --- | --- |
| Offer |8/8 |1/8 |0 /6 /2 |
| Loss |1/8 |1/8 |0 /8 /0 |
| Control |0/8 |2/8 |1 /6 /1 |

All8 heuristic offers are near-best at20k and7 at80k under the frozen **engine
WDL** criterion, but only4 satisfy resulting-position CP>=-0.5 pawn or positive
mate at each budget. Competitive relevance passes7/6; combined engine criteria
pass3/1. Near-best can mean preserving an already losing position. A lower-value
legal capture of the moved piece does not by itself establish net material cost
after the move's capture credit and legal recaptures. Other attributable offers
can also be missed by limiting the heuristic to the moved piece.

Complete restricted-root maximum points exceed unrestricted-root points by>0.02
in5/24 cases at20k and4/24 at80k. **Zero focal near-best decisions change** between
ordinary root-pair loss and complete-alternative loss at either budget. Extra
alternative collection supplies counterfactual evidence, but this sample does
not demonstrate improved near-best categorization. Neither budget is human
truth; preserve exact/earlier iteration and recovery diagnostics.

Exact replay, independent source/history/engine-property equations and external
clean archive replay pass:24 history checks,48 engine-property checks,23
completed independent local-exchange recurrence checks, no reference/budget
exhaustion in those checks. The full offer predicate is replayed from frozen
B000; these23 checks do not establish independent proof of every predicate
branch. [Verification](../experiments/E012-offer-evidence/evidence/verification.json),
[clean replay](../experiments/E012-offer-evidence/evidence/clean-replay.json) and
[archive recipe](../experiments/E012-offer-evidence/evidence/clean-archive.json)
bind source/code/engine/policy/data/output hashes. No searches/fits/network during
replay. The reviewer page's original SHA remains
`9ab64efe4710596d3d35b1a904c186d88127a780fbda0b5069ef64304cc72a93`.

This is **not** Brilliant precision/recall, human disagreement, prevalence,
educational usefulness or final classification. The research WDL near-best
criterion does not replace the published SF18 human-outcome curve. D001 legacy
provenance/exposure and deliberately enriched training sample remain explicit.
Zero human reviews have been received. Retain the original blinded pack and key.

Next improve review-case selection using net voluntary material evidence and
separate soundness/stability checks. Register a separate pack/selection study,
freeze selection before searches and retain unsupported/unstable cases rather
than silently replacing them. Any improved human category rule still needs
independent blinded judgments and fresh confirmation; do not promote this audit.
