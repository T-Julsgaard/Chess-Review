# FRIEND-02: Symmetrical pawn structure (C0970)

Temporary identifier; renumbered at integration. Registered 2026-10-08 before any
detector code or fixture evaluation, in the separate checkout on local branch
`friend/coach-concept-research`. Canonical trackers/INDEX/queue/frozen evidence
untouched. E081 attack work avoided. Not pushed; no extension change.

## Why this concept

Original row C0970 "Symmetrical position" (category 38, position types) is rank 36,
phase 1, "Not implemented" in the E080 tracker. It is a pure board descriptor. The
complement C0971 "Asymmetrical position" is NOT claimed here (one concept per study).

## Exact claim

Research-only opt-in `symmetryTags` wrapper on frozen E080 `explainMove` (default
false returns the exact E080 result; strict boolean). Emit one `symmetrical-pawns`
event only when ALL hold for the actual move:

1. Root and played position live; optional history validated by E024
   `validateHistory`; parent foundation refusal means not-applicable.
2. After the move the pawn structure is colour-mirror symmetric: a White pawn
   stands on (file f, rank r) if and only if a Black pawn stands on (f, 9-r), for
   every square. Each side has at least three pawns (a one- or two-pawn match is
   not called a structure; empty maps are excluded).
3. Before the move this was NOT true (the move newly establishes it, by a pawn
   move/capture/promotion, or a capture of a pawn by a piece). Pre-existing
   symmetry with a quiet piece move reports no event.

Text (<=24 words, qualityClaim false): "Symmetrical pawns: both sides mirror each
other's pawns on the a, b, c files." Priority 4.1, below all parent explanations.
Evidence-only informational field `piecesAlsoMirror` (every non-pawn piece also has
its colour-mirrored partner); it does not change the label.

Non-claims: left-right (a<->h) symmetry, equal evaluation, drawishness, equal
chances or any move-quality statement. Real-game precision/usefulness untested.

## Evidence retained per positive

Move record, before/after FEN, sorted pawn squares per color, per-file mirror
pairs, piece inventories (for `piecesAlsoMirror`), legal moves, history.
`maxSymmetryNodes` strict integer 0..50000 (default 50000); ticks per history ply,
legal query, move, inventory, mirror comparison; atomic exhaustion keeps exact
parent output.

## Independent replay

`replay.mjs` parses saved FENs with its own reader, recomputes the mirror relation
by a different method (per-file rank-reflected sets, not the detector's square
map), recomputes `piecesAlsoMirror`, text, priority, budget units and selection.
Tamper tests: altered pawn, pair, count, flag, text, before-state, budget, history.

## Prospective gates

Positives: both colors acting; completed via pawn advance, pawn capture, piece
captures a pawn, promotion capture; 3, 4 and 8 pawns per side; with and without
`piecesAlsoMirror`. Negatives retained: one pawn off by a rank, file shifted, extra
pawn on one side only, fewer than three pawns, empty pawns, left-right mirror only,
pre-existing symmetry and quiet move, symmetry destroyed by the move, terminal
after move, invalid FEN/history, non-boolean flag, bad/zero/exact/one-less budget,
disabled equals parent for every fixture. Gate: every expected status matches,
independent replay verifies positives, negatives emit no event, main/repeat/clean
outputs identical, regressions pass. Failures are preserved.

## Data, reproduction, cost

Authored synthetic positions only; `openResearchData(['D001'],{purpose:'test'})`
before inputs. Command:
`node research/experiments/FRIEND-02-symmetrical-position/code/run.mjs`
(`--out DIR`). Seconds, under 1 MB; compact JSON; soft targets only.

## Amendments

None yet.
