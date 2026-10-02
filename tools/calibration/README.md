# Independent calibration experiment

Status: offline pilot, not a production calibration. No extension behavior changes.

The [public time-control study](TIME_CONTROL_RUN.md) adds independently sampled
bullet and rapid cohorts from preserved recent archive frames. It holds the
quality model fixed while comparing pooled and time-control-specific rating
context using public training folds. Settings integration remains pending.

The [public repertoire studies](OPENING_REPERTOIRE.md) test opening recognition
with exact score-message guards and a separately frozen public search-sensitivity
scale. Both quality replay and contextual fitting are independently reproducible.

The [exact-message transport study](SEARCH_EVIDENCE.md) checks stored score/PV
identity separately from final recommendations and adds only missing restricted
played searches in a separate cache. It preserves the fitted coefficients.

The [expanded latent-choice context study](LATENT_CONTEXT_RUN.md) holds prior
bounds fixed and tests chronological heldout move prediction on the expanded
public sample. A widest-grid fit remains an identification limitation.
The [phase-conditioned follow-up](PHASE_CONTEXT_RUN.md) improves joint choice
prediction but not later-choice prediction, and retains the widest latent prior.

Brilliant-move annotation is assessed separately from numerical calibration in
[`BRILLIANT_MOVES.md`](BRILLIANT_MOVES.md). It uses board and existing evaluation
evidence; annotations are excluded from fitted accuracy/rating inputs.

[`SCORING_ROADMAP.md`](SCORING_ROADMAP.md) ranks proposed improvements to search
evidence, category assessment and rating bias, and documents the independent
Superb alternative-evidence gate. It schedules no calibration work.

[`SCORING_EXPERIMENTS.md`](SCORING_EXPERIMENTS.md) turns those proposals into
separate controlled comparisons and records the first bounded history probe and
cached confirmation-policy replay. `scoring-checks.mjs` preserves its plan and
raw outputs under a new ignored run root, with no fitted weights or final tests.

The [remaining-item assessment](reports/scoring-items-2026-10-01.md) records
implemented history and annotation fixes, mixed root-scoring evidence, training-only
rating ablations, and the unmeasured human-label benchmark. Experimental tools
preserve frozen calibration candidates and do not promote temporary fold fits.

The multi-engine recent-data overnight workflow is documented in
[`OVERNIGHT_RUN.md`](OVERNIGHT_RUN.md). It adds a tested bounded-range importer,
exact bundled SF19 support, SQLite raw caches, a deadline supervisor, fixed
development validation and versioned learning-curve/transfer diagnostics.
The commands below retain the original historical smoke workflow.

## Architecture decided before implementation

1. Prepare a versioned calibration artifact for integration into `analysis.js`,
   with explicit accuracy definitions, rating target and strict engine/search
   compatibility. Classification needs a separate provenance review; categories
   must not become experimental features or training labels.
2. Retain the bundled chess rules/PGN parser, engine assets, board, UI, and raw
   UCI infrastructure concept. This pipeline implements its own Node UCI client.
3. Source: Lichess monthly rated standard exports, CC0, documented at
   https://database.lichess.org/. January 2013 (17.8 MB compressed) is an economical
   **historical plumbing sample**, not evidence for modern Lichess rating calibration.
   A later 2,000-game pilot must use recent, multiple-month data. Public game API
   exports are another option only with separately documented use rights.
4. Accuracy measures retained expected result: E = (wins + draws/2)/1000 from
   engine UCI WDL. Loss = max(0, E(best) - E(played)), both from the mover's root.
   Move quality = 100(1-loss). No imported centipawn sigmoid or commercial scale.
   Compare arithmetic loss and RMS loss aggregation as explicitly designed
   candidates; do not claim that a unique objectively correct percentage exists.
   Forced single-legal-move decisions are excluded from aggregation. All other
   opening moves are included: no external book/category labels. A lost mate
   retains E near 1 if still decisively winning; losing the win incurs large loss.
5. Rating: standardized ridge regression on mean/RMS loss, independent major-loss
   frequency (loss >= .2), and engine-top-move frequency. Target is the recorded
   Lichess blitz rating, never an input. Compare against training-mean baseline.
   Small pilot fits are exploratory, never exported as validated calibrations.
6. Append-only JSONL search cache, keyed by engine/search configuration AND full
   start-position move history (FEN alone loses repetition context). Keep raw
   UCI scores, WDL, PV, nodes, depth, and timing; rebuild features cheaply.
   Repair only an incomplete final cache line after interruption; reject other
   corruption. Separate run directories bind datasets and configurations.
7. Start with 24 games, 20,000 nodes per search, 1-2 worker processes, 32 MB Hash
   each. Fixed nodes, single thread, full skill, MultiPV 1, WDL on, no tablebases.
   Clear state before every search so scheduling/resumption cannot change results.
   Measure throughput before any 100-200 game benchmark or 2k expansion. Fixed
   nodes are reproducible but are not equivalent to the extension's depth setting.
