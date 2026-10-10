# E147 — opening pressure and finite positional estimates

2026-10-10. Prototype, not accepted evidence. Preregistered ea6f06f, parent
E146 bc7c62f. Authorized current main, research-only local commits/no push.
Two new credited provisional scopes C0149/C0171. C0170 was implemented as a
conditional rule but receives NO ready-code credit: both prospectively authored
genuine equalization hypotheses failed. Synthetic numeric success is not a
replacement for genuine positive evidence. General opening judgments stay open.

Full canonical standard-start history and first20plies INCLUDING actual move
are required. Move counters or an arbitrary opening-looking board cannot supply
this context. Missing/nonstandard/late history is explicitly unavailable. Exact
tactical pressure and bounded positional engine opinions remain separate.

C0149 quiet early mate pressure: after the noncapturing/nonpromoting/nonchecking
actual move, enumerate EVERY legal opponent reply. E143's complete same-bound
queries identify replies allowing original actor immediate mate, and replies
whose complete failed one-ply queries prove absence of immediate mate. Require
both classes. A defense can counterattack or lose later; it is never labeled
generally safe. This proves early pressure requiring an immediate response,
not sustained strategic initiative, a best move or a newly created threat.

White e4/e5,Bc4/Nc6,Qh5:28legal replies,20allow immediate mate,8prevent it.
Black counterpart uses real standard-start White a3 then e5/e4,Bc5/Nc3,Qh4:
29legal replies,21allow immediate mate,8prevent it. No fake color-reflected
initial board. Full histories and all alternatives retained. Costs1736/1752
logical pressure nodes including1opening-context tick. Claim contexts anywhere
in panel exploration abstain, including discarded branches.

C0171 requires actual candidate actor-perspective CP>=100 at BOTH fixed
1000/2000requested-node budgets, with complete admitted candidate panels.
Comments explicitly say recorded Stockfish estimate; no exact positional
advantage, player consensus or human win probability. Mate scores never become
centipawns. Claim-sensitive PVs suppress estimates. Actual root candidate score
is used, not the separately searched PV endpoint. White-to-Black sign is exact.
Mock bundles remain synthetic and cannot emit recorded-Stockfish judgments.

C0170's unchanged experimental rule: actor Black; INITIAL best White CP>=15
at both budgets, current actual White CP within[-30,+30], and decline>=15 at
both. Initial frame uses the best recorded root score/all ties, not a hoped-for
initial e4 outcome or a different PV endpoint. These fixed research conventions
were not calibrated to teaching validity and were not changed after exposure.

Genuine estimate results (CP at1000/2000nodes):

| Registered case | Initial best White | Current White | Outcome |
| --- | --- | --- | --- |
| Black ...e5 after e4 | +32/+18 | +15/+31 | Equalization hypothesis fails; second budget outside balance and no decline |
| Italian ...Bc5 after e4/e5,Nf3/Nc6,Bc4/Nf6,d3 | +32/+18 | +28/+23 | Equalization hypothesis fails; insufficient decline |
| White Nxe5 after e4/e5,Nf3/f6 | +32/+18 | +25/+25 | Favorable-position hypothesis fails100CP threshold |
| Black Nxe5 after e4/e5,Qh5/Nc6,Qxe5+ | +32/+18 | -864/-861 | Black edge estimate passes; actor CP+864/+861 |
| Exposed initial/e4 control | +32/+18 | +32/+18 | No new judgment |
| Exposed Italian/d3 control | +32/+18 | +9/+12 | No new judgment; actual actor White cannot satisfy Black equalization rule |

All three failed prospective hypotheses are retained. No additional lines were
searched until success, thresholds retuned or negative cases dropped. C0170's
conditional numerical branch has explicit positive/negative boundary tests but
no genuine positive pilot and no build coverage credit. Stronger-budget and human
validity studies are required before broader positional judgments.

Default-false openingJudgmentTags wraps E146. Strict maxOpeningPressureNodes
0..50000default50000; maxOpeningEngineSearches0..512default512. Runtime only
consumes supplied observations; it launches neither engines nor tactical queries.
Pressure cost is1context plus full E143 exact trace/proof/history cost. Engine
cap charges baseline+current ledger calls, including recoveries and borrowed
observations, without cache discounts. These are represented per-role logical
calls, not a claim of new physical searches; initial control charges its same
baseline/current bundle twice as prospectively specified. Insufficient cap
atomically removes ALL new witness/events, including an earlier pressure label.
Missing/incomplete components remain unavailable rather than negative findings;
incomplete raw prefix is retained. Parent behavior is preserved.

