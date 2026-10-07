# E061: closed files and actual rook/queen access

2026-10-07. Frozen E060, isolated checkout. Original list unchanged. Numerical
work paused; cutoff/shutdown cancelled. Research only, no extension or pushes.
Authored synthetic positions/history; source metadata only, no copied games.

Question: can Closed file comments distinguish pawn occupancy from the actual
slider's access without inventing a strategic disadvantage? Opt-in closedFileTags
defaults false, returning exact E060. maxClosedFileNodes integer0..50000 default
50000, shared exhaustion drops ALL new tags preserving frozen parent facts.
Live strict canonical history and actual resulting position required.

Actual moved rook/queen, including promotion to these units, on a file with
at least one pawn of EACH color. Enumerate ALL pawns on the file, with identities,
not just the nearest pair. Both geometric vertical rays retain every empty
square to the first occupied square or board edge, with full blocker identity.
Comment names current pawn occupancy and the forward ray's first blocker or
unobstructed board edge; no legal-capture, permanence, best-move, weak-piece,
closed-position or advantage claim. Pawn lists need not form an adjacent ram.
Nonpawn obstruction and enemy king explicitly distinguish ray from legal moves.

Every actual legal enemy reply retained with exact move/FEN; terminal flag,
tracked slider present/captured flag, complete resulting pawn occupancy and
ALL tracked slider legal moves along this file on the next own turn. No
terminal continuation. Legal captures retained, but absent geometric moves
under pin/check are not silently described as legal. Independent replay imports
no detector helpers: reconstruct root/history, played unit, both full rays,
full occupancy, every reply and every relevant move set. <=24 words,
qualityClaimfalse, priority101.2 below urgent tactics and recent pawn explanations.
Selected examples and urgent-warning preservation checked.

Authored R/Q, edge/center, own/enemy pawn blocker, other blocker types, pawns
behind slider, same-file move/capture, complete doubled pawn lists, capture of
last enemy pawn opens classification, one/no color, stationary unrelated move,
wrong piece, pin/check after reply, slider capture, pawn capture/promotion/EP,
legal history, rook/queen promotion, actual/reply terminal, illegal move,
disabled/zero/midway exhaustion and tampered lists/rays/replies/text.
Horizontal and color variants. Guarded D001 loader before fixture import.
Target smoke then cumulative E020–E061/source/diff. Commit source before
main/repeat/initially clean clone; exact source/input/physical output/metrics,
ordered E060 full-result hashes and original-list unchanged; saved JSON replay.
Prospective budget: ~200s/run, overlap3, <=4MB total retained evidence including
full JSON and board/card HTML, based on E060's measured3.39MB/112new cases.
Storage miss separately reported; no proof/case omission to meet it. Frozen
E053 compact demo. Synthetic mechanics do not establish real-game precision,
human teaching benefit or extension readiness.
