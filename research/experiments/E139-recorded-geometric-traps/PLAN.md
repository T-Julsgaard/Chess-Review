# E139 — recorded joint knight trapping combinations

2026-10-10 before decisive evaluation. Parent E138 ed26db5. Current main is
user-authorized, research-only local commits/no push. BUILD-FIRST.md applies.

C0944: legal recorded quiet knight preparation, quiet enemy reply, then a second
distinct quiet knight move establish an all-defense target-capture policy.
C0929: explicit knight offsets and joint geometric contact with that same target,
with each arrival independently necessary for the quantified material policy.
Neither a label/shape alone nor hidden combination intent is inferred. Broader
geometric tactics, arbitrary-length combinations and lasting outcomes unresolved.

Default-false recordedTrapTags wraps E138 without implicit parent flags. Strict
maxRecordedTrapNodes integer0..50000 default50000, shared across history, complete
legal policy enumeration, both restored-position controls and event construction.
Exhaustion atomically preserves parent events/comment and clears extra witnesses.
Missing two-ply supplied history, captures/promotions, same knight twice, terminal
boards, occupied restoration origins or illegal controls cannot receive labels.
Require no castling rights/EP at final frame for these explicit placement controls.

Use full actual legal history. Enemy nonpawn/nonking target must occupy the same
square/type throughout the two recorded plies and actual move. Both knights must
newly contact it from actual destinations, neither old origin may attack it.
Actual target may move on a defensive reply: track its new square. For EVERY legal
enemy defense enumerate EVERY legal immediate capture of that same target and
EVERY enemy reply after each capture. Actor signed nominal material gain relative
to pre-defense root must stay strictly positive after capture and every reply;
draws and actor checkmate refute, real actor-delivered mate may terminate early.
Include defense captures/promotions in root-relative gain. No vacuous success
for terminal/zero-reply/drawn/claim-sensitive roots. Full actual histories retain
draw rules; bounded three-ply guarantee, not long-term conversion or best play.

Restore each knight separately to its recorded origin on final position, leaving
all other units/turn/counters unchanged. Controls are explicitly hypothetical
placement frames with FEN-root history, not alternate legal historical lines.
Require legal, live controls and COMPLETE target-capture policy failure for both.
Retain legal moves, every candidate capture/counterreply/gain/terminal status and
success/failure so independent replay checks necessity rather than assumes it.

Authored prospective pilot: start K a1, white knights b5/d5; black K g8,Q a8,
B b8,pawns a7/b7; no white pawns. Recorded Nd5-b6, Kg8-h8, actual Nb5-c7.
Hypothesis: b7xb6 or Bb8xc7 removes only one knight, allowing other to capture
Qa8 with root-positive gain. Restore either knight and the corresponding
defensive capture should refute. Also mirrored colors, missing preparation,
same-unit history, target escape/removal, unrelated preparation, illegal history,
strict flags/budget, disabled/parent and atomic budget boundaries. Preserve failed
hypotheses; no fixtures evaluated yet. No acquired games or new engine searches.

Guard every runner/test entry with D001 test; synthetic authored mechanics only.
Independent checker imports no detector/query/helper, reconstructs history,
knight offsets, full legal policies, restoration frames, exact events. Cheap
focused tests, small guarded pilot, saved semantic replay, full source fingerprints,
source verification/diff. Commit plan before decisive evaluation. No cumulative
or long tests. Combined regression, exhaustive integration/occurrence audit,
exact main/repeat/clean reproductions and real-game usefulness remain deferred.

Queue deviation: sustained rook defenses/perpetual strategies/full outcomes need
stronger endgame-policy or tablebase provenance; tiny E138 scores cannot supply
those guarantees. This batch addresses remaining finite tactical claims in queue
order without substituting static geometry for quantified consequences.

## Development observation, 2026-10-10

First fixture import failed because the reused reflection helper expects a whole
fixture rather than a FEN string; corrected that call before any query ran.
The first guarded positive query passes455ticks. Actual defensive pawn capture
is a7xb6, not the initially hypothesized b7xb6 (a pawn cannot capture forward).
Original hypothesis retained above. The second control also fails on Bb8-e5,
besides removal of the attacking knight. No query/objective/budget changes.
After inspecting this result, add an explicit authored countermate negative and
threefold-eligible helper check for development coverage; neither is fresh
confirmation. Comment wording explicitly states the three-ply material horizon.
