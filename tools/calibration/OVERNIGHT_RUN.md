# Overnight run: 30 September–1 October 2026

Research only. Production scoring and the reserved final test are untouched.
Resolved hard deadline: **2026-10-01 09:00 Europe/Copenhagen (07:00 UTC)**.
Engine computation stops at 08:30 Copenhagen, reserving at least 30 minutes
for final fitting, checks and the report. The computer must remain powered
on and awake; no system power settings were changed.

The tested recent importer selects complete games inside bounded PZstandard
frames from June, July and August 2026. The 2,000-game dataset has globally
unique players, five equal **focal-player** rating quotas, and immutable
70/15/15 splits. Both sides stay together. Archive windows and quotas are
not population representative. Frame bytes/ranges/hashes are recorded;
full archive published checksums are **not** verified. Supplied evaluations,
comments, variations and NAGs are discarded. Question-mark ratings are
excluded, but monthly PGNs cannot reliably identify other provisional players.

Plan: use a fixed balanced 100-game subset of validation; complete that and
100 training games on each engine first. Compare one/two workers on the same
recent training games. Probe fifteen short/median/long training games at
80k nodes and five median games at 320k for both engines. Expand balanced
training in measured batches only while time, resources and validation
improvements justify it. The final-test split remains entirely reserved.
The initial two-worker choice is conservative and its throughput is measured.

Exact SF18 and SF19 loader/WASM hashes are allowlisted. Their embedded networks
are `nn-9067e33176e8.nnue` and `nn-61e7af4bb97d.nnue`, respectively. Startup
checks UCI identity/options. Fixed nodes, MultiPV 1, WDL, Hash 32 MB, full skill,
single-threaded builds, no tablebases; full move history and state clearing
before each unrestricted/restricted root search. Raw UCI output, actual
nodes/depth and timing are retained in SQLite with bounded page cache and
durable transactions. Engine/search configuration and full history bind keys.
Completed-game records prevent repeated work after supervisor resumption.
JSON reports use atomic replacement; legacy JSONL torn-tail recovery remains.

Move quality is expected-result preservation; arithmetic and RMS accuracy
are documented percentage design choices. Three feature sets (arithmetic
loss alone, RMS loss alone, and four independent move-quality statistics)
and four ridge strengths are compared on fixed development validation.
Rating targets never enter the predictors. Learning curves include balanced
nested game prefixes and three seeded repeated subsets. Game-cluster
intervals retain both player sides together; unique players eliminate
additional repeated-player dependence. Residual intervals are exploratory,
not independently tested predictive coverage. Separate SF19 coefficients and
explicit SF18-to-SF19 transfer results are generated.

## Start, resume and inspect

```powershell
node tools/calibration/recent-dataset.mjs --out calibration-runs/overnight-2026-09-30/dataset --games 2000 --windows 20 --months 2026-06,2026-07,2026-08 --seed overnight-sf18-v1
node tools/calibration/supervisor.mjs --root calibration-runs/overnight-2026-09-30 --deadline 2026-10-01T09:00:00+02:00
node tools/calibration/supervisor.mjs --root calibration-runs/overnight-2026-09-30 --deadline 2026-10-01T09:00:00+02:00 --report-only
```

The actual launch uses a hidden detached Windows process. `supervisor.lock`
prevents overlap; stale locks are removed only after checking process liveness.
`status.json` records supervisor/child PIDs, phase, command, resources and failures.
`supervisor.log` and engine `progress.json` show completed games, searches,
throughput and ETA. `decisions.jsonl` records evidence for adaptive choices.
`report.md`/`report.json` are refreshed after batches. Each engine directory
contains raw reusable SQLite evaluations, feature data, metadata/UCI records,
benchmarks and immutable versioned fitting-source/candidate snapshots.

An hourly heartbeat attached to this chat (`overnight-chess-calibration`)
inspects these files and writes an evidence-based decision. `control.json`
can request `freeze`, a `batchGames` count from 25–250, or a stronger `probe`
with `engine` (`sf18`/`sf19`) and `nodes` (80000/320000), together with
`requestedAt` and `reason`. Requests take effect at batch boundaries without
overlapping engine processes. The heartbeat finalizes results and disables
itself when finished or at the deadline. It is scheduled only through the
resolved deadline. The local supervisor remains useful when the chat turn ends.

Freeze may occur early when development errors plateau; that does not make
the models accepted or production ready. Reports retain missing components
as inconclusive and disclose sample counts, sparse groups, prediction shrinkage,
player-band/length biases, observed learning curves and search instability.

## Refit and extend

```powershell
node tools/calibration/analyze-games.mjs --dataset calibration-runs/overnight-2026-09-30/dataset --out calibration-runs/overnight-2026-09-30/sf18-20k --engine engine/stockfish-nnue.js --nodes 20000 --workers 2 --sqlite --development-only --game-ids calibration-runs/overnight-2026-09-30/development-ids.json --max-new-games 100 --deadline 2026-10-01T08:30:00+02:00
node tools/calibration/build-features.mjs --dataset calibration-runs/overnight-2026-09-30/dataset --run calibration-runs/overnight-2026-09-30/sf18-20k --allow-partial
node tools/calibration/development.mjs --run calibration-runs/overnight-2026-09-30/sf18-20k --validation-ids calibration-runs/overnight-2026-09-30/validation-ids.json
```

Run extension commands only when the supervisor is idle. Existing compatible
evaluations are reused. For more data, import to a **new** dataset directory and
preserve old manifests/split assignments. Never change an existing run's engine,
budget or bound dataset. Cheap refits reuse raw searches and produce new
candidate versions. `loadExperimentalModel` fails closed on exact engine/search
metadata or unknown/target-derived features. It is a research loader, not
connected to production Chess Review. After a final holdout is examined,
new formula revisions need newly reserved games or time windows.

Promotion requires material baseline improvement with clustered intervals,
acceptable sufficiently sampled band/length bias, stable search budget,
exact build/network compatibility, and independent holdout/predictive coverage.

## Setup verification

The initial full suite passed (104 tests); subsequent deadline/loader checks
passed in the targeted suite. Engine checksums passed; lint had zero errors
and two existing extension warnings; local packaging succeeded. Tests cover
recent import legality/annotations/provenance, exact focal splits, game/player
leakage, target exclusion, mate/forced behavior, real engine repeatability,
SQLite resumption/corruption/compatibility, deadline partial results, and
final-test exclusion from planning/model selection/reporting. No push or
remote publication is authorized.

## 01:00 heartbeat repair

Both engines completed their initial 100-training/100-validation packages.
The deeper probes were selected across the full training pool; only one game
initially overlapped the completed shallow prefix. Explicit `sf18-probe20k`
and `sf19-probe20k` baselines now complete all 15 pairs at 80k and five pairs
at 320k before interpreting stability. Fewer than five pairs are labeled
inconclusive. Resumed throughput and projections count **new** completions,
and cache-only repeats have no projections; raw historical benchmark values
are preserved with corrected derived results in reports. Regression coverage
checks these cases. The full repository suite passed 111 tests at this wakeup.
