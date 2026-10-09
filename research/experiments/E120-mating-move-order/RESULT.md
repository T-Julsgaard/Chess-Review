# E120 — provisional mating move-order comparison

Preregistered 2026-10-09 at 4acd31d, parent E119 fff376a. Final retention and
local completion 2026-10-10 after runner interruption. User-authorized main;
research only, local commit/no push. No production or numerical change.

Default-false moveOrderTags, required strict UCI orderFollowup when enabled,
orderTailPlies integer 0..2 default0, maxMoveOrderNodes integer 0..50000 default
50000. Disabled exact E119. Atomic budget drops only new findings. Validated
live actual/history, <=10 units, quiet legal alternatives A/B from distinct
nonpawn pieces (king allowed), actual A leaves live position.

C0761: complete opponent defense inventory after A; EVERY reply permits the
same quiet B, followed by full mate at tail H. Reversed B first FAILS full mate
at H+2, covering ALL actor continuations rather than only replaying A. Exact
same total continuation depth and actual history/clocks; not global optimality
or psychological trick. C0769 additionally A checks and every legal evasion
permits the same winning B. No move-order intent or strategic quality claim.

Authored Kf6 Ra1 Bh5 Pg5 versus Kh8 Nc2: Ra8+ forces ...Kh7, then Bg6#.
Bg6 first permits ...Nxa1, defeating every bounded continuation. Without Nc2,
both orders mate and labels are withheld. Complete branch inventories retained,
including first failing continuation and reverse success/failure witnesses.
Both colors, history and H1 extension, insufficient followup/escape, checking
line blocked by extra knight, illegal/capturing/pawn/same-piece followups,
actual terminal mate, fifty-move draw and atomic budget cases retained.

Development failures: initial Bb1 already controlled h7, making Ra8 immediate
mate (correct not-live refusal). Bb3-g8 instead allowed ...Kh8 because bishop
g8 blocked rook's eighth-rank ray. Both are retained negative fixtures. Moved
bishop to h5 for actual positive. First 41-check run failed pawn-followup fixture
because added a2 pawn blocked Ra1-a8; moved that irrelevant test pawn to b2.
No gate changed. Final 45 focused checks passed in 3.0 seconds. Runner later
failed spawning metadata-file preparation; inspected authoritative file/status
state, confirmed scripts absent, prepared only those scripts, reused unchanged
passed tests. No chess run was restarted merely for observation timeout.

Three E119 representative disabled/strict/history checks pass in 0.8 seconds.
Source verification and diff checks pass. Guarded D001-test synthetic pilot and
neutral saved semantic replay pass 32 cases, 16 witnesses, 6 positives and 4
expected exhaustions. All 128 normalized source/fixture/parent dependency hashes
verify. Checker reconstructs history, exact root A/B legality, ALL defense list,
failed prefixes and complete positive/negative mate trees without candidate or
solver import. No acquired games, engine, labels, holdout or pristine frozen run.

Evidence copied from research/runs/E120/final to evidence/results.json.gz and
evidence/run.json. Revision plus actual source hashes, environment/argv,
engine:null, seed:null and guarded eligibility receipt bound. Plain139166 bytes,
gzip17276 bytes. Packed SHA256
a7953b9a9307c01a22c08d254b8280a2842bfc85f8f391074867816acf91c21c;
plain a79334d4080d34915ae09a0b048c64f862752afe04ba9b9c24bf6db590c3c282.
Replay: node research/experiments/E120-mating-move-order/code/replay-saved.mjs

Accepted E082 unchanged: 378/1085 (34.8%), 328 names. Build: 289 provisional
entries, 41 ready/0 stale batches; 667 accepted-or-candidate (61.5%), 418 without
ready code. Broader original meanings stay open. Deferred combined cumulative
regression, exhaustive semantic/absence/priority/history/budget/integration/
occurrence audit, frozen main/repeat/clean and real-game precision/usefulness.
Positive quiet-first and longer-tail/many-defense matrices remain combined gaps;
current positive evidence establishes the explicit checking sequence only.

Next unused E121: inspect remaining quantified defensive outpost/overextension
or forcing-pawn families with reusable material/mate policies. Perpetual attack
requires operational repetition/continuation evidence, not a finite mate label.
Continue focused compatible batches; no long cumulative/historical reruns.
