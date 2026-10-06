# E024 result and resume state

State: complete, 2026-10-07. Synthetic mechanics gates pass; educational benefit
is inconclusive. Exploratory research only. Coach goal and usage cutoff active;
numerical research paused. No extension integration or pushes.

Plan registered `25093e9`; evaluated source `8e6f373`. [Plan](plan.md) records
definitions and exposed fixture corrections. [API and reproduction](README.md).

## Working scope

Exact remaining-material labels recognize king/pawn, rook/pawn, bishop/pawn,
knight/pawn, queen/rook/minor/pawn and selected mixed armies. They describe the
position, not its outcome. Optional history is legally replayed to the exact
input FEN before any immediate-recapture exchange, queen/rook/minor trade or
nominal equal/unequal trade is mentioned. No history means no trade assertion.
Promotion exchanges are excluded because their material change is not explained
by the two captured pieces alone. En-passant history exchanges are supported.

Basic mating-army comments require actual checkmate against a lone king with
exactly the named material. Queen-and-rook mate additionally requires support
for the checking queen. New queen/passer, queen check, rook-lift geometry and
pawn-supported knight-outpost descriptions carry explicit placement scopes.

The cumulative [tracker](evidence/concept-status.md) has 116 verified names,
123 verified occurrences, 70 partial occurrences and 892 unimplemented entries
among all 1,085 supplied list entries. Three previously implemented E021 knight
placement aliases are now tracked explicitly. Partial concepts remain unchecked.

Examples: "Queen trade: both queens have been captured in this exchange."
"Rook trade into a pawn ending: only kings and pawns remain." "Queen-and-rook
mate: your rook supports the checking queen." Detailed history/count evidence
is expandable in the [new examples demo](evidence/demo.html).

## Verification

- 95 E024 tests plus 342 earlier tests pass: 437 cumulative tests.
- 45 new authored positions plus reflections and 318 inherited cases: 408
  total; 388 emit facts, 14 abstain, six illegal moves are refused.
- Longest selected comment remains 17 words; declared bound is 24.
- All 196 finite certificate event replays pass, checking 1,194 defender
  replies and 1,709 immediate counterreply leaves. Reused proofs across events
  mean this is not a count of unique certificate positions.
- Independent test calculations verify history replay, two-ply capture values,
  actual balance change, ending army signatures and terminal mating armies.
- Missing/mismatched/illegal/terminal/excessive history, non-recaptures,
  promotion exchanges, extra pieces/pawns, challenged outposts, old placements
  and an inert rook in a queen mate are negative controls.
- Repeated and initially clean local checkout generation at `8e6f373` match
  every normalized source hash and all three deterministic output hashes.
- Targeted checks and `npm run verify:source` pass. Generation takes about
  nine seconds after eligibility. Compact evidence is about 1.36 MB.

[Main run](evidence/run.json), [repeat](evidence/repeat-run.json),
[clean replay](evidence/clean-run.json), [results](evidence/results.json) retain
commands, exact revision, source hashes, public-data eligibility receipt,
environment, timing and output hashes. Full new cases are retained; inherited
cases retain FEN/move/comment/event IDs and full-result fingerprints, with
frozen E020–E023 detail linked. The committed pure API regenerates their current
full results. All inherited cases and tactical proofs are still evaluated.
The demo displays only new examples and links earlier tactical/structural demos.

All positions/history are authored synthetic development inputs. No game data
is evaluated. Shared chess.js remains the common rules dependency; count/history
checks do not establish human learning or real-game precision. Outposts, rook
lifts and centralization do not imply permanent safety or strategic benefit.

## Next action

Register E025 for additional objective pawn formations and attack-line changes
(hanging-pawn geometry, pawn levers, locked centers, pawn cover and color-complex
facts), with short precise comments and negative controls. Continue usage checks;
at 10% remaining checkpoint/commit, disable the heartbeat, then authorized normal
Windows shutdown without `/f`.
