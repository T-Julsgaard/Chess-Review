# FRIEND-01: Four versus three pawns in a one-rook ending (C0681)

Temporary identifier; renumbered to the next unused E-number at integration.
Registered 2026-10-08 before any detector code or fixture evaluation. Work is in
a separate checkout on local branch `friend/coach-concept-research`. Canonical
trackers, INDEX, ACTIVE-QUEUE and frozen evidence are untouched. E081 (direct/
pawn/piece attack) is deliberately avoided. Not pushed; no extension change.

## Why this concept

Original row C0681 "Four versus three" (category 24, Rook endings) is rank 34 of
the approved queue, phase 1, still "Not implemented" in the E080 canonical tracker
(`npm run research:status`: E080, 322 names / 372 verified occurrences). It needs only
a material inventory and file arithmetic, reusing E075/E076-style facts. C0682
"Three versus two" is a sibling and is NOT claimed here (one concept per study).

## Exact claim

Research-only opt-in `fourThreeTags` wrapper on frozen E080 `explainMove`
(default false returns the exact E080 result object; strict boolean). Emit one
`four-versus-three` event only when ALL hold for the actual move:

1. Root and the played position are live (not game over). Optional validated
   `history` is replayed with E024 `validateHistory`; invalid history throws as in
   the parent. A parent foundation refusal means not-applicable.
2. After the move the board contains exactly: both kings, exactly one rook per
   side, and pawns. No queens, bishops or knights for either color.
3. All pawns of BOTH colors lie within one wing, files a-d or files e-h.
4. One side has exactly 4 pawns and the other exactly 3 (either color may have 4).
5. The position BEFORE the move did not satisfy 2-4 (the move newly establishes
   the structure: a capture of a pawn or minor piece, or a promotion/trade
   reaching it). Pre-existing structure with a quiet move reports no event.

Text (<=24 words, qualityClaim false): "Four versus three: you have four pawns
against three on the e-h files, with one rook each." (and the enemy-majority
variant "...your opponent has four pawns against your three ..."). Priority 4.2
(below all parent explanations). No claim of advantage, drawing chances, winning
technique, activity, king position or that the move was good.

Explicit non-claims / limits: positions with extra pawns on the other wing, two
rooks, other pieces, 4v3 split across d/e, and 3v2 are not claimed here and stay
partial. This does not establish real-game frequency, precision or usefulness.

## Evidence retained per positive

Played move record, before/after FEN, full piece inventories before and after,
per-file pawn lists by color, wing, pawn counts, rook squares, legal-move list,
history if supplied. Budget: `maxFourThreeNodes` strict integer 0..50000 (default
50000, only undefined defaults). One tick per history ply, legal query, move,
inventory extraction, and event attachment. Exhaustion is atomic: drop new event,
keep exact parent events and comment, status `exhausted`.

## Independent replay (must not import the detector)

`replay.mjs` parses the saved FENs itself (own FEN reader, no detector helpers)
and recomputes inventories, wing and counts for before and after, checks the
played move is legal via chess.js, checks status/event/text/priority/budget units
and selected comment against recomputed values. Tampering tests: altered counts,
extra piece, wing, before-state, text, budget, history.

## Prospective gates

Positive: both colors; 4-pawn side being actor and being enemy; kingside and
queenside wings; reaching via pawn capture, minor-piece capture (pure rook
ending created), promotion-free pawn trade, and rook-pair retained. Negative
(retained, expected no event): extra bishop/knight/queen, two rooks, missing rook,
pawns on both wings (including d+e split), 4v4, 5v4, 3v2, 4v2, already-4v3 quiet
move, pre-existing 4v3 where an irrelevant rook move occurs, terminal after move
(checkmate), invalid FEN/history, non-boolean flag, bad budget, zero/exact/
one-less budget, disabled equals parent for every fixture. Gate: all expected
statuses match; independent replay verifies every positive; every negative has
no event; disabled output deep-equals parent for ALL fixtures; main, repeat and
clean-detached runs produce identical output hashes; applicable regressions pass
(full `research:coach-tests`, `verify:source`, `npm test`). Any failure is kept.

## Data, reproduction, cost

Authored synthetic positions only; no games, no external data. Run
`openResearchData(['D001'],{purpose:'test'})` per policy before inputs (no game
content is loaded). Synthetic mechanics do not establish real-game usefulness.
Command: `node research/experiments/FRIEND-01-four-versus-three/code/run.mjs`
(`--out DIR` for repeat/clean). Expected cost: seconds, well under 1 MB; no size
optimization beyond compact JSON. Soft targets only.

## Amendments

None yet.
