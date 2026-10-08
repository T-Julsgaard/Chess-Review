# FRIEND-01 result: four versus three pawns in a one-rook ending (C0681)

2026-10-08. State: complete. Outcome: verified synthetic mechanics for the narrow
registered claim (see plan.md); partial for the broader row. Evidence maturity:
exploratory/synthetic. Temporary ID; renumber at integration. Local commits only.

## Result

Supported occurrence: **C0681 Four versus three**, scope: after a legal live move
that newly establishes a position containing only kings, exactly one rook each and
pawns, all pawns on one wing (a-d or e-h), with exactly 4 pawns for one side and 3
for the other. Tracker wording proposed for integration:
"Mechanics verified: actual move newly creates a pure one-rook-each K/R/P position
with all pawns on one wing, 4 v 3 either way; complete inventories; no outcome,
drawing or activity claim." Not covered (stay partial): extra pawns on the other
wing, other piece mixes, split d/e wings, and C0682 Three versus two (not claimed).

Gates (all pass): 64 cases = 22 proven, 27 no-new-fact, 2 not-live, 1
not-applicable, 2 disabled, 4 budget-exhausted, 6 expected input errors, 0
failures. Both colors (every white fixture has a reflected Black twin), both wings,
4-pawn holder both actor and opponent, arrival by pawn capture of a pawn, rook
capture of a knight, pawn capture of a bishop, and promotion to a rook; legal
history case; exact/one-less/zero budgets; disabled output deep-equals E080 for
the disabled fixtures and parent events are preserved in every fixture.
Independent `replay.mjs` (no detector import) re-derived inventories, wing,
counts, text, budget units and selected comment for all 58 saved non-error rows and
rejected 14 forged variants plus a forged history and a mismatched fixture
(82 tests in `code/fourthree.test.mjs`).

Examples: "Four versus three: you have four pawns against three on the e-h files,
with one rook each." / "...your opponent has four pawns against your three...".

## Evidence and reproduction

Frozen source 3d708e9604dd826d228e89a0133f8c1a278117f1 (verifier added after in
a later commit; it does not change the run inputs). Main, repeat and initially
clean detached-worktree runs are identical:

| Item | Value |
| --- | --- |
| results.json.gz (16,091 B) SHA-256 | 6e3263969f8d73812d8732f74a62e6cf3e8824e692c6bd57a9b3c7e1b3aaa440 |
| results.json (244,647 B, after gunzip) SHA-256 | 7f204cd60dc88724d85b46bfb07399fe4d33c6899840f6d65c75c1e3b6ec25c4 |
| Retained evidence folder | 52,067 B (results, 3 run records) |
| Run time | about 2.2 s each |

```sh
node research/experiments/FRIEND-01-four-versus-three/code/run.mjs
node research/experiments/FRIEND-01-four-versus-three/code/run.mjs --out research/runs/FRIEND-01/repeat
git worktree add --detach ../Chess-Review-friend-verify 3d708e9604dd826d228e89a0133f8c1a278117f1
(cd ../Chess-Review-friend-verify && node research/experiments/FRIEND-01-four-versus-three/code/run.mjs --out <abs>/research/runs/FRIEND-01/clean)
node research/experiments/FRIEND-shared/verify.mjs FRIEND-01-four-versus-three 3d708e9604dd826d228e89a0133f8c1a278117f1 <abs>/research/runs/FRIEND-01/clean
node --test research/experiments/FRIEND-01-four-versus-three/code/fourthree.test.mjs
```

Storage: gzip (level 9, deterministic) cut 244,647 B to 16,091 B; further
optimization not worthwhile. D001 eligibility preflight receipt is in run.json; no
game data used.

## Limitations

- Authored synthetic positions only: no claim about real-game frequency,
  precision or teaching usefulness; no claim that 4v3 favors anyone.
- Label priority is 4.2, below every parent explanation, so it is seldom the
  selected comment (parent "Rook ending" and tactical warnings outrank it); it is
  retained in `events`. Presentation priority is for the integrator to decide.
- "Newly established" means by the played move; static presence is not labelled.
- Failures during development (history fixture counters; two replay gaps found
  by tamper tests) are recorded in EXPOSURE.md; none changed the registered gates.

Next step: integrate on top of the then-current main chain (swap parent import,
renumber, add tracker row C0681 with the scope text above, rerun cumulative suite).
