# E134 — complete bounded dual-purpose king race

2026-10-10. Parent E133f57d4ad. Next pending phase4 rank226 C0655 Réti maneuver.
Current checkout authorized; local commits/no push. BUILD-FIRST, focused cheap
smoke before pilot, no cumulative/historical long tests. Named rook/tablebase
outcomes remain pending suitable outcome evidence; geometric names alone do not
prove them. Dual-purpose theme also appears in original ARVES Réti memorial
judge report (definition snippet only; no study positions imported):
https://www.arves.org/arves/images/PDF-Awards/Reti-MT-2009.pdf

Actual quiet diagonal king move in king+one pawn versus king+one pawn, no rights
or EP, legal/live root and after, optional strict full history. King move must
reduce Chebyshev distance to BOTH unchanged original pawns; record this geometric
lower bound without pretending it is a legal route or sufficient evidence.
Beyond geometry require a complete bounded adaptive policy for an OR of two
resources, with complete FAILED policies for each resource alone at SAME bound.

Resources: (A) eliminate tracked enemy pawn or its promoted descendant, leaving
enemy only king; (B) promote tracked own pawn to queen and retain that queen
through EVERY immediate legal enemy reply, all live. B has no positive-net-gain
requirement: simultaneous enemy promotion can leave equal material, and must be
recorded rather than silently rejected as no resource. Record relative nominal
balance against before-actual baseline at queen root and every probe reply.
Draw/mate terminals are excluded from these explicit resource goals, not falsely
called failures of chess strategy. A/B are finite resources, not a full-game
draw/win, tablebase, optimality, or universal Réti-maneuver taxonomy claim.

Default-false kingRaceTags; strict kingRacePlies integer0..10 default10 and
maxKingRaceNodes integer0..50000 default50000. Disabled exactly E133, no implicit
parent flags. Shared atomic extra budget across combined/capture-only/queen-only
queries drops all new events/evidence on exhaustion, preserving parent. Query
root is AFTER actual move; queen survival probe extends one enemy reply beyond
the declared depth, explicitly retained. Track pawn identity through promotion,
movement, capture and EP (initial EP unavailable; future double steps supported).
OR own choices / AND every enemy reply, with complete legal move inventories.
Positive OR needs one own choice; failure needs every own choice. Enemy dual
quantifiers reverse. Underpromotions included; a lost own pawn does not rule out A.

Hash-share exact query states with full FEN/counters, tracked identities, remaining
depth, mode and repetition-position counts. Counts include only since latest
pawn move/capture: older positions cannot recur after irreversible pawn progress,
promotion or material removal, and all castling rights absent. Save this exact
signature in every proof node; never reuse FEN alone. Actual full history still
drives chess.js terminal checks. DAG retains every required chosen/all branch;
discard only unreferenced exploratory nodes, not required refutations. Independent
replay verifies each referenced node against actual history and reconstructed
signature before reuse. No graph-size target or changed scientific goal to pass.

Authored hypothesis Kh8 Pc6 versus Ka6 Ph5, Kg7, H10: combined resource policy
should succeed while neither resource alone is guaranteed. This is a preregistered
hypothesis, not evaluated evidence or a full-draw assertion. Mirrored color and
short bounds, wrong geometry/profile/move, history, terminal clocks, strict/
exact budgets, enabled-parent preservation and proof mutations. Cheap smoke at
fixed50000 nodes first; resource exhaustion is inconclusive and retained, not
reason to weaken goals or launch repeated expensive runs. Estimate <=50000
state/edge/probe ticks per call; pilot<=12 authored cases, target seconds/tens of
seconds, no acquired games/engine. If budget cannot establish representative
positive, keep prototype unready and record the prerequisite/cost explicitly.

Independent checker imports neither candidate/search nor memo helper: replay full
legal trees/DAG, tracked identities, all-reply queen probe/balances, irreversibility
ledger and exact distance/query/label binding. Reject missing branches, wrong
goals, histories, reuse signatures, mode/depth/terminal/identity and balances.
Focused tests, source/diff, compressed proofs and complete source closure.
Deferred combined regression/exhaustive interactions/original-occurrence audit,
exact main/repeat/initially clean reproductions, real-game precision/usefulness
and full outcomes. Accepted E082/numerical/production unchanged.
