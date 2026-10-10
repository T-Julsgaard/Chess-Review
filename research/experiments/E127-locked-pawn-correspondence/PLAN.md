# E127 — locked-pawn corresponding-square response systems

2026-10-10 preregistration. Parent E126 99df94c. Current main authorized;
local commits/no push. BUILD-FIRST; accepted/production/numerical unchanged.
Claims C0275, C0392, C0612, C0653: shared locked king-pawn response-system scope,
preserving each original square/king/endgame/pawn-ending occurrence. Rook bridge
and named defenses need continuation/outcome machinery beyond shape matching;
knight parity is independent. Prioritize this missing response prerequisite.

Default-false correspondenceTags; maxCorrespondenceNodes integer0..250000,
default250000. Disabled exactly E126; extra atomic exhaustion preserves parent.
Actual quiet king move, exactly king+pawn each, white pawn directly below black
pawn on the same file, no rights/EP, live validated input/history. No pawn moves
are legal while both pawns remain locked. No imported game/study fixtures.

Build complete finite graph over all king squares and both turns for the fixed
blocked pair. Exclude overlaps, adjacent kings and nonmoving king attacked by
enemy pawn. Generate every legal king move, including captures. First capture
ends the model: capture of defender's pawn is attacker goal, capture of attacker's
pawn is safe for defender. Noncapture mate/stalemate is safe for this first-
capture objective. It is NOT a game outcome or indefinite preservation after
the other pawn was captured. Draws can only stop before the objective and are
safe; infinite cycles are safe. No artificial finite search cutoff.

Retrograde attacker-OR/defender-AND attractor with decreasing ranks proves every
winning vertex can force first capture of defender pawn within its rank. The
complement carries a safety strategy: every attacker edge stays safe and some
defender edge stays safe (or defender captures first). Save all 8192 rank slots
(-2 illegal, -1 safe, positive capture bound), pair, defender and graph counts.
Complete edges are reconstructed from source rules rather than duplicated.

Actual after-move response row lists EVERY legal defender reply. Safe means
graph-safe or actual terminal draw; losing requires graph attractor, full history
without any repeated position so far, and remaining fifty-move clock covering
the decreasing-rank path before its final resetting pawn capture (clock+rank<=100).
Otherwise mark unknown and withhold the row. Decreasing ranks prevent new
repetition; prior unique positions can be revisited at most once before capture.
Unknown is not safe or losing. Capturing replies terminate the model explicitly.

Require exactly one safe QUIET king reply and at least one losing reply. Follow
that forced reply and enumerate EVERY next actor king move. Retain all next
rows and their response inventories; at least one must again have a unique safe
quiet reply, with DIFFERENT actor/defender destination squares. Thus at least
two linked corresponding-square pairs, not an isolated contact/one-ply label.
Report only this first-capture response system, never full game draw/win or advice.

Independent checker imports neither candidate nor graph solver. Reconstruct all
valid king states/edges with chess.js once per fixed pair, compare the complete
graph, verify rank descent AND safety closure, complete actual response/follow-up
inventories, full history/clock/terminal handling and labels. Metadata hashes alone
are insufficient. Cache only hash-identical graph validation inside a process;
mutated certificates must always invalidate that cache.

Authored synthetic discovery: fixed blocked pawn file/rank, enumerate legal king
placements deterministically to locate representative linked systems, retain
exposure/failures. This is development, not confirmation. Freeze representative
fixtures after discovery, add both colors, competing/missing safe replies, changed
profile, actual draw/history duplicates, strict controls/disabled and exact atomic
budgets. Guarded small pilot <=32cases; source/diff checks, no engine or cumulative
history suite. Whole graph <=8192slots/~6000validstates; O(vertices+edges) solver.
Retain compressed source-bound certificate rather than repeated edge tables.

Conceptual definition inspected2026-10-10: corresponding squares require enemy
king responses to hold a position (https://en.wikipedia.org/wiki/Corresponding_squares).
This candidate specifies its held objective explicitly; broader locked structures,
opposition/tablebase results and post-capture conversion remain unresolved.
Search snippets included external studies; no external board enters this study.

Deferred combined regression, exhaustive semantic/absence/priority/history/budget/
interaction/original-occurrence audit, frozen main/repeat/clean and real-game
precision/usefulness. Preserve each duplicate scope and unknown cases explicitly.
