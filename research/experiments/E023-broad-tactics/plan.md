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
