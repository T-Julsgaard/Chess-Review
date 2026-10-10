# E135 — completed rook bridges and recorded Lucena conversions

2026-10-10, before implementation/evaluation. Parent E1341b6bcfb. Current main
authorized; research only, local commits/no push. Follow BUILD-FIRST.md.

C0669: actual quiet rook interposition on relative rank4, between a checking
enemy rook and own king on the pawn file, king adjacent to/supporting the shield,
in pure K+R+nonrook-file seventh-rank P versus K+R. Complete finite legal policy
after actual move must force the tracked pawn's queen promotion, surviving every
immediate enemy reply with material gain at least8 versus before actual. This
allows a reciprocal rook exchange but excludes sacrificing the rook for a queen
that leaves the defender's rook. No draw/win or best-move inference.

C0668: additionally supplied full legal history starts with nonrook-file pawn
on relative7, king on its promotion square, attacking rook on a completely clear
file strictly between pawn and defending king, defender king at least2files away.
Trace exact pawn/rook identity throughout history: no pawn progress, capture or
promotion; retain full history and cutoff route. Current actual bridge and full
promotion proof required. Name this recorded Lucena bridge completion, not a
classifier of every Lucena position or proof of ultimate mate. Initial rook
cutoff is an explicit unobstructed file, not a vague distance heuristic.

Defaultfalse rookBridgeTags, strict maxRookBridgeNodes integer0..50000 default50000,
rookBridgePlies integer0..6 default4. Disabled exactly E134, no implicit parent
flags. Budget ticks every state/edge/probe/historymove; extra exhaustion atomically
preserves parent. Complete actual/full-history legality and live root/actual;
rights/EP absent. Query OR own moves AND all enemy replies, retained chosen/all
branches and explicit negative trees. Queen survival probe one ply beyond horizon;
retain material ledger. Terminal positions before goal fail operational test.
No memoization initially: short finite horizon and capped cheap pilots. Retain
all required proof branches, legal inventory and failure leaves. Independent
checker imports no solver or detector, reconstructs initial cutoff, full history,
actual check ray/interposition/king support, identities, every move/queen probe,
balances and exact events. Full chess.js history supplies draw/repetition checks.

Prospective authored core Kc5 Pc7 Rd4 versus Kf7 Rc1, Rc4 H4 should promote or
exchange rooks then promote. Lucena history starts Kc8 Pc7 Rd4 versus Kf7 Rc1:
Kb7 Rb1+ Kc6 Rc1+ Kb5 Rb1+ Kc5 Rc1+, then actual Rc4. Verify actual legal
sequence; if invalid retain hypothesis and amend openly before replacement test.
Both colors, short H0, wrong geometry/profile, rook-file pawn, unsupported shield,
clock99 terminal, exact budget, zero budget, history mismatch, no-history versus
full-history event scope, strict/disabled/enabled-parent preservation and proof
mutations. <=18 authored pilot cases, estimate <=50000ticks per call; smoke fixed
budget first, no expensive retries. D001 test guard receipt in pilot/replayer;
no acquired games/engine/tablebases. Preflight before tests. Source closure hashes,
independent saved replay, source verification and diff checks required.

Queue deviation: perpetual attack needs sustainable nonchecking recurrence,
long/short-side and Philidor/Vancura outcome guarantees need deeper policy or
tablebase inputs. Preserve these scopes, do not replace them with board shapes.
This shared bridge/history/promotion batch is the next coherent finite rook work.
Deferred combined cumulative regression, exhaustive interactions/priority/absence/
history/budget/original-occurrence audit, exact main/repeat/initially clean
reproductions, real-game precision/usefulness and general winning conversion.
Accepted tracker, numerical research and production unchanged.

## Prospective additional refutation control, 2026-10-10

Initial42 focused checks and18case pilot passed (4 positives,2 exhaustions).
Before evaluating it, add authored Kc5/Pc7/Re4 versus Kd7/Rc1, Rc4 H4:
the bridge geometry should pass but ...Kxc7 should refute promotion. This tests
policy necessity beyond a zero-ply limit. Retain both colors, increase small pilot
to20cases, same budgets/goals. Keep original18case run at runs/E135/final and
new evaluation at runs/E135/final20. Additional negative is development-selected,
not a fresh confirmation set; no original failed observation is removed.