Provenance failures/repairs: first cache assembler refused full historical E138
receipt equality because E140's tablebase-only addendum changed DATA_POLICY.md's
fingerprint. Preserve receipt-refusal.json. Historical bytes are verified from
E138's exact revision, with LF/CRLF checkout encoding recorded. Every other
receipt field must equal the current successful guard; current policy must equal
old text plus ONLY the entire literal addendum. First repair omitted its final
two lines and correctly refused again. No receipt or shared policy was rewritten.
Initial final-pilot retention then refused an undefined vendor hash. Build closure
now includes ALL raw/borrowed dependencies and engine bytes. Static discovery
also omitted dynamically launched engine-host.cjs; source-audit.json verifies
unchanged committed host bytes at collection revision against current bytes,
explicitly a supplementary audit, not a contemporaneous snapshot. Raw observations
remain byte-identical. Admission/replay require that audit and its output hash.
No chess gates, claims, source eligibility or search outcomes changed.

38behavior/contract focused checks passed24.1s before the metadata repair;
2new focused source-audit/manifest checks pass afterward without repeating the
unchanged behavior suite. Twelve fixtures, strict/disabled parent equality,
exact/one-short pressure and engine caps, combined atomic exhaustion, perspective,
failed hypotheses, synthetic numeric boundaries/mock refusal, incomplete-prefix
contract, nonstandard/late histories, historical receipt refusal and12independent
pressure/engine/summary mutations, caller admission and quality/copy checks.
Two representative E146 parent checks pass. Source verification/diff pass.
No cumulative suite, long historical reconstruction or engine reruns for repairs.

Guarded D001-test pilot12cases,3positive,9witnesses. Two raw pressure panels and
six unique engine panels. Reuse first White pressure smoke and first Black ...e5
engine smoke; collect one Black pressure panel and three further new engine
panels once. Two hash-matched exposed E138 engine panels (initial/e4 and Italian/d3)
are borrowed with full source/output/collection provenance and independent replay.
Four newly collected engine roots total171calls,257,000requested/192,717observed
nodes, including one recovery in ...Bc5's61calls. Tiny requested budgets can
overshoot or terminate early. Other current counts42/56/12; borrowed42/68.
Historical borrowed calls are not new work. Final pilot/replay use cached data.

Pinned unchanged Stockfish19 Lite single-threaded JS/WASM, nn-61e7af4bb97d.nnue,
Hash32,MultiPV1,full strength,ShowWDL,no tablebases. Fresh game/Clear Hash/isready
before each search. Full standard-start UCI histories, every legal restricted
candidate at both budgets, raw wire, startup/options, PVs and endpoint searches
retained. Full independent saved replay checks BOTH tactical panels and all six
engine bundles, including original borrowing bytes/policy audit. Checker imports
Chess and existing independent panel validators, never new detector/collector/
engine launcher or numeric derivation helper. It independently derives opening
context, threat partition, CP perspective, thresholds, exact copy and costs.
Shared Chess/admission semantics are not independent engine/outcome validation.

Retention: observations.json.gz128,149bytes; results.json.gz318,982bytes
(2,797,916uncompressed); run.json, receipt-refusal.json and source-audit.json.
Raw closure26hashes plus supplementary host binding; complete build284normalized
source/plan/fixture/dependency/vendor hashes. Environment, commands, engine/seed,
receipt, preregistration revision plus working-source hashes and output hashes
retained. Larger retention than finite-mate batches preserves complete wire/PV/
alternative evidence and separate source audits; soft storage targets do not
justify dropping branches or spending additional time on deduplication here.
Authored only: no game content, new data source, tablebase or imported diagram.
Accepted tracker, shared policy, production and numerical behavior unchanged.

Accepted E082 stays378/1,085(34.8%),328names,63accepted studies. Build351
provisional entries,67ready/0stale batches;729accepted-or-candidate(67.2%),
356without ready code. Narrow scopes never complete broader occurrences.

Deferred: genuine positive C0170 evidence before credit, combined full regression
and occurrence/absence/priority/history/budget audit, exact main/repeat/clean
reproductions, stronger-budget robustness and human/real-game usefulness. Next:
center dynamics/overextension/collapse with actual history and causal controls;
preserve opening equalization, positional-compensation, sustainable perpetual
attack and named rook-defense prerequisites. Full catalog goal remains unfinished.
