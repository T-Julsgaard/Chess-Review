# E146 — terminal-anchored stopping points and backward mating goals

2026-10-10 before implementation/evaluation, parent E145 b0f970a. Previous goal
turn progressed: E145 committed two provisional decision/history scopes. D001
test resumption preflight passed. Authorized current main, research-only local
commits/no push; BUILD-FIRST focused checks, no cumulative or long tests.

Implement C0132 stopping point and C0136 backward calculation with genuinely
backward propagation over a COMPLETE bounded legal continuation tree. E137/E143
pruned mate proofs cannot substitute for this complete graph: reuse Chess/history
machinery and exposed authored roots, but collect new small trees once. No
transposition merging: identical boards reached through different paths retain
their separate full histories and claim contexts.

Default-false retrogradeCalculationTags wraps E145; strict continuation bound
retrogradeCalculationPlies0..2 default2, maxRetrogradeCalculationNodes0..50000
default50000. Explicit full history required. Root is endpoint AFTER actual
move, including real history and played move. Complete sorted legal edge lists
at every live interior node, terminal mate/mechanical draw/claim leaves, explicit
unresolved depth-limit leaves. No speculative evaluation at frontier. Retain
node FEN, turn, remaining depth, terminal kind/winner, all move/SAN edges and
canonical path IDs. Claim-sensitive repetition/fifty-move context anywhere
abstains from both labels. Runtime admits untrusted optional saved graph through
independent legal replay before deriving anything.

C0132: a bottom-up minimax pass starts ONLY from actual terminal mate/draw leaves.
Live own winning child proves own win; otherwise all children must be resolved
before deriving draw or opponent win. Unresolved leaves stay unknown. Known
forced outcomes cannot be overturned by extending search, provided legal/rule
semantics and full history match. Winning proof rank is minimum own winning
rank+1 versus maximum all defensive ranks+1; draws use conservative complete
resolved subtree rank. State bound and separate unresolved alternatives. This
does not prove a broadly stable quiet evaluation, score convergence, human
stopping behavior, best played move or shortest unrestricted mate.

C0136: optional explicit goal {kind:'checkmate',winner:<actual actor>,piece:<p/n/b/r/q>,square:<square>}
identifies a desired winning final board with that own piece on that square.
Backward attractor starts only at matching real checkmates; attacker needs a
goal successor, defender needs ALL legal successors. Retain ranks and policy
from root: all tied minimum-rank attacker moves, every legal defender reply,
strictly decreasing rank to the specified terminal goal. Emit only if root rank
is positive; an already achieved goal is not backward reasoning. Wrong goal may
remain unavailable even when minimax outcome is proved. It illustrates a finite
goal-directed calculation, not an inference about a player's mental process.

Budget:1wrapper-context tick + graph collection cost (1history-context tick,
one per recorded history move,1actual move tick,1per node,1per expanded legal
inventory,1per edge) +1per node for EACH of two bottom-up passes. Same fresh/cache
cost, no cache discount. Atomic exhaustion clears witness/new events and
preserves parent. Guard cheap minimum before collection; graphs and passes
bounded by same cap. Saved graph includes collection cost, not invented free
discarded work. Independent verifier checks full legal tree and cost; independent
witness checker recomputes both passes/policies without importing runtime,
collector or its derivation helper.

Authored pilot<=12: E143 Qd8+ root predicts ...Kg7 Qg8#, desired own Qg8 mate
within2plies; wrong target Qg7 should retain resolved outcome without target
policy; bound1 should stay unresolved; already terminal Qg8# should stop but not
claim backward calculation; missing history and zero budget abstain. Reflect
colors. Focused tests add live losing actual move, mechanical terminal draw,
real longer history, repetition/clock refusal, terminal/edge/history/goal/rank/
summary mutations, fresh/cache equality and exact/one-short budget.

Run a cheap smoke before expanding. Retain guarded compressed raw trees and
pilot with exact source/input/history/configuration/environment/output hashes,
receipt and preregistration revision plus working-source bindings. No engine,
tablebase, real game or imported diagram use. Focused tests and representative
E145 parent checks, independent saved semantic replay, source verification and
diff checks. Combined regression/occurrence/priority/history/budget audits,
exact main/repeat/clean reproductions, general stable nonmating evaluation and
real-game precision/usefulness deferred. Accepted/production/numerical unchanged;
full catalog including positional compensation and named defenses stays open.
