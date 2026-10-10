# E128 — causal pawn fixation, static structure and unique penetration guard

2026-10-10 preregistration. Parent E127 c1bd2a5, current main authorized, local
commits/no push. BUILD-FIRST focused batches. Graph prerequisite now available:
return to earlier C0229 structural weakness/C0912 static weakness/C0914 fixation;
group C0780 preventing penetration using the same exact first-capture machinery.
Rook outcomes/knight parity remain independent work, not silently dropped.

Default-false lockedStructureTags; maxLockedStructureNodes integer0..500000,
default500000. Disabled exactly E127, no implicit inherited flags. Extra atomic
exhaustion preserves all enabled parent findings. Live legal full history, exactly
king+pawn each, no rights/EP. Reuse E127 complete graph and neutral graph checker;
do not mutate its implementation or replace first-capture result with game outcome.

First-capture objective unchanged: defender avoids having its paired pawn captured
BEFORE the opposite pawn is captured; draw/infinite avoidance is safe. Safety
does not promise preservation after the other pawn is removed. Positive ranks
force target first capture through all legal moves with decreasing rank. Both
pawns are immobile while the locked pair remains; before first capture every
legal move is a king move. Full graph has no artificial search horizon.

Fixation/weakness branch: actual single quiet forward pawn step creates adjacent
same-file blocked white/black pawns. Target is OPPONENT pawn. Actual graph with
opponent as defender must be positive at actual after-move turn. A legal live
fresh BEFORE frame giving opponent the turn (clocks same, EP clear) must permit
the target pawn's single advance into the old gap; this produces the other locked
pair. After that escape, full graph must be SAFE for opponent target. Save actual
and escape certificates, exact fresh frame, legal escape inventory/move/position.
This demonstrates removal of an available pawn escape and a real first-capture
consequence, not an immobility-only fixation label. No full game win or optimality.

C0914 fixation requires that actual-loss/escape-safe contrast. C0912 static weakness
and C0229 structural weakness additionally require a legal live fresh opposite-
turn AFTER frame with positive rank for that same target. Both actual and opposite
rank paths must fit remaining clock (clock+rank<=100). Actual pawn move resets
the clock and irreversibly creates a new pawn placement, so previous history does
not cause repetition in the decreasing-rank first-capture path. Fresh comparisons
are explicit and do not impersonate actual history. A checking pawn push may
invalidate opposite frame and cannot receive static/structural labels.

C0780 guard branch: actual quiet king move with already locked pair. Set actor as
defender. Enumerate EVERY legal root alternative; pawn captures/actual terminal
draws are safe for actor under the first-capture objective. Other outcomes use
complete graph rank/safety and actual history/clock. Positive ranks require no
position repeated so far and clock+rank<=100; otherwise unknown. Actual move must
be safe, at least one alternative losing, and EVERY OTHER legal move losing, no
unknowns. Thus an exact unique guard against first capture of own blocked pawn,
not generic positional advice. Complete alternatives retained, no selected-only
or contact-count shortcut. Capturing actual moves do not receive this quiet-guard
label, although capturing alternatives are included and can refute uniqueness.

Independent checker imports neither candidate nor graph solver; reuse E127 neutral
graph validation then reconstruct profiles, actual/history, all alternatives,
frames, pawn escape, clock/repetition handling, graph vertex bindings and labels.
Strict/disabled/atomic-budget, both colors, actual/escape safety failures, static
opposite failure, nonunique guards, profile/capture/terminal/history, malicious
certificate and frame/alternative mutations. Guarded authored synthetic discovery
over fixed same-file gap pawn family and E127 response family, development only;
freeze representative fixtures after discovery. No external game/study positions.

Small pilot <=36cases, graph <=8192slots/certificate, normally two certificates
per fixation and one per guard. O(vertices+edges), no engine, no cumulative old
history suite. Retain compressed source-bound graphs/receipt and actual resource
sizes; reuse unchanged E127 machinery. Deferred combined full regression,
exhaustive semantic/absence/priority/history/budget/integration/occurrence audits,
exact main/repeat/clean and real-game precision/usefulness. Complex pawn formations,
general static weaknesses, durable game outcome and broad penetration remain open.
