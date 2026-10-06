# E023: broader finite tactics and line motifs

Registered 2026-10-07 before evaluation. Research only; import frozen E022.
One deterministic candidate, no engine, seed, tuning or held-out game sample.

## Scope

Broaden newly created forks to every piece type and pawn targets. Require at
least two enemy targets geometrically attacked by the moved piece; at least
one target is new relative to its origin. A king target represents check only,
never capture. For each legal opponent defense require one legal capture of an
original non-king target by the same attacker; every immediate counterreply
must retain positive net nominal material relative to before the played move.
Reject defender terminal outcomes and counterreply mate/draw. A capture ending
in attacker mate is permitted. Retain full witnesses; 50,000 operation budget
for all E023 certificate work, exhaustion removes all new finite claims.
Do not duplicate an inherited E020 fork event. Triple attack requires >=3
targets and the same certificate; winning every target is not implied.

Double attack with discovered attack: moved piece and newly revealed stationary
slider(s) create attacks on at least two distinct enemy targets. Require that
each attacker contributes a target unavailable to it before, including at least
one moved-piece edge and one discovered edge. Every defender reply must admit
capture of an original target by one of those original attackers, then every
immediate counterreply retains positive net material. Attackers captured or
relocated by the defender cannot serve as the witness. No long-term gain claim.

Hanging-piece warning: after a played move, a legal opponent capture whose every
immediate response retains positive material for the opponent and has no draw
or mate against them. Contrast the moved piece's origin to avoid repeating an
existing vulnerability. One bounded witness for the selected square, not best
defense or inevitable loss. A "can gain material through immediate replies"
phrase is required. Captures can be profitable even with geometric defenders.

Line motifs are descriptive only: newly aligned enemy pairs on a slider ray
with exactly one intervening piece = x-ray attack; friendly target beyond
exactly one blocker = x-ray defense geometry. No legal capture/protection through
occupied squares or tactical gain promised. Interference: moved piece inserts
on an enemy slider's previously unobstructed attack line to another friendly
piece and that attack disappears; geometric protection only, not all attacks
eliminated. New multi-direction absolute pin on the same enemy blocker =
cross-pin geometric subset. Relative pins are deferred unless fully certified.

## Gates

Authored positive and negative fixtures, each rank/color reflected; selected
comments <=24 words. Certify and independently replay every accepted new finite
claim. Missing replies, changed target sets and gains must fail replay. Cover
protected targets, pinned attackers, capturable forkers, immediate countermate,
draw, old attacks, blocked lines, king-only targets and operation exhaustion.
Line motif evidence explicitly states geometry without quality claims.
Use shared D001 guarded loader before dynamic authored fixture input; no game
data is inspected. Retain exact revision, normalized inputs, receipt, commands,
environment, timing and hashes. Exact repeat and clean Git source output required.
Estimate under one minute and 3 MB retained evidence. Targeted checks and source
integrity before local commits. Log all exposed development amendments.
Human usefulness and real-game precision remain inconclusive.

Live five-hour usage monitoring continues: at 10% remaining checkpoint/commit,
disable heartbeat, then normal authorized `shutdown.exe /s /t 0` without `/f`.
No extension integration, pushes or numerical goal restart.

## Amendments before first fixture evaluation

Two absolute pins of the same blocker to the same king cannot have distinct
directions: two distinct squares determine one line. The proposed absolute-only
cross-pin subset is therefore impossible; defer cross-pins rather than emit a
misleading label. Mixed absolute/relative pin certificates need a later study.
Code review also found inherited E022 en-passant capture warnings named the
landing square instead of the removed pawn. Correct that inherited event in the
E023 adapter and add both-color regression cases; frozen E022 stays unchanged.

First exposed pass: 34/48 tests passed. Missing positives were fixture problems:
a pawn defended the forked knight, the king already attacked both targets, a
third pawn was not actually attacked, a discovered attack had only one distinct
target, and a bishop capture could be recaptured by the nearby king. Correct
those setups without changing finite proof gates; one old hanging fixture also
started with the nonmoving king checked. Permit a triple-attack label alongside
an inherited fork while still avoiding duplicate fork events. An expected
negative capture was actually mate for the capturing side, so its proof is
correctly positive. Retain it as a positive and add immediate legal mate-reply
warnings (actual checkmate/FEN witness, highest comment priority). All fixtures
remain exposed development data, no precision or human benefit estimate.
Follow-up smoke showed the pawn advance kept the rook's mating file blocked;
use the legal diagonal capture that vacates the file for the mate-reply example.
The prior pawn-capture vulnerability was factual but not immediate mate.
An added bishop royal-fork smoke correctly rejected an undefended checking
bishop because the king could capture it. Add a supporting pawn for the positive
and retain the capturable original as a negative control.
