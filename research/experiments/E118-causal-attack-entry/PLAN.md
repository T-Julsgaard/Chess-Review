# E118 — causal attack entry

Preregistered 2026-10-09, build-first provisional, parent E117. Original claims
C0363 queen infiltration, C0424 reinforcements, C0425 switching attack and
C0544 switching wings. Broader strategy, sustained attacks, piece storm and
local superiority remain unresolved; no geometry-only discharge or intent.

Default-false attackEntryTags; attackEntryPlies safe integer0..4 default2;
maxAttackEntryNodes safe integer0..50000 default50000. Disabled exactly parent.
One atomic budget; exhausted new facts disappear. Validated legal actual/history,
no castling rights, <=10 units, quiet nonpawn/nonking nonpromotion actual move.
Enemy king's fixed postmove neighborhood is Chebyshev distance <=2. Entrant must
be outside that neighborhood before, inside after. Full actual/history AND fresh
E029 mate query succeed at H. Legal restored-mover AND removed-mover postframes
(same turn/clocks, clear EP) must both fail at H. Require a stationary own
nonpawn/nonking partner inside neighborhood. Thus new arrival is independently
necessary; the partner's necessity is not asserted. Only nonterminal actual
positions qualify; this describes reinforcements arriving before mate.

C0424 uses this complete causal reinforcement policy. C0363 additionally queen
enters relative rank >=5 from <=4. C0544 additionally actual piece crosses a-c
to f-h or vice versa. C0425 additionally pre-move entrant geometrically attacks
an enemy nonking target on its original wing; retain exact target inventory.
Geometric prior contact is explicitly named as such, not a previous winning
policy. The new attack's success needs full mate and causal frames.

Reuse E029 solver/neutral replay and E024 history validator; no new engine or
replacement solver. E113 only handles rook rank lifts/central queen destinations,
E110 exact army pairs; their narrow callables do not implement these claims.
Use focused both-color positives/negatives, history, strict/disabled, budget,
no partner, old proximity, restoration/removed legal failures, prior contact,
clock/terminal gates and independent witness mutations. Small guarded synthetic
pilot, semantic saved replay, source/diff verification. Not cumulative testing.

Prereg before evaluating new candidate/fixtures. Synthetic only. D001 test
preflight passed. Save source/runtime/input hashes and policy receipt. Defer full
combined regression, exhaustive original-scope/integration/history/priority/budget
audit, frozen main/repeat/clean runs and real-game usefulness/precision.

Piece storm requires tracked multiple arrivals and joint causal contribution;
local superiority requires a meaningful comparison, not bare neighbor counts.
Next batch should address these shared prerequisites rather than copy labels.
