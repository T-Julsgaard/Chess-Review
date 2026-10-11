# E188 — move-order finesse and concrete opponent capture resources

2026-10-11. Prospective BUILD-FIRST batch, parentE1871674d2e. Current main
research-only local commits/no push; standing user checkout exception persists.
E120 findings inspected: exposed authored development, not new confirmation.

Three original occurrence scopes, separate gates:
- C0768 move-order finesse: complete actual A / EVERY legal enemy defense / fixed
  quiet B / certified own mate at H, while full mate query after B first fails
  at H+2. Both original nonpawn units distinct, A/B legal noncapturing,
  nonpromoting/noncastling, current A leaves live frame. Equal continuation bound,
  actual complete history and clocks. No unique-best-order or hidden design claim.
- C0771 opponent's idea: in the GENUINE after-actual frame, a specified legal
  enemy capture of an own nonking unit guarantees strictly positive nominal
  material through EVERY immediate legal counterreply, all live and claim-free.
  Retain full legal inventory/capture/counterreply states and gains. This is an
  objective concrete resource, never the player's private intention or all plans.
- C0776 removing counterplay: actual A is a check and passes the full C0768 order
  gate. The B-first legal alternative gives a positive enemy capture certificate
  of the same original A-unit on its original square. After actual A that SAME
  unit on its actual destination has NO legal enemy capture in the full reply
  inventory. Thus checking-first removes that specific certified material
  resource and mates after every defense. Other strategic/nonmaterial counterplay
  is not declared absent. Explicit reversed frame is a legal B-first alternative,
  never an artificial opponent turn or genuine recorded history.

API evaluateOrderResources(input,options) collects; inspectOrderResources(input,
options,proofs) admits only supplied proofs. Default enabled=false; tailPlies0..2
default0, maxNodes0..50000 default50000. Input legal fen, actual UCI move,
followup UCI (distinct root unit), explicit genuine history. Missing history or
followup abstains; malformed/illegal controls reject. <=10 units. Terminal or
ineligible comparisons abstain. Atomic exhaustion discards all own proofs/labels.
Any fifty/threefold claim in source exploration, capture matrices or branch
frames suppresses all three claims. Explicit ordinary-data admission.

Reuse audit before collection: E120 saved witnesses lack full exploration ticks
and full attempted-work accounting, and claim traversal is not part of that
certificate. Its independent checker bounds claimed cost but cannot establish
all discarded exploration work. Preserve frozen E120 unchanged; do not pretend
its saved successes are new complete-trace proofs. Reuse its fixtures and the
unchanged E144 tracedQuery/replayTrace machinery, collecting six tiny genuinely
new full-trace contexts (three authored roots/roles, both colors) at H0. Full
source/input/history/H/config keys differ from old untraced E120 observations.
Do not regenerate the E120 inherited corpus or run full historical tests.

Proof collection retains ALL actual defense branches, including failed followup
availability, and a full reverse query even when actual fixed order fails.
Capture matrices in actual and legal B-first frames retain EVERY legal enemy
capture of an own nonking unit and EVERY legal immediate counterreply, including
failed/nonpositive rows. Positive requires live capture/response frames, positive
gain after capture and every response, and no visited claim. Pawn/underpromotion/
EP counterreplies stay in complete inventories. Values are frozen VALUES,
not positional scores. E022 conservative countercapture semantics inform this
matrix; new collector/checker independently reconstruct it with full rows.

Logical work: setup2 +history.length; each actual defense branch2; full E144
query tick counts; each of the two capture frames1, each capture2 plus one per
counterreply; final derivation1. Collector and checker must independently agree
on exact total. Claim check observations are part of those visited frames, not
unreported extra queries. Max cap unchanged. All attempted branches retained.

Predeclared fixtures from E120: Kf6 Ra1 Bh5 Pg5 versus Kh8 Nc2. Ra8+ followed
by Bg6 after every defense: expect C0768/C0776. Reverse actual Bg6 with Ra8
followup: expect C0771 from ...Nxa1, no order/removal. Remove Nc2: both orders
mate, no enemy capture resource, all labels withheld. Both colors fixed before
own evaluation. Cheap six-context smoke cap50000; stop/document unexpected
outcomes. Raw collected once; focused checks reuse exact bound observations.

Focused gates: separate positive/functional-negative both colors, exact/short/
zero budgets, disabled/missing/strict controls, saved equality, history/claim and
own result/source trace/inventory/material/identity/cost mutations. Independent
checker imports no new runtime/context/collector/derive, only Chess, frozen
replayTrace and neutral ordinary-data helper. No heavy repeated parent panels.
Full separate pilot/replay, cumulative occurrence/absence/priority/history/budget
audit and changed main/repeat/initially clean reproduction deferred to combined
freeze. Focused source/result semantic admission is required now. No statistical
population claim, human precision metric, confidence interval or speed claim.
Soft retained evidence500KB; guarded D001-test receipt and complete recursive
parentE187/source/fixtures/plan/test/config hashes. No engine/tablebase/real games.

Existing C0785/C0786/C0787 typed prevention candidates E098 are reused unchanged,
not regenerated. C0784 neutralizing a strong piece needs a validated role/quality
rubric and causal neutralization beyond one captured unit; retained prerequisite,
no readiness credit. Full original catalog/broader scopes stay in scope.