8. `import-dataset.mjs`, `engine-host.cjs`, `engine.mjs`, `analyze-games.mjs`,
   `build-features.mjs`, `fit-rating.mjs`, `report.mjs`, `core.mjs`, `io.mjs`, tests.
   Generated files live outside packaged `data/`, under ignored `calibration-runs/`.
9. Preassign train/validation/test splits with a fixed seed, rating-band sampling,
   and globally unique players in the small pilot (at most one game per player).
   Keep both sides of a game together. Reserve final test completely from fitting
   and pilot reports. Later use larger player groups with cross-group games removed
   or connected-component splits; report attrition and rating distribution.
   Test monotonic loss, mate behavior, forced moves, exact build compatibility,
   repetition-aware caching, determinism, parser bounds, resumption, and leakage.
   Reanalyze development games at 4x nodes; quantify noise and score ordering.
10. Only import `lib/chess.js` and the engine. Derive scoring features from raw
    searches; exclude categories and supplied review outputs. Store provenance
    flags, code hashes, dataset hashes, engine hashes/options, seed and Node version.
    Preserve immutable experiment evidence and all unrelated user edits.

## Commands (Node 24 with built-in Zstandard support)

```powershell
node tools/calibration/import-dataset.mjs --out calibration-runs/smoke/dataset --games 24
node tools/calibration/analyze-games.mjs --dataset calibration-runs/smoke/dataset --out calibration-runs/smoke/n20k --nodes 20000 --workers 2
node tools/calibration/build-features.mjs --dataset calibration-runs/smoke/dataset --run calibration-runs/smoke/n20k
node tools/calibration/fit-rating.mjs --run calibration-runs/smoke/n20k
node tools/calibration/report.mjs --dataset calibration-runs/smoke/dataset --run calibration-runs/smoke/n20k
# Repeat analysis with identical arguments to resume using cached positions.
# Development-only stronger probe; never use final test to select formulas:
node tools/calibration/analyze-games.mjs --dataset calibration-runs/smoke/dataset --out calibration-runs/smoke/n80k --nodes 80000 --workers 2 --development-only --games 6
node tools/calibration/build-features.mjs --dataset calibration-runs/smoke/dataset --run calibration-runs/smoke/n80k --allow-partial
node tools/calibration/report.mjs --dataset calibration-runs/smoke/dataset --run calibration-runs/smoke/n20k --compare calibration-runs/smoke/n80k
```

Importer also supports `--input archive.pgn[.zst] --sha256 HASH --source URL`,
`--category blitz|rapid`, `--rating-min`, `--rating-max`, and `--seed`.
The recent-frame importer separately supports `--category bullet|blitz|rapid` and
`--exclude-datasets directory1,directory2` for globally disjoint new cohorts.
Engine overrides require an exact copy of the bundled `.js/.wasm` pair via `--engine path.js`;
native engines remain unsupported; the exact bundled SF19 Lite pair is now
supported with independent network/build metadata and separate development fits.
`--depth N` replaces nodes. Analysis supports `--games` and `--workers` (1-4).

The full archive SHA-256 is verified before sampling. PGN comments, NAGs and
variations are stripped, and only whitelisted game metadata and mainline legal
moves are retained. No supplied engine evaluations or move labels survive import.
The sampler ranks all eligible headers by seeded hash, then accepts legal games
round-robin across average-rating bands with neither player previously selected.
This is not an unbiased population sample; report band counts and selection loss.
It excludes FEN starts, variants, BOT titles, missing ratings/identifiers, self-play,
unfinished games, and games shorter than 20 plies; short games need separate tests.
The current importer loads the historical archive in memory. Before recent monthly
archives or 10k–20k expansion, replace this with streaming PGN import and bounded
per-band reservoirs. The engine cache is resumable now; the large-data importer
is a later scaling task. Snapshots of analysis source are saved per execution;
feature and fitting hashes are recorded separately so formulas can change cheaply.

## Gates before production

The smoke sample cannot establish rating accuracy, population relationships,
confidence intervals, fairness, or modern rating-scale transfer. Its validation
split is very small. WDL reflects this engine's self-play model, not empirical
winning probabilities for every human rating. Report negative search residuals:
a restricted search may value the played move above the unrestricted optimum
at a finite budget. Saturated WDL can hide differences in already-decided games.

Next benchmark 100-200 recent games at a budget supported by stability results,
including worker scaling and CPU/RAM sampling. Then use ~2k stratified recent
games with repeated-player grouping, cluster bootstrap by game/player, held-out
band biases, length/phase/control diagnostics, and enough validation samples to
choose a simple formula. Freeze formulas, coefficients and code BEFORE one final
test evaluation. If results are useful, export a separate versioned JSON with
explicit build/network/search compatibility and predictive uncertainty. Only
then assess deployment compatibility. SF19 transfer and native-engine
compatibility are subsequent experiments. Never select coefficients from
external review scores; never silently load this smoke model in the extension.
