# E029: bounded forced-mate and missed-mate proofs

Registered 2026-10-07 before evaluation. Import frozen E028. Engine-free,
authored synthetic development positions; no game sample or extension changes.

## Query profiles and candidate

`mateDepth=0` (default) returns the frozen parent exactly. Explicit research
profiles 2 or 3 analyze the selected move through that many attacker moves,
with maxMateNodes <=50,000 shared across iterative depths and comparisons.
This expensive mode is opt-in; the working demo fixtures enable it. Inherited
mechanics are replayed under profile 0, not represented as deep-search samples.
`compareAlternatives` defaults true; false is a selected-move-only proof query,
without any optimality statement. Reject invalid profile/budget/comparison flags.

After the actual played move, search 2 remaining plies for mate in two and,
if requested and no shorter proof, 4 for mate in three. Attacker nodes are
existential legal choices; defender nodes are universal legal replies. A
winning terminal is actual opponent checkmate. Counter-mate, draw and nonmate
horizon leaves lose for this bounded property. Checkmate is tested before draw
thresholds. Retain full winning all-defense witnesses and bounded negative
counterstrategy trees: at attacker failure every legal choice loses; at defender
failure one legal counterchoice suffices. Do not cache by FEN and lose history.

Replay verified input history for actual and alternative searches. FEN-only
inputs cannot prove earlier repetition; new deep queries reject terminal history
roots. Played mate in one stays with existing specific mate labels. A terminal
draw after played move may support a missed-mate counterfactual.

When comparison enabled, search the original position for mate in one, two and
three up to profile. Emit missed-mate only when a shorter alternative has a
positive all-defense certificate and the played move has a complete negative
certificate at that same bound. Name its SAN move and scope, never call it the
only best move or a loss of all mating chances. For stalemate, say actual move
causes stalemate when a mate-in-one alternative is proven. Alternative may not
be the played move. A non-shorter alternative does not replace a proven actual
mate label. All E029 new claims drop on shared exhaustion, even if an earlier
subsearch completed; parent facts remain. Comments <=24 words; warnings and
specific actual terminal mates keep higher priority.

## Gates

Author quiet/checking forced mate in two/three, shorter missed mate, stalemate
miss, clock/history draw, unchanged/nonforced continuation and exhaustion;
rank/color reflect all applicable cases. Wrong depth, counter-mate, terminal
roots and invalid profiles refuse or abstain. Independent tree replay checks
every required legal reply/choice, player turns, terminal type, horizon and
leaf FEN. Missing/duplicate branches, changed move/winner/depth/FEN/outcome and
positive/negative mismatch must fail. Small-budget failure must not yield claims.
Explicit selected-move-only examples do not imply fastest play.

Guard D001 before dynamic fixtures. Test all prior mechanics and certificates
under profile 0, then authored deep cases; source integrity stays green.
Retain full new trees and inherited fingerprints, profile/budget metadata,
normalized hashes, revision, guarded receipt, commands/environment/timing.
Repeat and initially clean checkout must match deterministic output/source
hashes. Pilot before full run; estimate <=180 seconds and <=3 MB evidence for
the authored batch. Amend exposed costs/failures instead of hiding them.

Coach goal/cutoff active; numerical research paused. Near 10% remaining in the
actual 300-minute window checkpoint/commit, disable cutoff heartbeat and
perform authorized normal shutdown without /f. No integration or pushes.

## Exposed implementation notes

An initial missed-two candidate Nd8-c6 actually retained mate in two through
queen back-rank clearance. It correctly withheld the missed-mate label and is
retained as an equivalent-fast-mate negative. A proposed mate-already-played
setup illegally checked the nonmoving king; Qf7-h7 supplies a legal positive.
The mate-in-three proof branches, so its comment states the all-defense claim
instead of presenting a single continuation as forced. Unique lines include
SAN and actual black-move ellipses; a shared final mating move is named only
when every legal defense permits that same move and notation.

The frozen demo assumes material-proof reply arrays. A display-only adapter
supplies first-defense tree branches to its counter; canonical mate certificates
retain their full tree schema. No frozen implementation is modified. The
cumulative development tests passed before this extra negative was added;
the amended batch is rerun before source commit and retained evaluation.
