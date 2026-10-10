# E155 — recorded material advantage converted through a certified mate policy

2026-10-10 before implementation/evaluation. Parent E15441d1782. Authorized
current main, research-only/local commits/no push. D001-test preflight passed.
BUILD-FIRST focused checks/tiny authored pilot, no cumulative/lengthy tests.

Original C0298 conversion: turning an advantage into a win. Require an actual
earlier positive nominal actor balance (p1/n3/b3/r5/q9/k0), a legal recorded
own move starting that span, a complete all-defense mating policy after it,
every subsequent recorded choice following winning proof nodes, and actual
current move delivering checkmate. This is a completed history-backed bounded
conversion of a nominal edge; mere present advantage, predicted eventual win,
opponent-cooperative mate, equal/down material and best-play efficiency do not
qualify. Positional advantage and long general conversion technique stay open.

Full actual history required. conversionStartPly integer0..1000 default0 selects
an own-turn prefix within actual history, at least two historical plies before
current actual move. Earlier prefix is retained, including clocks/repetition.
The first recorded move at that index is actual, not a hypothetical replacement.
Its true before position supplies the initial balance. Use frozen E146
collectTree/verifyTree with context={fen:that earlier frame,history:full prefix,
move:first recorded own move,retrogradeCalculationPlies:H}; its complete tree
starts AFTER that first move. Do not edit E146. H=conversionPlies integer0..4
default2 bounds continuation after first move, total span at most H+1 plies.
If recorded remaining span plus actual current move exceeds H, report explicit
horizon prerequisite before collection. Wrong-turn/too-late start is a context
prerequisite; malformed types/history/illegal actual remain strict errors.

Retain every legal move at every branch, all failed/frontier/draw/mate leaves,
SAN/FEN/turn/remaining/terminal outcome and complete edges. E146 raw graph's
unresolved frontier is not a loss or proof of no eventual mate. Derive winner-
specific win/rank bottom-up: own node wins if ANY child wins; enemy node only
if ALL legal children win; actor mate rank0, no other leaf wins. Retain every
node value and complete winning policy: all winning own choices and all enemy
choices at visited winning nodes. No pruning failed raw branches.

Trace actual remaining history plus actual current move from graph root. Every
edge must be legal/present and every visited node must be actor-winning for the
conversion label. The final traced node must be actor checkmate and match true
current after FEN; span length>=3 includes an actual opponent reply. All
recorded own choices must preserve the certified win, even if another earlier
move wins faster. No shortest/best-conversion claim. Initial nominal balance
must be>=1. Explicitly distinguish mate reached after a refutable earlier move
from a forced policy. Any visited E146 claim node globally suppresses findings.

Interface default-false conversionTags wraps E154. Strict maxConversionNodes
integer0..50000 default50000, H/start controls above, optional conversionGraph
untrusted and independently admitted against the genuine earlier context.
Missing history/context/horizon reports prerequisites; budget exhaustion
atomically drops all new events/witness and preserves parent behavior. Events
qualityClaim:false and <=24words. Cost3wrapper+full history length (context,
material inventory, current endpoint)+raw E146 graph.nodes+one per bottom-up
tree node+one per traced remaining edge. Same cached/fresh logical charge.
Policy traversal is a deterministic view of solved nodes, not another search.

Prospective authored hypotheses, not outcomes: White Kg6 Qf7 versus Kh8,
recorded Qf6+/...Kg8 then actual Qg7#. Initial nominal edge9. Complete continuation
after Qf6+ should certify mate against all replies; actual trace ends in mate.
Add Black Nd7: ...Nxf6 should refute the earlier policy, although the recorded
...Kg8 still allows actual Qg7#. This must withhold certified conversion.
Add Black Qa8 instead: nominal balance0 should withhold material-edge conversion
even if the complete mating policy passes. Current Qe6+ instead of Qg7# should
withhold completed conversion. Both colors, short horizon/missing history/zero
cap controls. Check E146 cache keys first; reuse exact compatible observations,
otherwise retain three smoke panels and reuse them for collection. Genuine
prefix/history examples, promotion/material changes, role/terminal/claim guards,
strict/default-disabled/exact-budget and independent graph/value/policy/trace/
edge/balance/history/event mutations. <=16 authored/reflected pilot cases.

Every chess/evidence entrypoint guarded with D001-test receipt. No acquired
game, external diagram, engine or tablebase. Source/input-bound neutral cache;
independent saved semantic replay imports neither detector, context builder,
collector nor outcome/policy derivation helper, but may reuse frozen independent
E146 legal-tree admission. Retain failed hypotheses, exact revision/source closure,
environment/commands/null engine+seed/output hashes. Soft compressed target150KB;
no branch omissions or costly storage-only optimization. Source verification/diff.
Defer combined regression/occurrence/absence/priority/history/budget audits,
exact main/repeat/initially-clean reproductions, broad strategic validity and
real-game precision/usefulness. Accepted/production/numerical/shared policy
unchanged; full catalog remains open. Next C0300/C0301/C0303 require different
positional comparison evidence, not relabeling nominal conversion.
