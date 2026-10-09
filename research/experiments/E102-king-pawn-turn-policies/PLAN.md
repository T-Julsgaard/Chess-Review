# E102 full king-pawn continuations and bounded turn sensitivity

Preregistered2026-10-09; same isolated branch/checkouts, clean sharedd22290c,
no live mutable frozen run. Twelve scopes C0272/C0273/C0611/C0634 and
C0614/C0652/C0766/C0983,C0615/C0767,C0384/C0604. New full legal king/pawn
continuations extend E037 pawn-only routes; do not relabel or regenerate unchanged
accepted E079 central-king evidence. Common-coach finite ending priority.

Default-disabled kingPawnPolicyTags wraps E101. kingPawnPlies integer0..10
(default6),maxKingPawnPolicyNodes integer0..50000(default50000). Atomic new
exhaustion preserves parent events/comment. Admit only exactly two kings and
one actual actor pawn, actual king move, nonterminal before/after, full supplied
legal history. No castling/EP ambiguity in admitted three-man pawn ending.

Queen-survival objective: same tracked pawn reaches queen, mate by promotion
wins immediately; otherwise queen and positive nominal promotion gain survive
EVERY next legal enemy reply without terminal draw/checkmate against actor.
Full minimax permits ALL legal actor king and pawn moves, ALL legal enemy moves;
nonqueen underpromotion has explicit non-goal leaf, not a statement that it is
bad. Complete failure proof includes all actor alternatives and chosen enemy
counterresponses/finite-limit leaves. Never infer unbounded draw/safety from it.
Use library-known full-history draw terminals, disclosed finite semantics.
No tablebase,optimal winning status,DTM or DTZ claim.

Compare full king/pawn policy to pawn-only policy at SAME ply bound. Positive
full route and complete pawn-only failure demonstrates required king continuation
within that bound. C0384/C0604 additionally actual king arrives on d4/e4/d5/e5;
benefit limited to this horizon, broader enduring safety/value still unresolved.
C0272/C0273/C0611/C0634: actual king entry has surviving promotion policy;
unchanged-before arrangement in labelled enemy-turn snapshot has complete
no-route policy at same bound. Only king square changed, not a global key-square
formula or complete theory. Keep clocks; clear EP in hypothetical turn frame.

Turn sensitivity: current actual enemy-to-move ending has surviving promotion
policy, labelled same-placement actor-to-move frame has complete no-route proof
at same bound. Bounded defender zugzwang/pawn-side promotion versus prevention
roles and bounded mutual turn disadvantage; full win/draw and universal zugzwang
remain unresolved. Synthetic turn switch is an explicit comparison, not a legal
null move/history extension. Skip side-flip comparison if it puts nonmoving king
in check. No permanent lost-position/optimal-choice assertion.

Preregister positive/negative/reflected synthetic fixtures, goal/survival and
underpromotion semantics, independent full saved tree/absence replay, strict
inputs/history/controls,disabled parent equality and early/late exact-budget
atomicity. Focused E102 plus E101/E037/E079 dependencies,cheap guarded pilot,
full normalized source closure,source/staged diff,INDEX prototype and no accepted
tracker advancement. Defer combined full regression,interaction/history/priority/
budget matrix,exact main/repeat/initially-clean reproduction,original occurrence
audit and real-game usefulness. Entire original catalog remains in scope.
