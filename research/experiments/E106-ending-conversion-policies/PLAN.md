# E106 combined ending-conversion policies

2026-10-09, prospective build-first batch. Source prior E105 2d3fc0b.
Reuse existing isolated branch only; no extension or numerical changes.

Register original scopes C0602 endgame transition and C0977 simplified position:
actual legal capture removes last non-pawn piece, leaves pawn ending, and complete
finite actor policy reaches mate OR tracked queen with positive nominal gain and
survival through every immediate enemy reply. Compare actual known history with
legal root alternatives under equal horizon. No claim of unbounded winning or
optimal simplification. C0738 rook versus bishop and C0739 rook versus knight:
actual rook captures last enemy bishop/knight in exact K+R+P versus K+minor,
retains K+R+P versus K and proves same combined conversion goal. Broader technical
endings, tablebases and strategic choice remain pending.

New callable combined policy prerequisite counts earlier mate by ANY actor unit
as success. One minimax over the OR goal, not two separately failed queries.
Complete legal move inventories and full actual histories; terminal draw before
queen goal, actor mate succeeds, enemy mate fails. Queen goal requires tracked
identity, gain from query root, every legal enemy reply preserving that queen,
positive gain and no draw/enemy mate. An actor checkmate after enemy reply also
succeeds. Promotions/underpromotions and all units' continuations remain legal.
No transposition cache initially. Canonical UCI ordering; deterministic complete
winning strategy or complete negative counterpolicy at finite bound.

Interface endingConversionTags default false wraps unchanged E105;
endingConversionPlies integer0..6 default4; maxEndingConversionNodes0..50000.
Shared atomic budget for actual and alternatives; exhaustion emits no new label
or partial witness. Comments max24 words, explicitly finite goal. Strict legal
input/history and disabled equality. Parent accepted behavior untouched.

Focused positives/negatives: pawn-ending capture near promotion; rook captures
bishop/knight near promotion; earlier rook mate counts; enemy mate/draw/captured
tracked pawn/nonqueen promotion; zero horizon/budget; both colors, clocks, known
history, serialization and independent tree mutation rejection. Cheap authored
D001 guarded pilot. Register before evaluating hypotheses; retain failed cases.

Independent saved replay reconstructs full legal histories, goals, inventories,
quantifiers and exact labels without solver imports. Source closure and fixtures
hash-bound; build.json only when complete claimed callable behavior passes.
Deferred combined cumulative regression, semantic/interaction/priority/history/
budget checks, exact frozen main/repeat/initially-clean reproductions, occurrence
audit, tablebase/general conversion and real-game usefulness. Keep all1085 ideas.
Scheduling deviation: phase4 rook/minor conversion shares prerequisite and legal
inputs with phase2 simplification; arbitrary geometrical strategic facts avoided.
