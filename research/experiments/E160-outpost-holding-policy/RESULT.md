# E160 — bounded outpost holding and exchange policy, in progress

2026-10-10. Preregistered cb5f852; parent E159 a6d4b7e. Current main authorized,
research-only/local commits/no push. Callable default-disabled prototype exists,
but focused checks have NOT passed and no build.json has been generated. Neither
C0321 nor C0701 counts as code-ready/accepted. Full catalog goal remains active.

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

Focused test module, guarded pilot, independent saved replay and build metadata
generator written. Pilot/replay/build generator have not run. Focused workflow
failed before named tests due Node allocation failure; repeated small isolated
attempts confirmed memory failure rather than a reported assertion. See
FOCUSED-FAILURE.md for exact commands, elapsed times and diagnostics. No claim
that these checks passed. No cumulative suite or exact reproduction run attempted.

Next concrete action: change saved-evidence loading to process one comparison
at a time, retaining every branch/hash/receipt and reusing collected panels.
Avoid repeating the same whole-file attempt before that change. Then finish
focused/representative-parent checks, small pilot, independent saved replay,
source/diff verification and code-ready record. Full cumulative/exhaustive scope/
priority/history/budget audits and exact main/repeat/initially clean reproductions
remain deferred to combined freeze. Broad permanence/strategic value and real-
game precision/human usefulness remain unresolved; production/numerical/accepted
tracker unchanged. No E160 completion credit while this work remains unfinished.
