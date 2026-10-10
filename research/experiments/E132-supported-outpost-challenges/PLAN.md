# E132 — denying a secure supported knight outpost

2026-10-10. Parent E13191ae238. C0775 rank176. Earlier C0467 perpetual attack
requires a sustainably repeatable all-defense policy and draw/history rules,
not merely a finite recorded attack sequence; keep it pending. Position types
need declared taxonomies and rook outcomes need outcome evidence. This batch
implements the compatible finite outpost challenge with full legal branches.
Current checkout authorized, local commits/no push, BUILD-FIRST/no long suite.

Claim C0775: before actual move an enemy quiet knight entry to a supported
advanced central square was live with no immediate legal capture of the knight;
after actual move EVERY legal quiet knight entry to that same square is live
and permits a capture of that knight with no nominal material loss through
EVERY immediate enemy reply. This removes the formerly secure occupation at a
declared finite bound, not all future knight returns, general strategic quality
or optimality. Require at least one after-entry: no vacuous all-entries claim.

Use existing E024 operational outpost geometry: files cdef, relative enemy rank
4..6, enemy pawn supporter and no actor pawn ahead on either neighboring file.
Actual nonpawn/nonking/nonpromotion piece move, captures allowed, legal full
history when supplied and live root/actual. Prior frame is fresh before placement
with enemy to move, EP cleared and counters retained, independently legal/live;
not a legal actor pass. Actual branches retain supplied full history.

Enumerate complete prior legal moves and all quiet knight entry rows, retaining
post FEN, pawn supporters/challengers and ALL actor replies/victim squares.
Eligible prior row must match geometry and have no immediate legal capture of
its knight. Candidate target set is sorted distinct eligible prior destinations.
For each target in order enumerate ALL actual legal quiet knight entries there.
For each entry enumerate ALL actor legal moves and ALL captures of that knight;
for EVERY capturing candidate enumerate ALL enemy replies with terminal/draw,
EP-aware victim, signed nominal balance versus pre-capture board and child FEN.
Capture is eligible only if entry, capture and EVERY reply are live and gain>=0.
This explicitly admits equal bishop-for-knight exchange; E022 strict positive
gain certificate is unsuitable and must not be silently weakened or modified.
Require >=1 eligible capture for every entry; select first successful target.
Save all earlier failed target trials, full inventories and chosen capture indexes.

Interface default-false outpostChallengeTags; strict maxOutpostChallengeNodes
integer0..50000 default50000. Disabled exactly E131; no implicit parent flags.
One atomic extra budget drops all new evidence/events on exhaustion, preserving
parent. No engine/material-count cap. Comments<=24words, qualityClaim:false.

Authored hypothesis Ka1 Bf1 versus Kh8 Nf6 Pe6, Bg2: prior ...Nd5 is pawn-
supported and immediately uncapturable; after Bg2 every ...Nd5 can meet Bxd5,
including ...exd5 with nominal gain0. Bh3xe6 alternative should remove sole
supporter while providing a profitable capture of a knight entering d5.
Controls: prior capture already available, no pawn support, future pawn
challenger, checking/terminal entries or replies, insufficient capture gain,
wrong actual piece, history, both colors, strict/exact budgets and parent proof
preservation. Guarded authored D001-test pilot<=32cases; focused and source/diff.

Independent checker imports no candidate/helper: reconstruct history, fresh
prior frame, complete prior/actual move trees, geometry, capture targets, signed
material, live flags, failed-prefix/selection and exact comment. Reject deleted
branches, changed supporters/challengers/captures/gains/terminal/history/turn.
Retain failures without rewriting plan. Full source closure and compressed proof.

Deferred combined cumulative regression, exhaustive absence/priority/history/
budget/integration/original-occurrence audit, exact main/repeat/initially clean
reproductions and real-game precision/teaching usefulness. Accepted E082 tracker,
numerical work and production unchanged; broader outpost strategy remains open.
