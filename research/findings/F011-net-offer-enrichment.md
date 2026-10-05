# F011: prospective net-offer enrichment produces a better targeted review pack

2026-10-05. Outcome: **improved operational enrichment**; development instrument
evidence. Source: [E013](../experiments/E013-net-offer-pack/RESULT.md).
No confirmed human category rule, promotion or runtime change.

F010 found 0/8 E005 capture-heuristic offers supported under its combined
properties. E013 prospectively selected 8 B000 net-voluntary-offer positives and
8 nonoffer controls, matched by initial played-WDL point band and game phase.
Initial context loss<=0.02 and played points[0.5,0.9] target initially nonlosing
positions; original E005 games are excluded. All 16 are distinct D001 training
games. Selection examined 15,661 cheap candidates and 1,011 board predicates in
20.931s; the complete-pool net-offer count remains unknown.

Protocol 3a71e62 and code 8d72b8e precede selection; pack831479a fixes all cases
before searches; raw 6d14a62 precedes one frozen assessment. Pack identity:
`d0c968155f6875cf9c27f3bfe2df5570af9cc5fa12dc7ed8ef20f794d2fbf9a9`.
No result-dependent replacement/reordering, fits or human labels.

The prospective SF18 panel covers569 legal alternatives plus unrestricted roots
at 20k/80k nodes, full history/cold reset.1,170 queries,1,171 requests,~131s,
227,622 compressed bytes. **7/8 offers** satisfy the declared board/engine
properties at both budgets (87.5%; Wilson 95%[52.9112%,97.7583%]), passing>=7/8.
Engine eligibility agrees in 15/16 (93.75%;[71.6713%,98.8881%]), passing>=15/16.
Coverage16/16 passes. The one unstable offer remains in the blinded pack;
all8 controls are unsupported under the full offer rule at both budgets.

Exact replay, deterministic selection reconstruction, blinded-payload checks,
independent equations and clean external Git archive replay pass.16 original
histories and 32 engine-property evaluations check out. All 8 selected net offers
have independently completed positive witnesses: material gain exceeds the
played move's capture/promotion credit, attribution to the move is established,
and a concrete legal alternative avoids local material loss. No witness is
unresolved. These certify the specified local exchange/choice properties of
these cases; they do not solve intermezzi or establish perceived brilliance.

Unrestricted versus restricted-max point discrepancies>0.02 occur in 2/16 at 20k
and 1/16 at 80k. Ordinary root-pair loss calls3/16 and 5/16 focal moves outside the
research near-best threshold while complete restricted alternatives call them
near-best. The reverse discrepancy is0 at each budget. This motivates a separate
root-pair consistency experiment; additional search depth/all-legal work is not
independent human truth and does not prove improved extension grading.

The operational support increase from0/8 to7/8 is **descriptive**: the cohorts
have different selection/composition and are not a paired causal comparison.
Board-positive inclusion alone cannot validate the classifier. The research
WDL criterion differs from the published SF18 human-outcome curve. D001's legacy
provenance/exposure, small enriched training sample and finite search limits
remain. No population prevalence/precision, Elo, accuracy percentage, independent
human agreement or educational-usefulness claim follows; zero reviews received.

The [new standalone pack](../experiments/E013-net-offer-pack/review/review.html)
has its own E013 storage/export schema, partial-progress support and unchanged
rubric-v1. The original E005 page retains SHA
`9ab64efe4710596d3d35b1a904c186d88127a780fbda0b5069ef64304cc72a93`.
Keep private selection/search evidence closed during independent blinded review.
[Verification](../experiments/E013-net-offer-pack/evidence/verification.json),
[clean replay](../experiments/E013-net-offer-pack/evidence/clean-replay.json) and
[archive recipe](../experiments/E013-net-offer-pack/evidence/clean-archive.json)
bind all source/code/shared-helper/engine/policy/pack/output hashes.

Next retain individual human exports unchanged for later assessment. Continue
numerical work with a separately registered cached root-pair consistency study;
do not revise scoring or treat enrichment as a human category promotion.

Later [E014](../experiments/E014-root-pair-consistency/RESULT.md) clarifies that the raw root-pair diagnostic above omits the published
`top` zero-loss exception. Its disagreement alone does not establish a published
grading error. E014 evaluates a different restricted-chosen-move candidate with
that exception included; the earlier frozen evidence is unchanged.
