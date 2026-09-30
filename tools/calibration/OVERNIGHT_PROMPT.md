# Overnight independent calibration — ready-to-use prompt

Work in `C:\Users\thoma\Documents\Git\Chess-Review`, repository
`T-Julsgaard/Chess-Review`. Continue the independent calibration research described
below. I authorize you to implement and run the experiments locally, create an
hourly heartbeat on this chat, and use its wakeups to assess results and choose
the next useful experiment. Do not push or publish anything.

**Hard stop: 09:00 Europe/Copenhagen on 1 October 2026
(`2026-10-01T09:00:00+02:00`).** Stop starting expensive work early enough to
finish fitting, verification, and the morning report by that time. If I reuse
this prompt on another date, use the next morning at 09:00 Copenhagen time and
record the resolved deadline before launching anything.

## Outcome I want by morning

Produce a complete, reviewable experimental calibration package, not just a
large collection of engine evaluations or one fitted number. Cover:

1. Independently defined move quality and game accuracy for bundled SF18 Lite.
2. A separate move-quality-to-rating model on the recorded **Lichess blitz**
   scale, with validation and uncertainty diagnostics.
3. A compatibility/transfer assessment for the exact bundled SF19 Lite, with
   its own accuracy/rating results and metadata. Fit separate parameters where
   development results justify it; do not silently copy SF18 parameters.
4. Search-budget stability, dataset-size learning curves, runtime measurements,
   and a concrete recommendation for the next calibration run.

Complete a smaller coherent development package for each engine before
spending the whole night scaling one engine to thousands of games. If compute
cannot support credible results for a component, preserve the completed work
and label that component inconclusive, with sample counts and the reason.
Never invent validation or call an underpowered smoke fit production-ready.

## Current repository state

Read `tools/calibration/README.md` and
`tools/calibration/reports/pilot-2026-09-30.md` first, then inspect the scripts,
tests, Git status, and applicable instructions. Preserve unrelated user edits.

The first pilot ran 24 January-2013 CC0 Lichess blitz games, with disjoint
players. It used the exact bundled SF18 Lite under Node, 20k nodes, WDL,
MultiPV 1, one thread per engine, and two workers. It completed in 115 seconds.
A six-game 80k-node probe changed RMS accuracy by 1.44 points on average,
maximum 3.40, score correlation 0.947. The exploratory rating MAE was 234
versus 315 for the constant baseline, but validation contained only four
games. These numbers are plumbing evidence, not modern calibration evidence.
The final test has not been used to choose formulas or fit models.

The machine previously identified itself as an i7-4790 with eight logical
CPUs and 16 GB RAM, with roughly 2.5 GB free. Verify current resources;
do not assume the brother's 9950X3D is available. Use consumer-PC-safe worker
counts and measure actual throughput. The current engine adapter accepts
only exact SF18 hashes, so SF19 support requires an explicit validated adapter
extension. The original importer loads archives in memory; that is unsuitable
for recent multi-gigabyte monthly exports.

There may be an **uncommitted, untested, unexecuted**
`tools/calibration/recent-dataset.mjs` draft from preparation for this task.
Inspect and test it before using it. It proposes bounded complete compressed
frames spread across recent months, focal-player rating strata, and globally
unique players. It is not a completed or benchmarked importer. No overnight
run or hourly heartbeat was started by the preparation chat.

## Independence and data provenance

Do not use `data/calibration.json`, the old scoring helpers, existing accuracy
or rating anchors, commercial review outputs, move labels, or previously
scraped review data as targets, features, coefficients, objectives, or fitting
references. Do not try to reproduce Chess.com scores. Do not inspect old-score
comparisons during this run. Preserve historical files and Git history.

Use documented permitted chess data, preferably recent Lichess monthly rated
standard exports under CC0: https://database.lichess.org/. Restrict this first
serious experiment to human rated blitz games. Exclude bots, variants, invalid
mainlines, self-play, missing identities/ratings, and unfinished games.
Document provisional-rating exclusions if reliable markers exist.
Discard source comments, supplied evaluations, classifications, and NAGs.

