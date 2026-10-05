# E012: offer evidence and root-counterfactual consistency

Registered2026-10-05 before reading the actual E005 cases/key or new engine
results. Category-method development; human annotation is still pending.
Distinct from CP-curve fitting, rating feature/interval studies and the failed
E008–E011 accuracy comparisons. No refit or new confirmation-cohort claim.

## Question, frozen cohort and intended claim

Does the E005 legal-capture offer heuristic supply stable evidence for a sound,
competitive voluntary material concession? Audit **all24 existing cases**,
including all8 offers,8 losses and8 controls; no target-dependent replacement.
Use D001 training games only, guarded E005 pack/key and original full histories.
Enriched convenience sampling and D001's legacy provenance/exposure remain.
This is not prevalence, classifier precision or independent human ground truth.

The primary engineering screen is whether>=7 of the8 heuristic offers satisfy
all defined board/engine properties at **both** budgets. Also require complete
24-case coverage and>=22/24 cases with an unchanged engine-property eligibility
decision between budgets. These are conservative diagnostic thresholds chosen
before results, not estimates of human brilliance. Report counts with95% Wilson
intervals, every failed property and all16 non-offer cases as diagnostics.
No significance-based candidate selection, label fitting or interim metric looks.

## Property definitions and comparison

Reuse the exact B000 board predicate (`SAC_VAL` through `isSacrifice` in
`analysis.js`) by extracting its unchanged function block and binding its hash.
Reconstruct move.before/after/color/capture/promotion and move.prior from actual
history; do not pass the pack's presentation fields as an invented move object.
Record the moved-piece lower-value-capture heuristic separately from the full
128-node voluntary-attributable local-exchange predicate. An engine cannot
substitute for this board evidence; board evidence cannot establish soundness.

Collect unrestricted root and **every legal restricted root move** at20,000
and80,000 nodes, exact bundled SF18 Lite/Hash32/single thread/MultiPV1,
UCI_ShowWDL/no tablebases/full startpos history/cold reset through the maintained
harness. Same frozen options at both budgets. Higher budget is a robustness
reference, not truth. No after-position replacement or actual later game moves.
Reuse only complete registered observations matching engine/options/budget/full
history/restriction; do not use historical rating context as exact query records.

For each budget, define engine-property eligibility by these **research** rules:

- Maximum expected points among all restricted legal roots minus the played
  root's points is **strictly<0.02**. Expected points here are SF18 engine WDL
  `(win+draw/2)/1000`, with winning/losing mate mapped1/0. This matches the
  pack's WDL-based selection concept, not the published SF18 human-outcome curve.
- Played root has mover-relative CP>=-50 or a positive mate.
- If the highest restricted root score is CP>=500 or a positive mate, the
  highest score among alternatives other than the played move is CP<500 or
  a negative mate. Otherwise competitive relevance passes. Rank root scores
  lexicographically: winning mates above CP above losing mates; shorter winning
  mate and longer losing mate rank higher. A delayed pre-existing winning mate
  is ineligible. Keep mate/CP and score sign explicit.

Combine those properties with the frozen board predicate for supported offers.
Define a conservative research evidence status: `supported` only when board and
engine properties pass at both budgets; `unsupported` when engine decisions
agree and combined evidence fails; `unstable` when the engine decision changes.
This status is **not a Brilliant label**. Forced/terminal or malformed bindings
invalidate the cohort rather than silently dropping cases.

Report comparison with the ordinary root-pair method (unrestricted best versus
restricted played, clamped nonnegative): count root-score inconsistencies where
the maximum restricted points exceeds unrestricted points by>0.02; record both
losses and their near-best decisions. This tests missing/contradictory alternative
evidence; agreement with80k is not an independent accuracy target. All scores,
properties and statuses are private research evidence, never injected into the
blinded pack. No category, accuracy, rating or implementation improvement claim
is authorized without the corresponding independent evidence.

## Cost, checks and retention

Estimate~1,000–2,000 queries,5–10min; hard cap30min/3,000 engine requests/3MiB
compressed retained raw observations. First run authored legal/score/mate/history
tests and a starting-position synthetic engine smoke at both budgets. Commit
code before collecting. Preserve an append-only key-bound cache and specific
live session; a timeout does not authorize restarting or using partial outputs.

Bind cohort, legal alternatives, before/after/prior boards, raw exact info,
PV legality, config/node/recovery diagnostics and source locators. Register/commit
complete raw observations before one frozen assessment. Register reports before
reuse. Require exact replay, independent property/score equations and external
clean archive replay; neither synthetic tests nor clean replay supplies human
perception/educational validity. No dependency installation or network acquisition.

Keep sufficient evidence, hashes, costs and receipts in this experiment; update
D001 exposure and the research index. Preserve failed, inconclusive or successful
screen outcomes without rewriting gates. Human reviewers may later judge the
same blinded pack independently; inspect this evidence only after submitting
their blinded judgments. No production edits, push or publication.
