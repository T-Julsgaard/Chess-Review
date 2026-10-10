# E143 — forcing tempo and tactical initiative

2026-10-10. Prototype, not accepted evidence. Preregistered0e8c5ef, parent
E14290f9691. Authorized current main, research-only local commits/no push.
Two new provisional scopes C0021/C0022. Broad strategic tempo/initiative,
opening applications and original catalog occurrences remain open.

The authored hypothesis worked: White Kg1,Qg5,Bf7,Ng4,Pd4,Pg2,Ph2 versus
Black Kh8,Qd2,Rh7. Qd8+ forces ...Kg7 Qg8#, whereas the same queen's quiet
Qh5 permits ...Qe1#. Color reflection agrees. Every legal root candidate has
both sides' finite mate proofs at the same remaining bound. All38moves are
represented, including unresolved alternatives; no unproved move becomes safe
or drawn. Other winning moves exist, so this is not uniqueness or optimality.
The concrete initiative is a checking attack whose every legal defense permits
immediate mate; this witness has one legal defense. It is not evidence of a
permanent strategic advantage or sustainable nonchecking perpetual attack.

Default-false forcingTempoTags wraps E142. Strict bound0..2 default2 and node
cap0..50000 default50000. Full supplied history is replayed; missing history
abstains. Actual move must be noncapturing/nonpromoting, a nonterminal check
forcing mate in two plies, with a same-unit noncapturing quiet alternative
allowing enemy mate. Exact checking replies and branch-specific mating responses
are retained. Atomic exhaustion removes witness/new events and preserves parent.
Repetition/fifty-move claims anywhere in recorded exploration cause explicit
claim-rule-prerequisite abstention. No null-move counterfactual or history reset.

Amendments and failure: saved-panel consumption was prospectively documented in
AMENDMENT.md before implementation/evaluation. Initial no-counterattack negative
then exposed a genuine ledger error: returned mate trees accounted for7,527ticks
but search consumed7,697. E029 correctly discards failed exploratory branches
when it finds a winning choice. Version1's cache is retained with original source
hashes; ledger-failure.json independently reconstructs the170omitted ticks and
confirms returned proofs/outcomes match the corrected observations. No hypothesis
failure or changed mate outcome was hidden by this correction.

Version2 retains each query's full FEN tick trace, including discarded branches.
Independent replay consumes canonical legal exploration in trace order, rebuilds
the returned proof and verifies exact search/claim-traversal cost. Missing trace
branches fail immediately; replay does not fill them by fresh search. Both
retained proof trees and full exploration are checked. The runtime uses this
independent semantic validator to admit supplied panels; comment derivation is
separately checked. This is shared admission machinery, not a second chess library.
Six small authored panels were recollected because this required observation
format changed. Their source closure contains20hashes. Final tests/pilot reuse
these panels; one fresh-vs-cached positive check intentionally verifies equality.
No engine searches, tablebase probes, imported games or diagrams were used.

35focused checks pass30.4s after a verifier-only claim-test reordering. The prior
35check run passed30.2s; no speed improvement is established. Reordering did not
alter or recollect observations. Checks cover12 authored/reflected cases, exact
disabled parent equality, strict controls, fresh/saved equality, exact/one-short
budgets, discarded-exploration costs,14 witness/trace mutations, invalid caller
panels and quality metadata. A real full-history candidate reaching threefold
repetition proves claim-rule abstention. Two representative E142 parent checks
pass2.0s. Source verification and diff checks pass. No cumulative suite was run.

Guarded D001-test pilot12cases:2positive,8comparison witnesses,2missing-history,
2zero-budget cases. Quiet actual moves, shorter bounds and absent enemy
counterattack receive no labels. Six cached panels are all semantically replayed;
costs4,119positive,1,814short-bound and7,697no-counterattack per reflected root.
Independent checker imports Chess and existing independent mate replay, never
the detector/query/collector. Saved replay verifies source/cache/output hashes,
all proof/trace semantics and exact labels, plus parent-event snapshots. Full
inherited interactions/priority remain a combined-validation gate.

Retention: evidence/observations.json.gz72,598bytes, historical failed cache
39,191bytes, results.json.gz120,584bytes (1,783,234uncompressed), run.json and
ledger-failure.json. Full exploration traces and retained failure provenance
justify this modest storage increase; completeness is preserved. 201normalized
source/fixture/plan/dependency hashes, exact environment/commands, guarded receipt
and preregistration revision plus working-source hashes are retained. Pilot/replay
reuse the hash-matched observation cache without new collection. No production,
accepted tracker, shared data policy or numerical behavior changed.

Accepted E082 stays378/1,085(34.8%),328names,63accepted studies. Build342
provisional entries,63ready/0stale batches;720accepted-or-candidate(66.4%),
365without ready code. Provisional coverage does not discharge broader scopes.

Deferred: combined full regression, occurrence/absence/priority/history/budget
audit, exact main/repeat/initially clean reproductions, broader nonmating tempo
and initiative, opening-history applications, real-game precision/usefulness.
Next: compatible harmony/relative piece value/piece quality comparisons with
causal alternatives; preserve sustainable perpetual-attack and named rook-defense
prerequisites. Full catalog goal remains unfinished.
