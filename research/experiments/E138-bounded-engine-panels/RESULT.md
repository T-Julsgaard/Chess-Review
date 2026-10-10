# E138 — provisional bounded engine observation panels

2026-10-10. Preregistration 5da8d97, parent E137 b267bc5. Authorized current
main, research-only local commits, no push. BUILD-FIRST.md. Four new original
analysis-tool scopes C0123/C0124/C0125/C0133, plus broader nonmating tool scopes
for C0118/C0138. Accepted tracker, numerical research and production unchanged.

Default-false enginePanelTags wraps E137 synchronously and consumes supplied saved
observations; it never launches an engine. Disabled behavior is exactly parent.
Strict maxEnginePanelSearches integer 0..512, default 256. Unsupported full
standard-startpos history, missing observations or collection failure preserve
parent events/comment with explicit unavailable status. Preflight requires
2*legal-root-count+2 searches; an insufficient cap refuses before engine launch.
All harness calls, including automatic recovery, consume the shared cap. Failed
collections retain their prefix but receive no extra panel labels.

Collector reuses unchanged tools/calibration/engine.mjs and engine-host.cjs.
Pinned Stockfish 19 Lite single-threaded JS/WASM and nn-61e7af4bb97d.nnue, Hash32,
MultiPV1, strength20/full, ShowWDL, no tablebases. Fresh game/Clear Hash/isready
before every search, full startpos move history. Independently restrict EVERY
legal root move with searchmoves at both prospectively fixed budgets 1000/2000
nodes. Save exact commands, raw wire output, reported score/WDL/depth/seldepth,
actual nodes/elapsed/PV, complete request/result ledger and startup/configuration.
Node limits are requests: actual work can overshoot or end early.

Rank observed scores with all top ties retained: reported positive mate above cp,
negative mate below, shorter positive/longer negative first, cp descending and UCI
tie break. This ordering is a finite engine opinion, not exact mate evidence,
universal move quality or human calculation. Root breadth counts legal candidates;
internal tree breadth is unavailable. Reported depth, selective depth and PV
length remain distinct. Replay every PV legally with SAN/FEN/turn and terminal/
claim flags. Independently search the actual candidate's live PV endpoint at the
same budget and full concatenated history, preserving both endpoint-root score
and original-actor sign/WDL. Terminal/claim-sensitive endpoints get explicit
mechanical/unavailable state rather than an invented score. Engine cp/WDL do not
establish material prices or human win probabilities.

36 focused checks pass in 4.5s, plus three representative E137 checks in 0.6s.
Mocks are explicitly synthetic, labeled "Mock engine", and never engine evidence.
Checks cover disabled/strict/missing/history/Black perspective, exact cap42 versus
41, guarded zero-cap collector without launch, parent preservation, endpoint
parity, reported mate ordering, node overshoot and separate depth/PV semantics.
Twenty-one observation mutations plus derived order/perspective/startup/comment
mutations are rejected. Synthetic failure states preserve parent behavior.
The earlier focused-test output was unavailable after context compaction; the
retained reported check is the completed short rerun. No cumulative/long tests.

Real guarded pilot uses TWO authored roots only, no acquired games. Initial
position/e4: all20 candidates,42 searches,63000 requested/46588 observed nodes;
top e4 at both budgets, depth ranges5–8/5–11, actual PV4/5plies. Independent
endpoint scores for White36cp/6cp. Authored e4 e5 Nf3 Nc6 Bc4 Nf6, actual d3:
all33 candidates,68 searches,102000 requested/76438 observed nodes; top Nc3 at
1000 versus d4 at2000, depth5–12/6–14, actual PV2/7plies. Endpoint scores for
White28cp/−61cp. Retain disagreement without tuning or rerunning until stable.
Combined110 searches,165000 requested/123026 observed nodes; no recovery calls.
Fresh second-root collection took3047ms; first smoke was reused, not recollected.
These tiny budgets and two authored positions establish machinery, not precision
or robustness of engine recommendations. Endpoint scores concern their respective
PV endpoints, not identical positions across budgets.

Smoke reuse audit checks eight contemporaneous source snapshots and the complete
19-file collector/fixture/harness/helper/engine closure. Remaining dependencies
match committed bytes at smoke revision5da8d97; actual engine raw hashes match
the configuration. All source audit records and snapshot are embedded in retained
evidence. Later checker/mock/test/runner additions did not change collection
sources. Current build binds165 source/fixture/plan/instruction/config dependencies,
including explicit host, engine loader and raw WASM; vendor loader is a leaf, not
heuristically parsed as imports. Every entry point retains the D001-test guard;
policy/registry unchanged, no D001 game content used.

Independent checker imports neither collector nor detector/parser/ranker. It
reconstructs legal inventories, raw UCI fields, root restrictions and search
ledger, startup/options/identity, legal PVs, ranking/ties, endpoint flags/history/
perspective and exact comments. Saved semantic replay passes both real roots,
all110 recorded requests and165 source hashes without launching an engine.
Noncomplete-state checks establish refusal/no partial labels, not exhaustive
validation of every possible partial error transcript. Recovery, terminal and
claim-sensitive collection paths have no real pilot example here; their broader
integration matrix remains deferred. Raw-log/source validation authenticates
retained bytes and declared bindings, not mathematical truth of engine opinions.
Source verification and diff checks pass.

Evidence copied from research/runs/E138/final to evidence/results.json.gz and
evidence/run.json. Revision5da8d97 plus actual working source hashes, environment,
argv, full engine config, null seed, receipts and collection/reuse audit retained.
Staged whitespace checking found one trailing empty line in the fingerprint
generator. Removed that line, regenerated build hashes and rebound only that
metadata source fingerprint, retaining the prior packed hash and old/new source
hashes in metadataAmendment. Collector, fixtures, analysis, checker and all real
observations unchanged; no engine recollection. Original pilot remains retained
locally. Independent saved replay repeated on the final evidence after rebind.
Plain547643bytes, gzip65632bytes. Packed SHA256
d277347b309dde9023cae85b7dc046cda4ad0afb3068778949fbe0a2bba5580d;
plain 6a7331fcc8fbc4939bc5a9f450b9e81c805875519216149a5061e6269524cf56.
Replay: node research/experiments/E138-bounded-engine-panels/code/replay-saved.mjs

Accepted E082 remains378/1085(34.8%). Build330 provisional original entries,
59ready/0stale batches;708 accepted-or-candidate(65.3%),377 without ready code.
Deferred combined cumulative regression, exhaustive interaction/absence/priority/
history/budget/original-occurrence audit, exact main/repeat/initially clean
reproductions, real-game precision/usefulness and strategic decision thresholds.
Broad thinking-method lessons, best-response quality and full endgame outcomes
remain unresolved; analysis-tool coverage does not discharge these definitions.

Next unused E139: continue compatible defensive/endgame or causal comparative
families. Reuse saved E138 observations only under full source/history/config/
budget bindings. Preserve sustained rook-defense, perpetual-attack, tablebase
format/provenance and strategic-quality prerequisites; no tiny-score threshold
alone may supply a favorable/unfavorable strategic label.
