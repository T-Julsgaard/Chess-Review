# E028: short mating-pattern explanations

Registered 2026-10-07 before evaluation. Import frozen E027 and shared selection.
Every new event requires a legal played move and actual checkmate afterward.
No engine, seed, real-game data or extension change. Definitions in SOURCES.md
are reviewed as metadata; authored geometry is the experimental input.

## Candidate

Named conservative subsets, with rank/color and horizontal reflections:

- Arabian: corner king, adjacent checking rook; same knight protects rook and
  attacks a vacant neighboring flight not controlled by the rook alone.
- Anastasia: noncorner edge king, rook/queen checks along that edge, own blocker
  on the inward adjacent square and knight covers both inward diagonal flights.
- Boden: edge noncorner king, bishop checks diagonally; opposite-color bishop
  covers at least two vacant neighboring flights not covered by checker; two
  own king-side neighbors block flight. Support bishops on crossing slopes.
- Epaulette: edge noncorner king; two king-side pieces on its parallel shoulders;
  queen checks from two squares inward on the perpendicular line.
- Dovetail: protected diagonally adjacent queen; the two adjacent squares not
  attacked by that queen after king removal are occupied by king-side pieces.
  Require both uncovered squares exist on board, excluding incomplete edge forms.
- Swallow's-tail: protected orthogonally adjacent queen; two rear-diagonal
  squares not attacked by queen are occupied by king-side pieces, both on board.
- Opera: edge king, adjacent checking rook parallel to edge; bishop protects
  rook and covers empty inward flight; two opposite-side self-blocking neighbors.
- Morphy: corner king, diagonal bishop check, rook covers empty parallel flight
  not covered by bishop, other orthogonal flight occupied by king-side piece.
- Ladder/rook roller: edge rook check, distinct rook on adjacent inner parallel
  line attacks every vacant neighboring inward flight; no sequence inferred.

Checkmate guard is authoritative. Geometry templates name contributing roles,
not historic sacrifice or castling history. Queen support and flight attacks
are geometric, as king destinations are forbidden even by pinned enemy pieces.
Evaluate flight coverage on a board with mated king removed so its old square
does not falsely block rays. Do not generate legal moves on that kingless board.

Generic labels: Q/R, Q/N, Q/B, R/B, R/N and opposite-color B/B combinations
require one actual checker and a distinct helper protecting adjacent checker
or controlling a vacant flight the checker does not cover. Pawn-supported mate
requires pawn support of adjacent checker. Discovered mate requires a stationary
original checker newly exposed by played move; double-check mate >=2 checkers.
Promotion/underpromotion mate requires actual legal promotion. Mate in one
names the legal played mate, not a deeper predicted sequence. All role witnesses
retain piece identity, checker/king/squares, support/flight coverage and after FEN.

Named patterns outrank generic mate/composite labels; existing smothered/back-rank
and specialized endgame mates retain meaningful selection when no new name fits.
Comments <=24 words. Overlap is allowed in facts; selection deterministic.

## Gates and evidence

Guard D001 before dynamic fixture imports. Positive/near-miss cases, both colors
and horizontal reflection: check-not-mate, missing helper/blocker, wrong shoulder
distance, unsupported queen, swapped bird geometry, unblocked flight, mere army
presence, unmoved/changed type, single versus double-check, legal promotion and
underpromotion, wrong promotion type, and specific selected-label regressions.
Independent replay checks legal terminal board, piece identities and every
pattern's geometry with separate coordinate/attack logic. Tampered after FEN,
king/checker/helper, blocker and flight witnesses must fail. No vacuous coverage.
Run all prior tests and finite certificates plus source verification.

Retain full new cases and inherited fingerprints, definition/source/input hashes,
guard receipts, exact revision/config/environment/time/outputs. Repeat and
initially clean checkout must match deterministic outputs and normalized source
hashes. Estimate <=30 seconds and <=3 MB retained evidence. Record exposed changes.

Coach goal and 300-minute usage cutoff remain active; numerical research paused.
Near 10% remaining checkpoint/commit, disable heartbeat and execute authorized
normal shutdown without /f. No integration or pushing.

Implementation notes, 2026-10-07: pawn-free rotated authored seeds additionally
exercise every named template on different board edges; pawn directions are
never rotated. Initial queen-role examples already checked the non-moving king
or crossed their own support pawn, so legal input guards rejected them before
concept detection. Distinct legal queen paths supply the valid positives.
Independent coordinate replay treats signed zero as numerical zero, avoiding
JavaScript strict-assertion failures without changing any chess gate. Double-check
and underpromotion names get deterministic priority over more generic action
labels. Frozen parent code/evidence remain unchanged.
