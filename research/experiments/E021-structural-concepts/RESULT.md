# E021 result and resume state

State: complete, 2026-10-07. Synthetic mechanics gates pass; educational
improvement remains inconclusive. Evidence maturity: exploratory. [Plan](plan.md).
Unattended coach expansion continues; numerical research stays paused.

Registered plan: `6b6f9db`; evaluated source: `56fc9a8`. No extension integration.

## Working scope

Short comments identify pawn structures, passed-pawn advances, majorities,
open/semi-open files, rook connections, batteries, blockades, seventh-rank rooks,
bishop colors, exact material combinations and selected piece-placement facts.
The cumulative [tracker](evidence/concept-status.md) retains all 1,085 original
entries: 73 verified occurrences across 68 names, 37 partial occurrences,
975 unimplemented occurrences. E020 had 15 verified names. Partial concepts
remain unchecked and list the narrower interpretation, including king
opposition geometry, fianchetto placement and strategic material comparisons.

Examples: "Pawn duo: c4 and d4 stand side by side." "Queen–bishop battery:
c1 and g5 share an unobstructed diagonal." "Your passed pawn advances from d4
to d5." Tactical warnings and terminal outcomes retain priority. Detailed
evidence is separate from the single selected comment.

## Verification

- 132 E021 tests plus 74 unchanged E020 tests pass (206 total).
- 61 new authored positions and their reflections, plus 68 baseline cases:
  190 cases; 172 produce facts, 12 abstain, six illegal moves are refused.
- Longest selected comment: 17 words; declared maximum 24.
- Eight baseline fork certificates replay: 72 defender replies and 945
  immediate counterreply leaves.
- Repeated generation and a clean local checkout at `56fc9a8` reproduce all
  results, demo and tracker hashes. Run records retain canonical source hashes,
  eligibility receipts, commands, environment, timing and starting Git state.
- `npm run verify:source` passes. Default generation takes about 1.9 seconds
  after eligibility; no engine or random search is used.

[Main run](evidence/run.json), [repeat](evidence/repeat-run.json),
[clean replay](evidence/clean-run.json), [case evidence](evidence/results.json)
and [demo](evidence/demo.html) are retained. Reproduction commands are in
[README](README.md). All positions are exposed synthetic development fixtures;
D001 eligibility is verified by the shared guarded loader, but no real games
are evaluated. Shared chess.js remains a common rules dependency. Structural
checks independently recompute selected counts/geometry, not all chess rules.

Development failures and corrections are recorded in the plan: illegal knight
and bishop fixture moves, en-passant vulnerability exclusion, and unequal
chain branches whose terminal node was not the most advanced head. No held-out
performance, safety, best-move or learning claim follows from these tests.

## Next action

Register E022 for additional concrete move facts and tightly defined tactical
motifs with negative controls. Keep comments short and defer concepts requiring
intent or strategic value until appropriate evidence exists. Continue checking
the five-hour allowance; at 10% remaining, checkpoint and commit, disable the
heartbeat and perform the authorized normal Windows shutdown without `/f`.
