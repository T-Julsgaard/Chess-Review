# E120 — mating move-order comparison

2026-10-09 preregistered under build-first; parent E119. C0761 move-order trick,
C0769 forcing move order. Phase4 dependency grouped with phase3 shared machinery.
C0467 perpetual attack remains unresolved: finite tactics cannot prove infinity.

Default-false moveOrderTags; orderFollowup strict UCI required when enabled;
orderTailPlies safe integer0..2 default0; maxMoveOrderNodes integer0..50000
default50000. Disabled exactly E119. One atomic budget, exhaustion drops new
facts only. Validated live history, <=10 units. Actual A and selected B must be
different own nonpawn pieces (king allowed), quiet/nonpromotion legal alternatives
at root. A must leave a live board. B's coordinates remain the same across replies.

Enumerate ALL legal opponent replies after A in UCI order. After each, same B
must be legal and quiet/nonpromotion; query full actor mate at tail H0..2 after B.
Stop at first failure, retaining exact complete reply list and branch prefix.
All must succeed. Reverse B as initial move on actual history; full actor mate
query at H+2 must FAIL, including all winning alternatives rather than only A.
Thus comparison is same three-ply sequence plus H continuation, with exact clocks
and history, and opponent can defeat every actor continuation in reversed order.
C0761 asserts this bounded order dependence. C0769 additionally actual A checks
and every opponent check-evasion still permits same winning B. No hidden intent,
general optimality, speedup or material/strategic claim.

Witness retains inventories, root A/B moves, all legal defenses, followup SAN/
FEN and full mate proofs, reverse move/position and full negative proof. Reuse
E029 solver and neutral semantic replay, E024 history; no new engine or solver.
Independent checker reconstructs history/root alternatives/full defense inventory,
failed prefixes and all mate trees without candidate/solver import.

Focused both colors, positive forced check order, reverse also wins, illegal B,
different-piece/quiet gates, lost followup after reply, tail/depth, terminal/clock,
history, strict/disabled and atomic budget controls. Small guarded synthetic pilot,
source/diff checks. No cumulative historical tests. D001 test preflight passed.
No acquired games/labels/production. Preregister before evaluation; retain failures.
Defer full combined regression, exhaustive history/integration/priority/absence/
budget/occurrence audit, frozen main/repeat/clean and real-game usefulness.
