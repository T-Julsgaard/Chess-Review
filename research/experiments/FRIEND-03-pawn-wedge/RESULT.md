# FRIEND-03 result: supported, pawn-unassailable wedge restricting the king (C0219)

2026-10-08. State: complete. Outcome: verified synthetic mechanics for the narrow
registered claim (see plan.md); the broad "restricting the enemy position" concept
stays partial. Evidence maturity: exploratory/synthetic. Temporary ID; renumber at
integration. Local commits only.

## Result

Supported occurrence: **C0219 Pawn wedge**, narrow scope: actual pawn move or pawn
capture (no promotion) onto the actor's relative rank 5 or 6, statically protected
by an own pawn one rank behind on an adjacent file, such that no enemy pawn can ever
attack that square (pawn moves and captures, piece blocking ignored), and that
demonstrably removes at least one enemy-king legal destination (every denied square
attacked by the wedge pawn, shown against a counterfactual with the wedge pawn
deleted). Proposed tracker wording: "Mechanics verified (narrow): supported
relative-5/6 pawn arrival that no enemy pawn can challenge and that denies enemy
king destinations versus a pawn-removed counterfactual; pieces and general cramp
are not assessed; no advantage claim." Stay partial: restriction of non-king
pieces, wedges on rank 7, wedges contestable only by pieces, and strategic value.

Gates (all pass): 54 cases = 12 proven, 25 no-new-fact, 2 not-live (pawn
checkmate), 1 not-applicable, 2 disabled, 6 budget-exhausted, 6 expected input
errors, 0 failures. Both colors (every white fixture has a reflected Black twin),
relative ranks 5 and 6, one and two denied squares, left and right support, advance
and capture arrivals, legal two-ply history. Negatives: unsupported, rank 4 with
denial, rank 7, promotion, adjacent enemy pawn, enemy pawn reaching by capture
(f7 attacks via capture, g7 two files away does not: a boundary pair), king too
far, denied squares already own-occupied, knight arrival, pawn check with no extra
denial, counterfactual illegal because the wedge pawn shielded its own king. Budget
exact/one-less at every stage (shape, reach, counterfactual, full) plus zero.
Disabled output deep-equals E080 and parent events are preserved everywhere.
Independent `replay.mjs` re-derived support, reachability (BFS, not the detector's
closed form), attack maps and king destinations (own enumerator, cross-checked
against chess.js on every live actual position), counterfactual FEN, text and budget
units for all 48 saved non-error rows; 21 forged variants plus a forged history and
mismatched fixture are rejected (80 tests in `code/wedge.test.mjs`).

Example: "Pawn wedge: e6 is supported and cannot be challenged by pawns, denying the
enemy king d7 and f7."

## Evidence and reproduction

Frozen source b3503365c9725246e2a5ddf8cd58cef2f1cc77b4. Main, repeat and initially
clean detached-worktree runs are identical:

| Item | Value |
| --- | --- |
| results.json.gz (10,721 B) SHA-256 | bbe2d47ee0caa2ff6eae56728e95bb6f63117f2c160ce3faad9f88027b72c5a1 |
| results.json (139,225 B, after gunzip) SHA-256 | 97535bb852d5654859807c2cf3814d0be184ce9c9ba3bb5b27dd4c3e9cabc54d |
| Retained evidence folder | 46,491 B |
| Run time | about 1.4 s each |

```sh
node research/experiments/FRIEND-03-pawn-wedge/code/run.mjs
node research/experiments/FRIEND-03-pawn-wedge/code/run.mjs --out research/runs/FRIEND-03/repeat
git -C ../Chess-Review-friend-verify checkout --detach b3503365c9725246e2a5ddf8cd58cef2f1cc77b4
(cd ../Chess-Review-friend-verify && node research/experiments/FRIEND-03-pawn-wedge/code/run.mjs --out <abs>/research/runs/FRIEND-03/clean)
node research/experiments/FRIEND-shared/verify.mjs FRIEND-03-pawn-wedge b3503365c9725246e2a5ddf8cd58cef2f1cc77b4 <abs>/research/runs/FRIEND-03/clean
node --test research/experiments/FRIEND-03-pawn-wedge/code/wedge.test.mjs
```

Storage: deterministic gzip (139 KB to 10.7 KB); no further optimization. D001
preflight receipt in run.json; no game data used.

## Limitations

- Authored synthetic positions only; no claim about real-game frequency, precision
  or teaching usefulness, and no claim that a wedge is good or that it wins anything.
- Only enemy KING destinations are tested; the pawn's effect on other pieces is not
  measured. This overlaps E062 (pawn space): the new content is the support,
  rank band and pawn-permanence gates. The integrator should decide whether to merge.
- "Cannot be challenged" is about pawns only (pawn reachability, blocking ignored,
  which is conservative toward "can be challenged"). Pieces can still attack or
  trade the wedge pawn.
- Priority 4.3 is below every parent explanation; the event is rarely the selected
  comment but is retained in `events`.
- Development defects (an unbraced else in the independent replay's attack map, and
  two mis-indexed budget fixtures) are in EXPOSURE.md; the detector was unchanged.

Next step: integrate on the then-current chain, deciding relation to E062, and
register a separate study for non-king restriction or rank-7 wedges.
