# E186 — minor-piece type comparisons across declared pawn contexts

2026-10-11. Parent E185 2a8ff21. BUILD-FIRST; authorized current main,
research-only local commits/no push. Prospective compatible family C0711 open
position favors bishop, C0712 closed position favors knight, C0714 fixed pawns
can favor knight. Each occurrence needs its own actual positive/negative gate;
do not count a shared implementation or hypothetical case ready by itself.

Explicit default-disabled evaluateMinorContext/inspectMinorContext(input,options).
Input exact fen/UCI move/genuine full history. Options enabled boolean default
false, pawn square, contextMoves array1..6 of {from,to}, plies integer0..4
default2, maxNodes integer0..50000default50000, optional five-query proofs.
Strict ordinary data/unknown-key/UCI/ownership/material/identity controls.
Missing history/pawn/context/proofs report prerequisites. No production events.

Armies: kings, exactly one own B/N and one enemy B/N, 1..6 total pawns,
at most10units; tracked pawn is actor's own pawn. No castling or EP context.
Live source and actual; actual quiet nonchecking B/N move, root not in check.
Context moves simultaneously relocate ONLY existing distinct pawns, preserving
color/type/count/identity. No promotion-rank placement, king/minor relocation,
occupied unrelated target, duplicate source/destination or tracked-pawn move.
Both reconstructed context BEFORE and context AFTER must be legal/live; same
actual minor move must be legal, quiet and nonchecking in that fresh counterroot.
Use real actual clocks/turn and preserve material, clear EP (already absent).
The context is explicitly artificial, never a claimed genuine alternate history.

Operational center rule matches frozen E133: open=no d/e-file pawns; closed=
direct white-below-black enemy-pawn locks on BOTH d/e files and every central
pawn's forward square occupied by an enemy pawn. Other/split structures cannot
discharge open/closed gates. This is a declared local taxonomy, not a validated
universal openness score. Retain all pawns/fronts/locks. Adapt locally without
editing frozen E133 runtime or its source-bound results.

Five full policies, all same H, same ORIGINAL before nominal balance and atomic
cap: actual genuine-history piece; fresh actual; equally valued own B<->N at
actual square (fresh); pawn-context actual piece (fresh); pawn-context equal-value
replacement (fresh). All replacement frames must be legal/live. Reuse unchanged
E184 tracedConversionQuery (E106 goal/search/order, full failed-choice prefixes).
Extend independent E106 semantic replay locally to admit ALL tried prefixes for
general material, including tracked pawn loss with other units; E184's pure-KPK
null-pawn shortcut cannot admit that richer case. Retain full legal inventories,
underpromotions, queen counterreplies and full history. Any visited claim context
suppresses all labels. Unresolved leaves mean only same-goal bounded failure.

Actual and fresh actual must both convert; own equal-value replacement must fail.
The context must be the opposite open/closed category and both contextual piece
types must have the SAME goal value (both win or both fail). Thus an observed
finite type advantage changes across material-matched declared pawn placements.
Source open + own B => C0711. Source closed + own N => C0712 and C0714 (exact
two-file locks only). These are concrete type/goal/context comparisons, not a
causal theorem that openness alone explains the difference or generic good/bad
piece quality. Pawn moves can change other features; keep that limit explicit.

Atomic work: setup/history/context edits/taxonomy + exact query node/edge/queen-
reply ticks; fresh/saved equality. Saved semantic admission is not hash-only.
On exhaustion discard all five queries, frames and positives. No cache of passed
meaning or unchanged expensive searches; preserve proof/source/input bindings.

First authored hypothesis BEFORE any decisive evaluation: White Ka6 Pc7 Pa2 Ph2
Bg8 / Black Ke8 Nh8 Pa7 Ph7, actual Bg8-e6, H2. Context relocations White a2-d6,
h2-e4, Black a7-d7,h7-e5, preserving same pawn count. Open B resource should
exclude ...Kd7 while equal-valued Ne6 need not; closed d7 blocker may remove this
type difference. Reflect colors through real replay. C0712/C0714 have no authored
positive yet; register later hypotheses before evaluation and never fake readiness.

Audit reuse before collection: no E109 exact armies (more than one own pawn),
no E133 comparative conversion policies and no E184/E185 matching roots/source/
goal interfaces. Collect only two initial small panels if eligible; retain their
failures if hypothesis or cap fails. Do not increase bound/cap after failure.
Focused per-claim positive/negative/strict/history/disabled/claim/mutation/exact/
one-short checks and a cheap pilot; source/diff verification and independent
saved replay. Defer combined regression, exhaustive occurrence/absence/priority/
history/budget audit and changed main/repeat/initially clean reproductions.
