# E047: Legal's played-history pattern, Corner and Box mate

Date: 2026-10-07. Research only; cancelled cutoff/shutdown stay cancelled.
Baseline frozen E046. Question: can short named mate comments identify real
queen-capture history and terminal Knight/Rook/King roles without generic
corner-location labeling or unjustified sacrifice-strength claims?

Opt-in historyMateTags boolean defaults false preserving exact parent result.
maxHistoryMateNodes integer 0–50,000 default 50,000 shared; exhaustion discards
ALL new tags and retains parent certificates. Actual legal checkmate, sole
checker on played-to square required. No new engine or mate search. <=24 words.

Legal profile: actual final knight mate, relative enemy king e7, checker d5,
other own knight e5, own bishop f7; horizontal file mirror also accepted.
Checking knight, helper knight and bishop each control a distinct vacant flight
outside the other two; helper knight protects bishop. No remaining own queen.
Require last FOUR history moves in order: own knight moves off a bishop-to-own-
queen relative pin ray; enemy SAME bishop captures that queen; own SAME final
bishop checks; enemy king moves; now actual OTHER knight mates. Before first
move the knight is the sole occupied intermediate square on the diagonal
between capturing bishop and queen. All legal history, full canonical FEN and
terminal guards retained. Store four full move/SAN/before/after records and pin
ray. This certifies the played branch and actual final mate, not a forced/sound
queen offer against every alternative defense, an opening or historical game.

Corner profile: actual knight mate to a corner king; own rook/queen on inward
adjacent file controls BOTH vacant neighbors on that file; enemy pawn occupies
the other orthogonal neighbor. Exact heavy-piece flight roles retained. This
is the knight-finishing subset, not every checkmate at a corner.

Box profile: EXACT king+rook versus lone king, actual moved rook checkmates an
edge king; own king controls EVERY vacant flight outside checking rook coverage,
with at least one such flight. Retain king and escape records. This names the
terminal king/rook box-mate form, not a verified preceding shrinking-box method.

Authored synthetic histories/positions only; both colors and horizontal mirrors
(including replayed mirrored history). No source moves/FENs/games imported.
Negatives: final shape without history, actual queen loss without relative pin,
older queen loss outside four-ply motif, rook rather than queen captured,
missing helpers; Knight/Rook corner missing blocker or blocked helper file;
actual other-helper corner mate; Box actual queen mate or extra pawn, distant
king and central nonmate. Tampered history and role records, disabled/exhausted
budgets and malformed settings. Commit plan before exposed smoke; log mistakes.

Guard D001 test receipt in entry points. Cumulative E020–E047 tests, source
verification, main/repeat/initially clean checkout exact hashes and metrics,
saved JSON replay of positives/negatives, unchanged inherited fingerprints.
Expected ~100 seconds per ~1,300-case run, three overlapping runs, lossless
retention <3 MB. Original 1,085 occurrences preserved. Synthetic mechanics only;
real-game precision/human benefit unmeasured. No extension/rating changes/push.
