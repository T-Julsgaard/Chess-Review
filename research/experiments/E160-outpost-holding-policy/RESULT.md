# E160 — bounded outpost holding and exchange policy

2026-10-10. Preregistered cb5f852; parent E159 a6d4b7e, initial in-progress
retention d1d1279. Current main authorized, research-only/local commits/no push.
Code-ready provisional C0321/C0701 scopes, not accepted research. Full catalog
goal remains active; neither broad occurrence is declared complete.

Adds complete actual-history policy after E070 initial pawn-route/legal-support
admission. For every enemy reply, retain all legal own moves and every eligible
quiet holding response or original-support pawn recapture. Every legal enemy
counterreply must leave a live position and retain baseline material. Holding
requires original knight on its fixed outpost and at least one original supporting
pawn unmoved/still supporting; recapture requires the recapturing pawn retained
on the outpost. Every reply needs at least one successful response; all failures,
inventories, flags and material remain explicit. Visited claim states withhold
whole policy. C0701 additionally requires kings/knights/pawns-only root with
knights on both sides. This finite two-enemy-turn policy never establishes general
permanence, optimality or a winning endgame plan.

Strict outpostHoldingTags and integer0..50000 maxOutpostHoldingNodes, optional
complete outpostHoldingPanel. Own atomic budget covers wrapper3, exact E070
query and raw tree; no partial finding on exhaustion. Actual quiet nonchecking
knight arrival on c-f relative ranks4-6, full true history required. Parent E159
events preserved, new events qualityClaim:false and <=24words. Frozen E070
initial semantic replay reused without modifying its accepted source/evidence.
Independent own verifier reconstructs full actual history/tree; independent own
checker reconstructs retention/material policy and event scope without importing
collector/derive/detector. Shared Chess semantics remain a limitation.

Original smoke honestly failed positive/general/no-pawn hypotheses: a waiting
enemy king/pawn move leaves Ng7xf5 available on the second enemy turn. Ra5 also
checks starting Ka1, making actual Nd4f5 illegal. Both negative controls passed.
failure-waiting-knight.json.gz retains all six reports/errors, five complete
independently checked raw panels, original source snapshots and dependency hashes.
AMENDMENT prospectively adds White Nd5/Ne5 as explicit quiet checking resources,
moves the rook control to f8 and support-removal rook to e3. All policy gates
unchanged; original single-knight delayed-challenge control retained. This is a
finite resource comparison, not an isolated one-piece causal intervention.

Corrected six-family white smoke passed, all six witnesses independently checked.
Base White Ka1 Nd4 Nd5 Ne5 Pe4 vs Black Kh8 Ng7 Pa7; actual Nf5. After pawn wait,
Ng6 checks Kh8; after Kg8/Kh7, Nf6 checks. Immediate ...Nxf5 admits exf5 with pawn
and material retained through all enemy counters. Added Rf8 defeats the recapture
via ...Rxf5/exf5/Nxf5 despite material profit. Original single-knight/Nb7 setup
fails delayed ...Nd6. Own Bb1 allows general policy but excludes knight-ending
scope. Black Re3 can capture original Pe4 support. No-enemy-pawn variant retains
explicit empty initial pawn graphs and still requires actual pawn support.

Guarded collection:12 complete both-color panels, six exact white smoke reuses,
six reflected fresh panels. Costs1550/1550/5263/5263/486/486/1710/1710/5672/5672/
946/946. Collection checks every retained witness. Observations452,677compressed
bytes/20,956,005plain,216 collection source hashes; smoke and initial failure also
retained. All positions authored synthetic, D001-test receipt guards throughout;
no acquired games/engine/tablebase. Complete combined evidence size not finalized.