Sample from multiple recent months and temporal windows where practical.
Record exact source URLs, retrieval dates, selection method, exclusions,
software versions, random seeds, and content hashes. For bounded archive
windows, record HTTP byte ranges and hashes and explicitly state that the
full archive's published checksum was **not** verified. Do not label range
samples population-representative or pretend they span all games in a month.
Use bounded-memory import; avoid downloading entire 30 GB archives needlessly.

Target player-rating strata 600–999, 1000–1399, 1400–1799, 1800–2199, and 2200+.
Stratify by a specified player's rating, not merely the average of both ratings.
If both sides contribute, report actual player-side counts by band as well as
game quotas, and account for within-game dependence. Report selection attrition.

## Sample-size assessment and leakage prevention

Treat 2k games as a serious pilot and 10k–15k as a plausible eventual target,
not proof that a good model is guaranteed. The quoted MAE learning-curve table
was hypothetical; do not report it as observed evidence. At 10k games,
20k player performances are not 20k independent observations. More games
cannot remove the intrinsic noise of a single-game rating estimate.

Preassign player-disjoint training, validation, and final-test splits, aiming
for 70/15/15 within strata. Keep both sides of every game together. Global
unique-player sampling is acceptable for the first pilot; otherwise use
explicit player-group allocation and reject cross-split games, or a suitable
component method. Verify player and game disjointness automatically.

Use a **fixed validation set** for learning curves and choices about formulas,
sample sizes, search budgets, features, and regularization. Keep the final
test reserved. Do not repeatedly evaluate the "same untouched test set" while
deciding when to stop; that turns it into validation data.

Analyze validation early so hourly reports are meaningful, but make training
prefixes balanced across rating bands. Compare nested training-game subsets
such as 100, 250, 500, 1k, 2k, 5k, and 10k as available, including repeated
seeded subsets where cheap. Report game counts separately from player-side
counts. Assess paired changes on the same validation games with game/player
cluster bootstrap intervals and band biases. Stabilizing coefficients alone
is not sufficient evidence to stop.

Freeze formulas, inputs, coefficients, compatibility metadata and code before
one final test assessment. Evaluate it only if there is enough evidence and
time. An honest development report with the final test still reserved is
preferable to rushing a weak model into a supposedly final evaluation.

## Engine and scoring methodology

Use the exact bundled engine assets under Node first. Record build and loader
hashes, exact NNUE identity, budget, actual depth/nodes, MultiPV, Threads, Hash,
Skill, WDL options, tablebase settings, and evaluation perspective. Use fixed
nodes and deterministic state reset; changing workers must not change scores.
Do not replace the engine with a native binary without validating network/build
semantics on representative positions. Do not claim a higher version is stronger.

Start from expected result `E = P(win) + 0.5*P(draw)` using engine WDL.
Evaluate the unrestricted best move and the played move from the same root
position, using full move history for repetition. Record restricted-search
inconsistency and negative residuals instead of hiding search noise.

Accuracy's percentage scale is a transparent design choice, not a dataset
ground truth. Compare simple understandable aggregation candidates, including
arithmetic and RMS loss, without using actual ratings to directly alter an
individual game's accuracy. Check decisive-position saturation, one catastrophic
blunder, many small errors, forced moves, mate retained/delayed/missed, short
games, openings, long endgames, and length/phase/difficulty dependence. Missing
mate while retaining an overwhelming win differs from missing mate and allowing
a draw or loss. Keep categories and book labels out of training.

Fit the rating model separately against permitted recorded player ratings.
Never feed the player's actual rating into the primary model. Compare a simple
regularized model to a training-mean baseline and other cheap justified variants.
Describe the output as the **Lichess blitz rating level these moves resemble**,
not true single-game performance, FIDE Elo, or an official rating.

Report MAE, RMSE, median absolute error, correlation, predicted distribution,
calibration/bias by player rating band and game length, and uncertainty. Use
game/player clustering, not independent-move bootstrap. Separate exploratory
validation residual intervals from independently tested predictive coverage.
Report sparse groups and distribution shrinkage rather than concealing them.

## Overnight execution and hourly decisions

