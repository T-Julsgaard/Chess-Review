# E156 — equal-value pieces against a declared capture objective

2026-10-10. Prototype, not accepted evidence. Preregistered9e9697e; parent
E1552b0f20c. Authorized current main, research-only/local commits/no push.
One provisional C0301 scope: own equal-value pieces differ in complete coverage
of a declared enemy-pawn capture objective after an actual quiet nonchecking
piece move. General good/bad piece quality remains unresolved. No C0300 strategic
trade or C0303 bind credit; full catalog and their positional prerequisites remain.

Default-disabled pieceObjectiveTags wraps E155 exactly. Strict target square,
two distinct own equal-value N/B/R/Q squares, maxPieceObjectiveNodes integer
0..50000 default50000; optional objectivePanel independently admitted. Missing
history/objective inputs report prerequisites. Invalid target, units, types,
history or saved evidence reject. Capture/pawn/king/promotion/checking moves
withheld. Exact disabled compatibility and atomic budget exhaustion preserve
parent events/comment; new event qualityClaim:false and <=24words.

Neutral collector adapted from E153 without modifying frozen dependencies;
independent verifier uses Chess directly. Complete genuine history, root legal
inventory, nominal balance, target/units, actual state, every enemy reply, every
actor legal inventory, all tracked-target captures by any own unit, and every
counterreply/state/flag/balance retained. Original nominees track relocation;
captures cannot borrow another unit's success. Target identity follows advances
and promotions, including legal EP victim semantics. A nominated unit passes
only when every live enemy reply permits its capture, with nonempty live counter
inventory and >=1point gain from original balance after capture and all counters.
Exactly one nominated unit must pass; both-pass/both-fail withhold. Any visited
fifty/repetition claim suppresses the event globally. No winning/strategic value,
durability, player intention or optimal-exchange claim follows from this bound.

All three prospective smoke hypotheses passed. White Kh8 Ra1 Bf1 Ne1 Pf6 versus
Kh1 Ra7 Nb5 Pf7, true Rxa7/Nxa7 and actual Bc4: Bf1 covers pawn f7 after all five
defenses, equal nominal Ne1 does not. Add Black Be8: ...Nb5 retains Bxf7/Bxf7,
gain-2 from baseline, refuting coverage; all failed attempts retained. Add White
Ng5 and nominate Bf1/Ng5: both pass, so no relative superiority. Both colors.
Six complete panels raw costs76/76/173/173/127/127; wrapper adds3. Three white
smoke observations reused exactly, only three reflected panels freshly collected.
No acquired games, engine or tablebase; D001-test preflight/guard receipts retained.

44focused checks pass4.7seconds plus2representative E155 parent checks. Includes
strict/disabled/history/objective/ownership controls, fresh/cache identity,
exact/one-short atomic budgets, independent defender and both-cover, reversed
nominee order, tracked target advance, captured nominee, genuine pawn-move/check
refusals, visited claim refusal, 17 independent raw/witness mutations and caller/
event metadata admission. An independent witness checker recomputes per-unit
successes/refutations without importing collector/detector/derive helpers.

Two development failures retained with original source snapshots/hashes:
initial claim test ignored the clock reset from recorded captures; corrected
authored root starts at98 with empty true prefix. Copied pilot orchestration
referenced obsolete weaknessAnalysis and stopped before output; property corrected.
AMENDMENT.md discloses timing; detector, raw panels, controls and gates unchanged.
The missing-output replay attempt after the runner failure is also recorded.

Guarded12case pilot:2positive cases and6witnesses, with two each missing objective,
missing history and zero budget. Independent saved replay passes all six full
legal panels, per-unit policies, positive/negative admission, event metadata,
parent snapshots, smoke reuse, receipts and438 normalized source/dependency hashes.
Run outputs copied byte-identically into canonical evidence and replayed there.
Shared Chess semantics remain a limitation. No cumulative suite or lengthy
reproduction; combined regression, exhaustive occurrence/absence/priority/history/
budget audits and exact main/repeat/initially clean reproductions remain deferred.

Evidence bytes: observations26,552, smoke21,933, results53,850(459,257plain),
failure-clock40,951, failure-runner32,603, run.json62,641. All gzip artifacts
175,889bytes below200KB compressed soft target; complete evidence238,530bytes.
Full raw branches/failures retained losslessly, not trimmed for storage. Source
closure, environment, commands, prereg revision, null engine/seed and hashes in
run.json. Replay: node research/experiments/E156-piece-objective-effectiveness/code/replay-saved.mjs

Accepted E082 remains378/1085(34.8%),328names,63accepted studies. Build375
provisional entries,76ready/0stale batches;753accepted-or-candidate(69.4%),
332without ready code. Production/numerical/accepted tracker/shared policy
unchanged. Real-game precision and teaching usefulness remain unmeasured.

Next: C0303 structural bind requires joint pawn-break and piece-activity evidence
with genuine positional alternatives; use that machinery to return to C0300
strategic exchange comparisons. Do not relabel this tactical capture objective
as positional trade value or complete C0301's broader strategic definition.
