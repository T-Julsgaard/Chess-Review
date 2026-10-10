# E184 — king routes with comparative conversion policies

2026-10-10. Parent E183 e22e4a3. BUILD-FIRST; authorized current main,
research-only local commits, no push. Register before decisive authored tests.
Original occurrences: C0622/C0639 shouldering, C0623/C0638 outflanking.
Both duplicate category scopes remain visible; broader endings stay open.

Explicit default-disabled API evaluateKingRoute(input,options), and inspectKingRoute
for supplied paired policies only. Input is exact fen, UCI move and genuine full
history (an explicit empty history beginning at fen is allowed). Options enabled
boolean default false, alternative UCI, plies integer0..6 default4,
maxNodes integer0..50000 default50000, optional proofs {actual,alternative}.
Unknown keys, custom objects, malformed controls and illegal alternatives reject.
Missing history/alternative/proofs are explicit prerequisites, never positives.
No parent events, production changes or nominal strategic evaluation.

Material: exactly K+P versus K. Actual and distinct alternative must be legal
quiet king moves from the SAME live before frame. Replay full history, real
clocks and pawn identity. Preserve actual and alternative after frames. Reuse
E106 conversionQuery/checkConversion with the SAME before nominal baseline,
same horizon and shared atomic cap. Actual must have a complete mate-OR-
surviving-promoted-queen policy against all defenses; the alternative must
completely fail that same finite objective. Every actor choice including
underpromotion remains represented in failures. A failed finite policy is not
an unbounded draw/loss, best-move judgment or optimal endgame outcome.

Shouldering also requires a functional route obstruction. In each after frame,
compute the enemy king's shortest path to capturing the current pawn square
on the explicitly FROZEN pawn/actor-king board: adjacent king steps, excluding
actor-king square/ring and pawn-attacked squares. Both distances must be finite;
the actual must be strictly longer than the legal alternative. At least one
alternative shortest first step is newly barred by the actual king's ring.
The pawn itself cannot be king-protected in either frame (finite-distance gate),
so ordinary direct pawn protection is not renamed shouldering. These paths are
geometric explanations, not legal timed lines; full conversion policies provide
the separate all-defense bounded consequence. No claim about fastest real play.

Outflanking requires genuine preceding opposition and a turning maneuver:
immediately before the recorded enemy king move, same-file kings two ranks
apart with enemy ahead in actor-relative rank; enemy moves laterally off that
file; actual king steps one rank forward and one file to the opposite side.
The recorded last move must be the opposing king's quiet legal move and the
pure KPK pawn unchanged. The actual advance goes around the displaced opposing
king; paired complete policies establish the bounded promotion consequence.
No invented previous opposition from a snapshot. General lateral entry without
this history, horizontal/diagonal opposition, more pawns and pieces remain open.

Any observed threefold/fifty claim in admitted history, supplied policy nodes
or queen-survival replies suppresses all labels. E106's library-draw convention
is not promoted to official optional-claim theory. Terminal before/actual or
alternative frames abstain. Required actual/alternative proof is atomic: on
budget exhaustion no proof, route or claim is retained. Fresh/saved work must
agree. Count one setup, one per history move, two root moves, geometric BFS
vertices/neighbor probes and exact E106 node/edge/queen-reply ticks. Saved proof
admission independently replays semantics; no cached success substitutes.

Before collecting, audit archived source/input/history/config hashes for exact
reuse. New decisive roots are independently authored, not downloaded examples.
Prospective smoke roots: shouldering White Kf5 Pe6/Black Kh5, Kf5-g6 versus
Kf5-f4, H4. Outflanking White Ke6 Pd6/Black Ke8, recorded ...Ke8-d8, then
Ke6-f7 versus Ke6-e5, H6. Reflect colors with actual replayed counters.
These hypotheses can fail; preserve failures and register any changed roots
before evaluation. Do not enlarge cap/horizon after seeing failure.

Focused strict/history/terminal/claim/positive/negative/disabled/fresh-saved/
exact-one-short checks, small both-color pilot, independently saved semantic
replay and source/diff checks. No cumulative suite or clean historical runs.
Full original occurrence/absence/priority/history/budget audits, combined
regression and changed main/repeat/initially clean reproductions deferred.
Synthetic development only; human usefulness/real-game precision unresolved.
