# E022 result and resume state

State: complete, 2026-10-07. Synthetic mechanics gates pass; educational benefit
is inconclusive. Exploratory research, no extension integration. Coach goal is
active; numerical research remains paused. Usage cutoff remains active.

Plan registered at `c26a8a0`; evaluated source `26c62dc`. Frozen E020/E021
implementations and evidence remain unchanged. [Plan](plan.md), [API](README.md).

## Working concepts

Move-specific capture facts, check evasions, legal capture warnings, discovered
attacks, loose pieces, en prise, sole legal moves, narrow mate patterns, draw
thresholds, and finite material capture/skewer certificates now work in the
prototype. The cumulative [tracker](evidence/concept-status.md) has 78 verified
names (83 occurrences), 49 partial occurrences and 953 unimplemented occurrences
among the original 1,085 entries. Strategic or history-dependent readings stay
partial, including winning the exchange beyond the immediate reply horizon.

Examples: "Discovered attack: moving from c3 opens c1’s attack on the queen at
c7." "Smothered mate: a knight checks the king, surrounded by its own pieces."
"Watch out: Rxb2 legally captures your bishop on b2." Selected comments remain
short; individual witnesses and scope limits are expandable in the [demo](evidence/demo.html).

## Evidence

- 80 E022 tests pass; 206 E020/E021 tests also pass, 286 cumulative tests.
- 39 authored new positions plus their reflections, and 190 inherited cases:
  268 total; 248 produce facts, 14 abstain, six illegal moves are refused.
- Longest selected comment is 17 words (declared bound 24).
- 80 certificate event replays, including eight old fork certificates and
  72 new capture/exchange/skewer event certificates. Exchange and capture
  events sometimes share one proof; 80 is not the number of unique positions.
  All 572 defender-reply and 1,031 immediate counterreply checks pass.
- Repeated and initially clean local checkout generation at `26c62dc` match
  every normalized source hash and all three deterministic output hashes.
- Targeted tests and `npm run verify:source` pass. Default generation takes
  about 3.9 seconds after eligibility; no engine, seed or search-cache reuse.

[Run](evidence/run.json), [repeat](evidence/repeat-run.json),
[clean replay](evidence/clean-run.json), [results](evidence/results.json) retain
commands, revision, inputs, eligibility receipts, environment, timing and hashes.
All tests are exposed synthetic development cases. No real games are evaluated.
Independent replay uses separate balance and witness-completeness code but shares
chess.js with the detector. It rejects missing replies, altered gains and targets.
Exact event multisets are exposed regression annotations, not an independent
precision estimate. Initial smoke failures and corrections are in the plan.

## Limits and next action

Capture proofs stop after every immediate response; skewer proofs stop after
defense, target capture and every immediate counterreply. They do not prove
long-term advantage. Discovered attacks/en prise allow opponent responses.
Pinned defenders still count geometrically; draw history/adjudication and intent
are not inferred. Mate-pattern labels require actual terminal checkmate.

Next: register E023 for additional certified fork types and line motifs, using
explicit legal continuations and negative controls. Continue the live allowance
monitor; at 10% remaining checkpoint/commit, disable the heartbeat and perform
the user-authorized normal shutdown without force-closing applications.