Initial focused attempts failed with Node allocation errors before a named test
completed; FOCUSED-FAILURE.md preserves exact commands/diagnostics. Subsequent
isolation found malformed caller panel {} triggered huge deep-equality failure
formatting. A bounded streaming loader alone reduced memory but did not fix that
diagnostic. The original parsed-all-panels loader remains unchanged because it
is in the original collector source closure; new consumers use a separate loader.
Source-only comparison migration replaces two assert.deepEqual full-tree calls
with assert.ok(isDeepStrictEqual(...)) and compact messages. Deep comparison and
acceptance predicates remain unchanged, not relaxed. Both original verifier
sources/hashes are retained in comparison-source-snapshots.json; bounded loader
mechanically reconstructs exactly those edits, rejecting any other source change.
Current build/pilot fingerprints bind new bytes; original collection hashes stay
intact. Independent current semantic replay is still mandatory. See dated
MEMORY-AMENDMENT.md; no fixture, policy, history, budget or branch changed here.

Bounded loader streams one complete retained comparison at a time into ignored
gzip cache shards bound to original observations SHA256 and per-shard hashes.
On admission it checks key, original initial certificate, cost and compressed
bytes. Entry points share their already opened D001 guard context rather than
reopening the same registered inputs. Pilot writes rows incrementally; saved
replay streams result/smoke rows and hashes, never rebuilding the whole corpus
in memory. Original observations/smoke/failure artifacts unchanged. All12 panels
reused in this finishing step, no new chess searches or recollection.

49 focused checks pass28.8seconds, plus2 representative E159 parent checks.
Includes both colors, default-disabled/strict controls, fresh/cache and exact/
one-short atomic budgets, original support and actual pawn exchange, material
profit insufficient when recapture pawn is lost, delayed piece challenge, lost
support, distinct knight-ending occurrence, empty pawn graphs, failed initial
support/future pawn routes, quiet/check/capture gates, four-ply true prefix charged
+8 across initial proof/tree, fifty-move abstention,20 independent tree/policy
mutations and caller/event metadata admission. Compact malformed rejection alone
passes in0.17seconds; no long cumulative or exact reproduction run attempted.

Guarded16case pilot passes:6 positives,12 complete witnesses, two each missing
history and zero cap. Independent saved replay checks all12 full raw trees and
E070 initial certificates, original source/migration admission, every response/
counterreply, policies, parent snapshots, receipts, commands/environment and515
normalized source/dependency hashes. All six corrected smoke results exactly
match current pilot fingerprints and independently replay. Canonical pilot copies
byte-identical to replayed run; replay also passes at canonical evidence path:
node research/experiments/E160-outpost-holding-policy/code/replay-saved.mjs
Source verification/diff checks pass. Full E159 parent build and recursive static/
dynamic behavioral dependency closure retained; text LF-normalized, binary exact.

Evidence bytes: observations452,677, smoke232,562, results487,669(21,301,099plain),
failure85,855, run.json73,890, source snapshots7,650; total1,340,303. Compressed
artifacts1,258,763 exceed500KB soft target by758,763bytes. Complete raw response/
counterreply inventories, initial failed hypothesis, original smoke and current
result preserved losslessly. This is justified proof storage, not a reason to
prune branches, relax material/retention gates or spend more time optimizing size.

Accepted E082 unchanged:378/1085(34.8%),328 names,63 accepted studies. Build383
provisional entries,80 ready/0 stale batches;761 accepted-or-candidate(70.1%),
324 without ready code. Production, numerical work, accepted tracker and shared
policy unchanged. Full cumulative/exhaustive occurrence/absence/priority/history/
budget integration and exact main/repeat/initially clean reproductions remain
deferred to combined freeze. Broad permanence/strategic value and real-game
precision/human usefulness remain unresolved; full catalog remains in scope.

Next compatible approved rank is C0360/C0722 queen activity, followed by C0371/
C0884 queen versus two rooks and C0372/C0885 queen versus rook/minor. Audit existing
objective/alternative policies for genuine reuse and preserve distinct queen-ending
scopes; do not infer activity or relative strength from nominal material/mobility
alone. Earlier explicit prerequisite work remains in backlog, not deleted.
