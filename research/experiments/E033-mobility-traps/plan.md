# E033: mobility, domination and trapped-piece proofs

Registered 2026-10-07 before evaluation. Frozen E032 parent; research only.

After a legal nonterminal move leaving neither king checked, count the current
opponent's distinct legal destination squares for each knight/bishop/rook/queen.
For restriction compare with an explicit before-move hypothetical opponent turn
(clear EP when changing turn). Emit factual reduction only when at least two
destinations disappear and at most two remain. Retain exact before/after move
and destination sets. This is static legal mobility, not quality, space score,
best-move advice or a promise about positions after further replies.

Domination requires a nonempty legal target-move set and, for every such move,
an existential legal capture of that tracked unit whose material gain survives
every immediate counterreply. Label the exact conditional scope: every legal
move by that unit permits profitable immediate capture. Target may remain where
it is; all other defenses are not implied by the domination label.

Trapped-piece additionally requires it currently attacked and complete proofs
for every legal opponent reply, including moves by other units, captures of
the attacker, interpositions and counterchecks. Track the original unit if it
moves. Captures must have positive fixed gain versus the board after played
move, after every immediate counterreply; counter-mate/draw refuse. Actual
capture mate may qualify only if material gain is also positive. No whole-game
winning, necessity, forced trap history or subjective useful-square claim.
No trap labels when opponent is in check, where restricted moves may merely
be forced evasions. Only N/B/R/Q targets; no pawn or king trapping label.

Shared maxTrapNodes integer 0..50,000; exhaustion drops all new finite proofs
but exact mobility facts remain. Positive certificates have complete legal
reply sets, tracked squares, chosen legal captures, every immediate counterreply
and exact gains. Domination and full trap may share witness search results;
don't silently omit legal non-target defenses for the full trap.

Authored restricted, dominated and trapped queen/minor positives, safe escape,
capturing the attacker, check/draw/counter-mate, budget and target-movement
controls; reflect rank/color. Independent replay recomputes legal mobility,
attackers, exact relevant reply sets, identity, capture and leaf gains without
detector helpers. Tamper sets/identity/gain/branches and require refusal.
Short comments <=24 words and state finite scope; warnings/specific terminal
mates remain above new labels. Conditional domination below full trap.

Guard D001 before dynamic fixtures. Pilot cumulative cost estimate <=180 sec
and <=3 MB retained evidence. Targeted cumulative tests, source verification,
normalized source/output hashes, exact committed revision, config, receipt,
commands/environment; repeat and initially clean task-owned checkout match.
Definition metadata only; no source games/positions/diagrams imported.

Coach expansion and actual five-hour cutoff active; near 10% remaining
checkpoint/commit, disable heartbeat and authorized normal shutdown without /f.
Numerical research paused; no extension integration or push.
