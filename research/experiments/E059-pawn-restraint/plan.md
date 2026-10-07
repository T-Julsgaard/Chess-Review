# E059: self-blocking pawns and next-turn pawn fixation

2026-10-07. Frozen E058, isolated research checkout. No extension/push; numerical
goal paused, cutoff/shutdown cancelled. Original list unchanged. Authored
synthetic only, source rule metadata, no external examples. Commit before tests.

pawnRestraintTags boolean defaultfalse exact parent, maxPawnRestraintNodes
integer0..50000 default50000 shared, exhaustion removes ALL new tags retaining
parent. Live canonical history before/after, no terminal continuation. Actual
move places own unit immediately ahead of an unchanged own pawn on its file:
self-blocking-pawn names the actual occupied square/own pawn and ONLY current
straight restraint. Own pawn blockers allowed; unchanged stationary blockers
and merely attacked squares excluded. All enemy legal replies retained along
with complete legal moves of that own pawn after each reply, including captures;
terminal child explicitly represented without continuing. Pawn disappearance,
blocker movement/capture recorded. No permanence or strategic bad-move claim.

fixed-pawn-next-turn requires actual own pawn advance/capture into an enemy-pawn
ram. EVERY legal enemy reply must remain nonterminal, preserve BOTH pawns at
their ram squares, and leave ZERO legal moves of the tracked own pawn next
turn. Full enemy move set and own pawn-move subsets retained, including capture
and promotion/EP when legal. Any enemy capture/moving ram pawn, drawn/mated
branch or legal own pawn capture refutes the label. State only bounded fixation
through the next own turn; no permanent immobility, vulnerability or outcome.

Evidence exact actual record/FENs/pawn/blocker identities, geometric pair,
ALL legal enemy reply records, child terminal/captured flags, ALL legal tracked
pawn move records. Independent replay imports no detector helpers, reconstructs
strict full history/material/geometry/exhaustive sets/terminal states/text.
<=24 words, qualityClaimfalse; priorities94.5 self/93.5 fixation, below urgent
tactics and above plain placement/center descriptions. Inspect selected text.

Authored NBRQK/own-pawn blockers, starting double-step, edge and promotion
forward-square restraint, capture-created block, own pawn diagonal captures,
blocker removed by enemy, pawn lost, fixed ram from advance/capture, enemy
countercapture/moving ram pawn, distant/near enemy king, missing/wrong direction/
file/piece, stationary pair, unrelated moves, terminal clock/draw/mate/history,
illegal move, disabled/zero/midway exhaustion and tampered sets/FEN/text.
Horizontal/color variants, no source games. D001 guarded loader before fixtures.
Cheap target then E020–E059/source/diff, source commit before main/repeat/new
initially clean local clone. Exact revision/normalized input/physical output/
metrics, saved JSON replay, ordered E058 hashes and original list unchanged.
Full proofs<3MB compact E053 demo; estimate~200s/run overlap3. Real-game
precision and teaching benefit unknown. Do not touch shared checkout branch.
