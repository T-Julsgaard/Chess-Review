# E126 — reserve tempo and reciprocal blocked-pawn loss

2026-10-10 preregistration. Parent E125 4c7598a, current main authorized, local
commits/no push. BUILD-FIRST focused batches; unchanged accepted/production.
C0617 tempo move and C0654 trebuchet share complete immediate pawn-loss policies.
Corresponding-squares mappings need reciprocal response systems; rook defenses
need stronger continuation/outcome inputs. These prerequisites remain open.

Default-false reserveTempoTags; maxReserveTempoNodes integer0..50000 default50000.
Disabled exactly E125, no implicit parent enable flags. Extra atomic exhaustion
preserves parent. Live validated actual/history, no castling rights, king-pawn
only <=6 units. Find a unique blocked white/black pawn pair on one file, adjacent
ranks, white pawn immediately behind black; BOTH kings geometrically contact
BOTH pawns. No broad king-maneuver, draw or best-move assertions.

Shared loss policy on a live full-history board: enumerate complete sorted legal
move inventory for side to move, either ALL moves or ALL KING moves as declared.
After each move (including captures if legal), enumerate all legal captures of
that side's ORIGINAL paired pawn by the other KING. Every row needs one E022
certificate positive through every immediate response, AND net nominal gain
strictly positive relative to BEFORE the move inventory, including any material
offset in the side-to-move choice. Save all captures in each visited row and the
first failing row prefix. Empty move set or terminal branch fails, never vacuous.

C0654: AFTER actual quiet king move, EXACTLY four units (king and paired pawn
each). Complete ALL-move loss policy succeeds for actual side to move AND a
legal live fresh frame with opposite turn, same clocks, clear EP. Thus reciprocal
forced certified pawn loss in the locked-pawn mutual king-guard pattern. This is
a finite material trebuchet scope, NOT the full-point game-win definition.
Actual history is used; opposite-turn frame is explicit counterfactual only.

C0617: actual quiet nonpromotion pawn step uses a reserve pawn distinct from
the blocked pair, preserving both king squares and paired pawn squares. Extra
pawns allowed up to six total units. BEFORE actual, every legal king alternative
loses the actor's paired pawn to a certified net-positive opposing king capture.
AFTER actual, EVERY opponent legal move (not merely king moves) loses the
opponent's paired pawn to such an actor capture. Both policies mandatory. Enemy
reserve pawn moves must not be omitted. No general winning reserve tempo claim.

Checker imports neither detector nor E022 certifier: reconstruct complete legal
inventories, exact target/king captures, every next response including terminal/
draw and baseline offsets, profile/pair, legal turn frame, causal comparison and
labels. Positive/negative both colors, reserve counterplay, profile/pair failure,
legal move/history/clock safeguards, disabled strict controls and exact atomic
budget boundary. Guarded authored synthetic pilot, source/diff checks. Do not
run cumulative inherited evidence or expensive engine searches. Estimate <=40
small cases, no engine, compressed proof panels; retain actual sizes.

Source conceptual definition: Noam Elkies, Harvard Chess and Mathematics glossary,
https://people.math.harvard.edu/~elkies/FS23j.06/glossary_chess.html (read2026-10-10).
It defines mutual zugzwang by outcomes and trebuchet as full-point reciprocal
zugzwang. This candidate explicitly does not prove that full outcome. No external
game/study positions admitted as fixtures. Author synthetic family from registered
king contacts/blocked-pawn constraints; no game data/labels/tuning/production.

Deferred combined full regression, exhaustive semantic/absence/priority/history/
budget/integration/occurrence audits, frozen main/repeat/clean and real-game
precision/usefulness. Promotion/capture initiators excluded; resulting pawn
ending conversion, corresponding-square systems and wider tempo strategy open.
