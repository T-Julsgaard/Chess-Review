# E116 legal center influence, pawn restraint and entry squares

2026-10-09 prospective build-first batch, parent E1152a4670b. Current main
authorized; research/local commits/no push. Compatible phase3 scopes C0139 control
the center, C0181 fluid center, C0658 fixing pawns, C0718 fixing pawns on bishop's
color and C0659 creating entry squares share complete legal inventories and
next-turn policies. General opening advice remains unresolved, not relabeled.

C0139: actual noncapturing nonpromoting nonking relocation directly attacks
d4/e4/d5/e5. An opponent king entry to such a square is unavailable in actual
position, but becomes legal in BOTH legal fresh removed-mover and restored-mover
frames. Same enemy king origin and UCI move required, moved unit must attack
target. No rights, clear EP in artificial frames, preserve turn/post clocks;
illegal controls abstain. Proves causal central flight denial, not best central
control or advantage. Removal/restoration are comparisons, not legal moves.

C0181: full actual opponent pawn move inventory has at least two continuations
from distinct pawns changing the central c..f/ranks3..6 pawn inventory to distinct
placements. Retain every such legal continuation/profile, including captures/EP.
This names unresolved legal choices, not strategic desirability or forced change.

C0658: actual straight nonpromoting pawn advance newly blocks an opposing pawn
directly ahead. Opposing pawn has no actual legal move; legal removed-blocker
frame restores at least one legal move of that same pawn. EVERY actual opponent
reply must preserve both pawns and leave the actor blocker intact; the enemy
pawn cannot move during that turn. Temporary all-reply restraint only, no lasting
fixation. C0718 adds SAME-color friendly bishop and, after EVERY opponent reply,
legal bishop capture of fixed pawn with E022 positive material certification
through every next enemy reply. Retain complete positive/negative bishop trials;
no bishop usefulness inferred merely from matching square colors.

C0659: actual nonpromoting pawn advance vacates a central c..f/ranks3..6 square.
One stationary actor nonking/nonpawn unit can enter it after EVERY legal opponent
reply. Full legal enemy response inventory after each entry has no capture of
that unit (normal/EP victim identity), and entry is nonterminal. Before move the
square was occupied by actor pawn; prove same entrant identity survives. This is
a bounded new entry resource, not indefinite safety or strategic penetration.
Retain failed entrant trials; deterministic square order selects first success.

Interface centerRestraintTags defaultfalse wraps E115; maxCenterRestraintNodes
integer0..50000 default50000. Shared atomic budget across history, legal frames,
every reply/trial/certificate/event. Actual terminal after suppresses new labels.
Strict input/history/disabled equality; <=24word text,qualityClaim:false.
Commit before evaluation. Authored both-color positives and negatives: central
king flight restored by moving controller back, blocked e5 against e4 with dark
bishop b2 and optional Ng2 entry to vacated e3, central captures from c5/e5 into
d4. Geometry-only, blocked controller/illegal frame, mobile/capturable blocker,
wrong bishop/failed capture, unsafe/captured entrant, singleton/same-origin center
choices, histories/EP/clocks/terminal/strict/exact atomic budget and JSON/neutral
proof/inventory/frame/label mutations. Cheap guarded D001 synthetic pilot.

Independent checker reconstructs full legal histories/frames/branch inventories,
every reply and certificate without detector import. No engine/search or games.
Source/test/fixture closure hash-bound. Deferred cumulative regression, exhaustive
integration/absence/priority/history/budget/occurrence audit, exact frozen changed
main/repeat/initially-clean reproductions and real-game teaching usefulness.
Preserve original wider scopes and all accepted/provisional evidence.
