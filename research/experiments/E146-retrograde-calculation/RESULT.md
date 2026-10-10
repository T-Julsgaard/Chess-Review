# E146 — terminal-anchored stopping and backward mating goals

2026-10-10. Prototype, not accepted evidence. Preregistered fa89b8a, parent
E145 b0f970a. Authorized current main, research-only local commits/no push.
Two provisional scopes C0132/C0136. General quiet-position evaluation stability,
longer goal-directed calculation and the full original catalog remain open.

The new machinery builds the COMPLETE bounded legal continuation tree after
the actual move, then propagates results backward from terminal leaves. This is
not a renamed forward mating proof: every legal edge, including failed choices
and unresolved frontier nodes, is retained. E143's pruned raw query trees cannot
replace these observations. Reuse its exposed authored input, not an incompatible
observation. Identical FENs from different legal paths are never merged; actual
history and each continuation's claim context stay distinct.

C0132 begins only at real mate or mechanical terminal draw states. A live player
with a certified winning child has that winning outcome. Otherwise every child
must be resolved before deriving draw or enemy win. Unknown stays unknown.
The certified root result cannot be overturned by searching farther under these
same legal/history/rule semantics. Winning rank is minimum own winning child
rank+1 versus maximum all defensive child ranks+1. Draw rank conservatively
covers the entire resolved subtree. This proves an outcome-based stopping point,
not score convergence, general stable quiet evaluation, unrestricted shortest
mate, optimality of the actual move or human calculation behavior.

C0136 takes an explicit desired own-piece/square checkmate goal. Terminal goals
seed a separate backward attractor: attacker requires a goal successor, defender
requires ALL legal successors. Retain all node ranks and a root policy containing
all tied minimum-rank attacker choices and every legal defender reply. Policy
rank strictly decreases to a matching real checkmate. Already achieved goals
have rank0 and receive no backward-calculation label. Wrong goals may fail while
the position's outcome remains certified. This demonstrates a finite reasoning
procedure without inferring a player's thoughts from moves.

The first smoke succeeded in183ms: E143's Qd8+ endpoint has39nodes/38edges,
complete raw collection cost81, plus78pass ticks and1context tick=160total.
Bottom-up White outcome rank2; desired own Qg8 checkmate rank2. Policy covers
...Kg7 then Qg8#, ending at terminal node17. Other White alternatives remain
unresolved: a stopping certificate does not relabel all frontier positions.
Wrong target Qg7 retains the White outcome but has no goal policy. At bound1,
the endpoint remains unresolved. Already played Qg8# stops at real mate rank0,
without inventing a continuation or a backward-planning claim.

Focused all-defense negative: Kf6/Qc5 versus Kg8, actual Qc7, desired own Qb8
mate. The complete root has both ...Kf8 and ...Kh8. The desired goal is available
against one reply and unavailable against the other, so the backward goal label
is withheld even though White still has a forced mating outcome via different
answers. Separate quiet Qh5 actual move permits Black ...Qe1#: Black outcome
rank1 is resolved, while the actor's desired goal remains unavailable. Terminal
stalemate is draw rank0, distinctly separate from a live unresolved frontier.
No observed authored-hypothesis failure or changed gate is recorded.

Default-false retrogradeCalculationTags wraps E145. Strict continuation bound
retrogradeCalculationPlies0..2 default2, maxRetrogradeCalculationNodes0..50000
default50000. Optional retrogradeCalculationGoal must name exact kind, actual
actor, piece and square; optional retrogradeCalculationGraph is untrusted.
Runtime admits every saved graph through independent legal replay. Full actual
history is required. Repetition/fifty-move claim contexts ANYWHERE in the complete
tree cause abstention, including an otherwise unused alternative. No unknown
claim becomes a draw. Atomic budget exhaustion clears all new witness/events
and preserves parent output. Same fresh/cache cost:1wrapper context + graph
collection ticks + one tick per node for EACH bottom-up pass. Exact160 succeeds;
159 exhausts atomically for both fresh and cached inputs. Short-bound graphs
cost11; already-terminal graphs cost6.

46focused checks passed4.4s:12authored/reflected fixtures, strict/disabled parent
equality, fresh/cache equality, exact/one-short budget, complete tree/frontier,
absent target, universal-defense negative, enemy outcome, mechanical draw,
longer real history, actual repetition and counterfactual future clock claim,
20independent graph/edge/history/goal/outcome/policy mutations, caller admission
and quality/copy checks. Two representative E145 parent checks pass. Source
verification and diff checks pass. No cumulative suite or long reconstruction.

Guarded D001-test pilot12cases:6positive,8witnesses,2missing-history,2zero-budget.
Six unique trees:39/39/2/2/1/1nodes,81/81/6/6/3/3raw collection ticks. Reuse the
first smoke tree; collect five further small trees once. Desired-goal alternatives
share the same raw tree without recollection. Raw collection binds15inputs;
complete build binds245normalized source/fixture/plan/dependency inputs.

Independent saved checker imports Chess and the legal-tree admission verifier,
never detector, collector or runtime backward passes. Its separate recursive
derivation checks terminal anchors, complete minimax vectors, goal ranks, all
policy edges and exact comments/cost. Full-tree admission rebuilds real history,
canonical node/path inventory, every legal move/SAN/FEN, terminal/claim/limit
classification and exact collection cost. Saved replay verifies all six trees,
source/output hashes, receipts, actual fixtures and parent-event snapshots.
Shared Chess/rule semantics remain a limitation; full interactions/priority
and independent outcome cross-validation remain combined-validation work.

Retention: observations.json.gz6,133bytes, results.json.gz21,602bytes
(155,957uncompressed), run.json with environment, commands, null engine/seed,
preregistration revision plus exact working-source hashes, guard receipt and
output hashes. Final pilot/replay reuse all six trees; no recollection. No game
content, engine/tablebase acquisition or imported diagram. Accepted tracker,
shared data policy, production and numerical behavior unchanged.

Accepted E082 stays378/1,085(34.8%),328names,63accepted studies. Build349
provisional entries,66ready/0stale batches;727accepted-or-candidate(67.0%),
358without ready code. Narrow candidates never complete broader occurrences.

Deferred: combined full regression and occurrence/absence/priority/history/
budget audits, exact main/repeat/initially clean reproductions, broader stable
evaluation/backward goals, real-game precision and teaching usefulness. Next:
opening initiative/equalization/advantage comparisons with suitable contextual
evidence; preserve positional-compensation, sustainable perpetual-attack and
named rook-defense prerequisites. Full catalog goal remains unfinished.
