# E058: wrong bishop, rook pawn and verified promotion-corner access

2026-10-07. Frozen E057, research only; numerical work paused, usage cutoff/
shutdown cancelled, no extension or push. Original list unchanged. Authored
synthetic only; definition/lesson metadata, no external boards/games/sequences.
Commit protocol before evaluation. D001 test preflight before fixture imports.

wrongBishopTags boolean defaultfalse exact parent; maxWrongBishopNodes integer
0..50000 default50000 shared budget, exhaustion drops ALL new events retaining
parent facts. Live full-history canonical before/after, no terminal continuation.
After actual legal move, EXACT pure material K+B+ONE a/h pawn versus bare K.
Either side may be actual mover. Bishop square color differs from that pawn's
promotion corner; bishop cannot control that opposite-colored square regardless
of its current clear diagonals. No geometry-only draw or winning claim.

wrong-colored-bishop event states bishop identity, promotion corner and pawn.
wrong-rook-pawn-corner additionally requires defending king ALREADY on corner
or, when defender is next to move, an actual legal king move onto that corner.
Store all such corner moves with full records; conditional/access text states
the legal choice, not forced occupation or a drawn ending. When defender has
just moved onto corner, certify current occupancy; every legal next attacking
move retained, without inferring permanent hold. Priorities100.5/101.5 above
generic material-ending descriptions, below promotions/urgent tactics/terminal.
qualityClaimfalse, <=24 words; no bad-move judgment from mismatched color alone.

Full before/after, actual record, exact material signature/identities, bishop
and promotion-square colors, both kings, complete ALL legal next move records,
corner move subset, occupied flag, immediate pawn/bishop capture subsets.
Independent replay imports no detector helpers: strict legal history, actual
transition, exact material and colors, full legal reply set/subsets, corner
legality/occupancy, exact short text. Budget ticks history/board/reply scans.

Authored both rook files/colors, bishop/pawn/king actual moves, defending king
actual moves onto corner, legal conditional corner access, legal capture of
attacking pawn or bishop, corner denied by attacking king, distant defender,
capture transition into exact material, full capture history, same-color bishop,
nonrook pawn, extra pawns/minors/defender unit, no bishop/pawn, promotion,
actual stalemate/checkmate/dead/clock threshold, unsafe illegal king move,
disabled/zero/midway budgets, missing/modified replies/identities/corner moves/
colors/histories/counters/text. Horizontal and color reflection retain exact
canonical histories; no forced draw claims from finite evidence.

Cheap guarded target/smoke, cumulative E020–E058 and maintained source/diff.
Inspect SELECTED comments as well as events before costly final runs. Source
committed before main/repeat/initially clean local clone; exact revision,
normalized inputs, actual physical output hashes/metrics, saved JSON replay,
ordered E057 fingerprints and original-list hash unchanged. Full certificates
below3MB with compact E053 demo. Estimate~200s per full run, overlap three.
Synthetic development mechanics; real-game precision/teaching value unknown.
