# FRIEND-02 result: symmetrical pawn structure (C0970)

2026-10-08. State: complete. Outcome: verified synthetic mechanics for the narrow
registered claim (see plan.md); partial for the broader row. Evidence maturity:
exploratory/synthetic. Temporary ID; renumber at integration. Local commits only.

## Result

Supported occurrence: **C0970 Symmetrical position**, scope: after a legal live
move that newly establishes it, the pawn structure is exactly colour-mirrored
(White pawn on (f, r) iff Black pawn on (f, 9-r)), with at least three pawns each.
Proposed tracker wording: "Mechanics verified: actual move newly makes both pawn
structures exact rank-mirror images (>=3 pawns per side); full pair list; pieces
mirror flag reported separately; no evaluation, drawishness or equality claim."
Not covered (stay partial): whole-position symmetry as a label (reported only as
the evidence flag `piecesAlsoMirror`), left-right (a-h) symmetry, positions with
fewer than three pawns each, and C0971 Asymmetrical position (not claimed).

Gates (all pass): 48 cases = 16 proven, 17 no-new-fact, 2 not-live (promotion
checkmate that would otherwise create symmetry), 1 not-applicable, 2 disabled,
4 budget-exhausted, 6 expected input errors, 0 failures. Both colors (every
white fixture has a reflected Black twin), 3, 4 and 8 pawns per side, pieces
mirror true and false, arrival by pawn advance, pawn capture of a pawn, piece
capture of a pawn and promotion removing the extra pawn, a legal two-ply history
case, exact/one-less/zero budgets, disabled output deep-equals E080, parent events
preserved everywhere. Negatives: off by a rank, file shifted, extra pawn, only two
pawns each, no pawns, left-right mirror only, pre-existing symmetry with a quiet
move, symmetry destroyed by a pawn move.
Independent `replay.mjs` (no detector import; per-file rank-reflection method)
re-derived mirror state, files, pairs, the pieces flag, text and budget units for all
42 saved non-error rows; 17 forged variants plus a forged history and mismatched
fixture are rejected (69 tests in `code/symmetry.test.mjs`).

Example: "Symmetrical pawns: both sides mirror each other's pawns on the a, b, c files."

## Evidence and reproduction

Frozen source b8e8ace195d994ef5d0b287682ef390b4c025ca2. Main, repeat and
initially clean detached-worktree runs are identical:

| Item | Value |
| --- | --- |
| results.json.gz (12,816 B) SHA-256 | d5c461626efa3a9739babd962a5db82c478a4a5cd40c0952741fb337288e6ec1 |
| results.json (163,437 B, after gunzip) SHA-256 | ea75c7c1010a10e9b2189eb71541a62cb63c63722f334e28b0531bddc9732649 |
| Retained evidence folder | 48,843 B |
| Run time | about 1.4 s each |

```sh
node research/experiments/FRIEND-02-symmetrical-position/code/run.mjs
node research/experiments/FRIEND-02-symmetrical-position/code/run.mjs --out research/runs/FRIEND-02/repeat
git -C ../Chess-Review-friend-verify checkout --detach b8e8ace195d994ef5d0b287682ef390b4c025ca2
(cd ../Chess-Review-friend-verify && node research/experiments/FRIEND-02-symmetrical-position/code/run.mjs --out <abs>/research/runs/FRIEND-02/clean)
node research/experiments/FRIEND-shared/verify.mjs FRIEND-02-symmetrical-position b8e8ace195d994ef5d0b287682ef390b4c025ca2 <abs>/research/runs/FRIEND-02/clean
node --test research/experiments/FRIEND-02-symmetrical-position/code/symmetry.test.mjs
```

Storage: deterministic gzip (163 KB to 12.8 KB); no further optimization. D001
preflight receipt in run.json; no game data used.

## Limitations

- Authored synthetic positions only; no claim about real-game frequency,
  precision or usefulness, nor that symmetry implies equality or a draw.
- "Symmetrical position" in teaching usage may also mean left-right or whole-board
  symmetry; this study verifies only the pawn-structure colour mirror. A whole-
  position label would need a separate registered gate.
- Priority 4.1 is below every parent explanation, so the event is rarely the
  selected comment; it is retained in `events`.
- Two development failures (dead K-v-K fixture, a no-op tamper mutation) are in
  EXPOSURE.md; neither changed a registered gate or the detector.

Next step: integrate on the then-current chain (swap parent import, renumber, add
C0970 tracker row with the scope text); decide whether C0971 Asymmetrical is the
complement or needs its own gate before reusing this proof.
