# E130 — timely castling versus a pawn delay

2026-10-10. Parent E129 fe86df0. User-authorized current checkout, local
commits only. BUILD-FIRST: focused development, small synthetic pilot; no long
cumulative tests. Next earlier compatible opening family C0141/C0143, with
C0856 sharing its complete alternative machinery. Position-type taxonomies and
named rook outcomes need separately declared definitions/outcome evidence.

Claims: C0141 early castling removes all next-move enemy mates while a legal
quiet pawn alternative preserves a pre-existing mate; C0143 early pawn delay
preserves such a mate while a legal castle removes all next-move enemy mates;
C0856 the same concrete pawn-delay warning without an opening-history claim.
These are finite tactical examples of the original advice, not global move
quality, universal necessity, enduring safety or complete strategic coverage.

Interface: default-false castlingTimingTags; strict maxCastlingTimingNodes integer
0..50000 default50000. Disabled exactly E129. Atomic exhaustion retains parent
events/comment. No implicit parent flags. Require legal actual/history and live
root/actual. Actual is a legal castle or quiet nonpromoting pawn move.
Early means validated full history starting at canonical standard initial FEN,
at most20 prior plies; state this operational window, not a chess theorem.

Retain EVERY root legal move and EVERY legal castle/quiet nonpromotion pawn
alternative. For each relevant alternative, replay the actual history and save
the complete sorted enemy legal move inventory, child FEN, mate and draw flags;
never stop at first mate. Terminal alternative roots cannot certify live safety.
Save complete actual panel. Pre-existing threat uses a separately validated fresh
before-placement frame with opponent to move, EP cleared and counters retained;
this is hypothetical, not a legal pass or available actor alternative. Record
every legal enemy move and require a common exact mating UCI in prior/actual or
prior/delaying-pawn panels. No inherited repetition silently assigned to this
fresh frame. For a pawn warning additionally restore only the advanced pawn on
the actual after placement, clear EP and validate legality: the same pre-existing
mate must remain there too. All alternative live/draw facts use full history.
No arbitrary material cap, engine or positive assessment from absence alone.

Expected authored standard route e4 e5 Nf3 Nc6 Be2 Bc5 Nc3 Qh4: O-O should
remove immediate mates, a3 should retain Qxf2#, and g3 should neutralize it.
This is a hypothesis, not inspected evaluation. Include missing/nonstandard and
late history, no threat, no castle, captures, nonpawn, terminal states, both
colors, strict flags/budgets, exact exhaustion and parent preservation.

Independent checker imports neither candidate nor its panel helper: reconstruct
full legal history, all root alternatives and all reply children with chess.js,
fresh/restored counterfactuals, mate intersections, early predicate and exact
labels. Mutate missing alternatives/replies, mate flags, history, clock, prior
turn and pawn restoration; reject every corrupted witness. Guarded authored
D001-test pilot <=32 cases, retained compressed proofs and full source closure.

Deferred combined full regression; exhaustive absence/priority/history/budget/
interaction/original-occurrence audit; exact main/repeat/initially clean
reproductions; real-game precision and independent teaching usefulness. Keep
accepted E082 tracker and production/numerical behavior unchanged.