Build a durable local supervisor with a hard deadline, resumable evaluation
storage, logs, progress/ETA, bounded memory, and graceful stop/failure handling.
Do not rely on this chat remaining in one uninterrupted turn. Prefer SQLite
or sharded JSONL if the current whole-cache-in-memory design will exceed RAM.
Keep expensive engine evaluation separate from cheap feature building and fits.
Changing formulas must reuse existing compatible raw evaluations.

Benchmark representative recent development games first. Compare worker counts
and at least 20k/80k nodes; use stronger probes such as 320k when affordable.
Do not extrapolate from the short historical games alone. Allocate time across
both engines and both scoring tasks based on measured cost. Reserve at least
30 minutes for final fitting, checks, and reporting. Save useful interim
reports after batches instead of waiting for all planned games to finish.

Create an hourly heartbeat attached to **this chat**, active only during this
run. Its prompt must inspect the supervisor status, completed evaluations,
latest validation/learning curves, search-stability results, remaining time,
CPU/RAM and failures. It must make a documented decision each wakeup:

- Finish missing essential accuracy/rating/engine coverage first.
- If search instability dominates, prioritize deeper representative probes.
- If validation improves materially with more games and time permits, expand
  balanced training data using the existing fixed validation set.
- If average error plateaus but band bias is poor, investigate sampling or
  simple model/feature improvements instead of blindly increasing game count.
- If transfer is inadequate, fit and validate an explicit engine-specific model.
- If no useful improvement is likely before the deadline, freeze the best
  adequately supported development artifacts and prepare the report.

Write the decision and supporting numbers to a timestamped decision log.
Avoid duplicate processes and overlapping runs; check existing state first.
Keep notifications quiet while progress is routine, and notify only for a
meaningful result, failure, completion, or required user action. Do not disable
the useful local supervisor merely because this chat turn ends. At 09:00,
stop calibration compute, write the final report, and disable the heartbeat.
Do not change system power settings or silently rely on a sleeping machine
continuing to compute; identify any execution prerequisite clearly.

## Reusable calibration lifecycle

Keep immutable dataset manifests, exact split assignments, reusable raw
evaluations, versioned feature schemas and objective definitions, fitting
source snapshots/hashes, and experiment records. Each run should support
resumption and independently reproducing its artifact from recorded inputs.
Store each candidate/model under a new version; preserve previous artifacts.
Mark statuses such as experimental, frozen, tested, or accepted explicitly.
Enforce engine/network/search compatibility in the calibration loader.
Do not switch production Chess Review during this overnight research task.

For future improvement, provide commands to import additional permitted games,
extend compatible evaluation caches, refit cheap statistical candidates,
produce learning curves, and compare candidate predictions on development data.
Maintain a history of performance and bias, and explicit promotion criteria.
After a final holdout has been examined, it cannot remain an "untouched"
holdout for later formula revisions; use newly reserved games/time windows for
independent future testing. Keep research diagnostics distinct from production
models and from comparisons with historical proprietary-reference scores.

## Verification, commits, and final deliverables

Run meaningful tests for import provenance, legal PGNs, player/game leakage,
rating-target exclusion, mate/forced-move behavior, deterministic evaluations,
metadata compatibility, cache resumption/corruption, supervisor deadline,
partial-run reporting, and exclusion of final test from adaptive decisions.
Run the relevant repository checks. Automatically make separate local commits
for coherent completed changes, staging only this task's files. Never push.

Before ending the initial setup turn, verify the background supervisor and
hourly heartbeat are actually running and report their identifiers, configured
deadline, current plan, and paths to live status/logs. Do not merely promise to
work later. If setup fails, preserve useful work and explain the concrete blocker.

By morning provide a readable Markdown report and machine-readable results:
dataset/source/split counts, actual completed games/decisions per engine and
budget, each accuracy/rating candidate and its status, validation learning
curves and clustered intervals, search stability, rating-band/length biases,
compute/resources, hourly decisions, final-test status, reproducibility
commands, remaining uncertainties, and the next most useful experiment.
Include local commit hashes/messages. Lead with what we can now conclude,
what we cannot, and which result is the strongest candidate for further work.
