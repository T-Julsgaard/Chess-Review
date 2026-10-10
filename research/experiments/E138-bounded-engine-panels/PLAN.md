# E138 — bounded nonmating engine observation panels

2026-10-10 before any E138 engine run/evaluation. Parent E137b267bc5. Current main
authorized, research-only local commits/no push. BUILD-FIRST.md; numerical research
and production unchanged. This is coach analysis tooling, no fitting/calibration.

New tool scopes C0123 observed candidate ordering, C0124 reported engine depth/
selective depth, C0125 complete legal ROOT candidate breadth, C0133 independently
searched actual-PV endpoint evaluation. Broaden existing C0118/C0138 to finite
nonmating Stockfish PV/candidate observations. No player mental-state inference,
complete internal-tree breadth claim, universal move quality, exact mate/outcome,
material-price interpretation or human win probability. Strategic teaching quality
and validated comparative decision thresholds remain unresolved.

Reuse unchanged tools/calibration/engine.mjs and engine-host.cjs, exact bundled
Stockfish19 Lite JS/WASM/network hashes, single-thread, Hash32, strength20/full,
ShowWDL, no tablebases, fresh game/ClearHash/isready before EVERY search. Restrict
each legal root candidate independently with searchmoves; fixed node budgets1000
and2000, same root full standard-startpos history. Never replace missing candidates
with topN/MultiPV. Retain all rawInfo/finalInfo, score/WDL, requested budget,
observed nodes/depth/seldepth/PV and exact command root. Nodes may overshoot or
search end early: record actual counts, never claim identical completed work.

For each budget retain full candidate panel, rank only observed root-side engine
scores (positive reported mate above cp, negative below, shortest positive mate/
longest negative delay first, then cp, UCI tie break). Compare observed top sets
across budgets without requiring agreement; disagreement is evidence, not a reason
to tune/rerun until stable. Never translate reported mate score into a proof.
No good/bad trade or strategic advantage label from tiny searches.

Replay every reported PV legally from exact full input history, including actual
candidate as first move. Save SAN/FEN states and endpoint/side/terminal/claim flags.
After each budget's ACTUAL row PV, separately search its live endpoint at that same
budget with full concatenated history. Terminal endpoint gets mechanical record,
claim-sensitive endpoint explicitly unavailable rather than fabricated evaluation.
Preserve endpoint root-side score AND convert its sign/WDL to original actor side
using actual turn parity. Root candidate scores already actor-perspective. Depth
is reported nominal search depth, seldepth is selective, PV length is separate.

Collector uses openResearchData D001 test guard before engine launch, exclusively
authored synthetic startpos-history fixtures. No real games or acquired examples.
Count EVERY harness search call including automatic recovery via subclass override;
retain request/result/error ledger. Shared maxEnginePanelSearches integer0..512
default256, preflight required2*legalcount+2 and abstain before launch if too small.
Recovery consumes extra remaining allowance; exhaustion atomically drops extra
comment events while retaining collection prefix for diagnosis. No partial panel
labels. Close engine in finally. Same hash-bound saved observations reused for
analysis/tests/replay, no duplicate searches for each consumer. Combined fresh
main/repeat/clean collection later. Small pilot<=2roots, <=128normally requested
searches, <=256000requested nodes; smoke one root first, target seconds/tens of
seconds. If cost/engine failures exceed expectation retain inconclusive state,
do not launch repeated long tests.

Defaultfalse enginePanelTags synchronous explainMove wraps E137 and consumes a
saved complete enginePanel observation; does not secretly launch an engine. Strict
flag/search-cap controls. Missing/unsupported history or observations unavailable;
disabled exactly parent. Provenance+raw-log validation authenticates retained bytes
and declared collector/config bindings, not a mathematical proof the engine score
is true. Only collector-created real observations support pilot evidence; unit
mock transcripts explicitly synthetic and cannot establish engine performance.

Independent checker imports neither collector nor detector/parser/ranker. Verify
full legal candidate inventory, both budgets, raw UCI score/node/depth/PV fields,
root restrictions, exact engine/config/hash/identity, legal full-history PV replay,
rank/ties, endpoint/search/parity bindings and exact comments. Source fingerprints
include complete JS dependency closure, collector host, engine JS and raw WASM.
Strict/missing/malformed rows/budgets/raw logs/history/PV/score/sign/mate/WDL and
ordering/depth/breadth/endpoint/receipt/source mutation tests; parent preservation,
saved replay, source verification and diff. Focused tests use mock engine opinions;
real smoke/pilot small and separately retained. No long cumulative suite.

Prospective roots: standard startpos, actual e2e4; authored legal sequence e4 e5
Nf3 Nc6 Bc4 Nf6, actual d3. Require full legal inventories, not a preferred-move
hypothesis. Do not tune budgets/ordering after observations. DATA_POLICY allows
authored synthetic mechanics; these records derive solely from retained fixture
source and pinned local engine, not D001 game content. Registry/guard unchanged.

Queue deviation: sustained rook defense/tablebases and broad strategic quality
need stronger outcome/evaluation prerequisites. This batch supplies genuine bounded
nonmating observation inputs for later comparisons rather than claiming cheap
geometry or finite mate cases solve those scopes. Preserve whole teaching catalog.
Deferred combined regression, exhaustive interaction/absence/priority/history/budget/
original-occurrence audit, exact reproductions, real-game precision/usefulness,
calibration of strategic decision thresholds, human relevance and full outcomes.
