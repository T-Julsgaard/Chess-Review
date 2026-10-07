# E046 result: coordinated named terminal mating patterns

Research only. Usage cutoff and PC shutdown remain cancelled. No extension,
numerical-rating edits or push. [Sources](SOURCES.md) supply definition metadata;
no source boards, games, FENs, sequences or evaluations copied into fixtures.

New opt-in netPatternTags identifies actual terminal Greco, Blackburne and
Kill box mating patterns. Every label requires legal actual checkmate with a
sole checker on the played move's destination. Independent replay executes the
move, verifies zero legal replies and reconstructs every piece role. The
comments do not infer castling, queen sacrifice or a preceding forcing sequence.

Greco requires corner-file rook/queen check, bishop control of the vacant
same-edge-rank neighbor outside checker coverage, and an enemy pawn blocking
the inward diagonal neighbor. Example: “Greco mate: rook h2 checks; bishop d5
seals g8, and pawn g7 blocks escape.” Blackburne requires an edge bishop mate,
an opposite-color bishop and knight each sealing a vacant flight outside BOTH
other pieces' coverage. The knight must protect an adjacent checking bishop.
Edge/rook-blocker and corner/board-edge forms are exercised. Mere bishop pair
and knight presence is insufficient; each helper has a distinct duty.

Kill box requires contact rook check at an edge, queen exactly two diagonal
squares away protecting the rook across an empty midpoint, king inside their
inclusive three-by-three rectangle, and queen coverage of every vacant flight
outside rook coverage. Full piece records, midpoint, rectangle and exact
helper-only flights are retained. Geometry removes only the king explicitly
for attack inspection; actual terminal mate is separately checked legally.

Meaningful refutations include missing bishop, knight or blocker, a knight
substituting for Greco's bishop, king/pawn supporting two bishops without a
Blackburne knight, a more distant supporting queen, a bishop replacing the
Kill-box queen, and a pawn interposing on queen-to-rook support while supporting
the rook itself. Several are actual mates with different roles and must remain
unnamed by this profile. Default false preserves the exact frozen E045 result.
The shared 50,000-node classification budget drops all new tags on exhaustion,
retaining parent facts. Omitted flights, blockers, support, helpers, midpoint,
box bounds and history mismatches/terminal continuation are rejected by replay.

The first independent empty-square assertion expected null; the maintained
library returns undefined. Falsy emptiness validation rejects occupied squares
and handles that API correctly. The first alternative pawn-helper fixture
blocked its own bishop's route and was legally refused; a different authored
corner mate supplies the intended negative. These exposed corrections are
recorded in the plan; detector terminal/role gates were unchanged.

Validation: 77 new and 1,351 cumulative tests pass; maintained-source and diff
checks pass. Main evaluates 1,218 authored/reflected cases: 1,180 with facts,
32 abstentions and six invalid moves refused. Selected comments stay at most
19 words. Independent replay checks 2,137 event certificates, 140 mate queries,
8,743 reply/history edges and 25,818 leaves. New cases use 80 classification
nodes and no new mate-search nodes. Coverage reaches 253 verified names across
288 original occurrences, with 77 partial and 720 unimplemented. Greco mate,
Blackburne's mate and Kill box retain the exact scopes above. Original list
unchanged.

Main, repeat and initially clean checkout match all normalized input hashes,
deterministic output hashes and metrics at source revision d20ec3c. Final runs
took 99–101 seconds; clean working-tree status is empty. Separate saved JSON
replay verifies 24 new certificates (eight per named pattern) and 44 helper-
flight witnesses, plus 28 actual mates correctly receiving no new label and
20 missing-role/blocker nonmates. All 1,146 inherited full-result hashes exactly
match E045 in fixture order. Retained evidence totals 1,741,789 bytes, below
3 MB. Guarded D001 test receipts retained.
[Demo](evidence/demo.html), [tracker](evidence/concept-status.md),
[results](evidence/results.json), [main](evidence/run.json),
[repeat](evidence/repeat-run.json), [initially clean checkout](evidence/clean-run.json).

Reproduce with `node research/experiments/E046-coordinated-mating-patterns/code/run.mjs --out research/runs/E046/reproduction`.
Saved JSON replay obtains guarded D001 test receipt and calls
`replay(row.fixture, event)` from code/replay.mjs for greco-mate,
blackburne-mate and kill-box-mate. Full new certificates are directly in JSON.
Pilot: research/runs/E046/development. No registered game was analyzed.

Synthetic mechanics are verified; real-game explanation precision and human
learning benefit remain unmeasured. Next: E047 investigate Legal's mating
pattern with verifiable played history and additional terminal king-location
concepts from the supplied list. Preserve the original list and frozen evidence,
keep production separate and commits local.
