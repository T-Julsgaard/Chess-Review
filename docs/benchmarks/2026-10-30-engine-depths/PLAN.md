# Browser engine depth comparison

Technical benchmark requested on 2026-10-30. No production settings or models
are changed. This is a small exploratory comparison, not new calibration or
confirmation research.

Use the same three previously exposed D001 training games as the initial quick
preview feasibility check: oneIHkm8, aQ903hcx, nhuWmN0z. Admit their frozen CC0
inputs through the existing data guard and retain its receipt. They have 81–88
half-moves and span low, middle and high recorded rating bands. Selection is
fixed before this comparison; do not replace an inconvenient result.

Run the exact bundled SF18 NNUE and SF19 Lite WASM builds in isolated headless
Chrome workers. Use one worker at a time, full mainline histories, Hash16,
maximum skill, MultiPV1, and exact best/played scores searched at the same root.
Force actual depths 6, 8 and 16; SF19's normal fixed-20000-node scoring must not
be presented as a depth-based measurement. Use each engine's existing display
formula to calculate accuracy, excluding forced decisions. SF19 depth-based
scores are experimental and do not replace its production scoring protocol.

Main configuration: clear hash before each search, as the scoring pipeline does.
Repeat whole-game depth6/depth8 runs three times; collect depth16 once per
engine/game as the comparison reference. Also repeat depth8 three times with
retained hash, separately labelled as a potential preview configuration.
Alternate engine order between repeats. Keep startup and search timings
separate and report startup-inclusive totals. No site fetch, UI, network
download, rating fitting or additional candidate work is timed.

First run an eight-half-move depth16 pilot with both engines to validate the
harness and estimate cost. Full runs contain 60 whole-game analyses. Record
source revision, input hashes, hardware/browser, game identities, settings,
raw scores, completeness and progress. Fail visibly on missing/invalid evidence.
Use a new output directory for every invocation; never overwrite retained runs.

Compare per-player depth6/depth8 accuracy to that engine's depth16 result, in
percentage points; show signed differences, average absolute differences, and
the largest observed difference. Use median times and ranges for repeated
timings. Depth16 is a deeper reference, not ground truth. Differences between
engines' numerical scores also reflect different formulas; do not interpret
them directly as one engine judging a player more correctly.

The settings slider currently offers depths 8–22. UCI and the engine wrapper
accept depth6; benchmark it directly without changing the user-facing slider.

Run:

```powershell
node scripts/benchmark-engine-depths.mjs --out web-ext-artifacts/depth-pilot --pilot
node scripts/benchmark-engine-depths.mjs --out web-ext-artifacts/depth-comparison
```

Pilot completed before the full comparison: on an i7-4790, eight half-moves at
depth16 took 6.01 seconds with SF18 and 9.69 seconds with SF19 Lite, including
startup. No missing evidence or score errors occurred. The full collection is
expected to take roughly 10–15 minutes; actual deep-position costs may differ.
Pilot evidence: `web-ext-artifacts/depth-pilot-20261030-2/`. Earlier setup checks
identified an unregistered deployed-model input and a mixed-case filename
validation error; the successful pilot reconstructs the published coefficients
from admitted frozen evidence and preserves mixed-case game IDs.
