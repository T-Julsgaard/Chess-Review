# B000: starting extension baseline

Inventory date: 2026-10-05. This is an implementation inventory, not a new
validation result. Preserve this reference when later baselines are introduced.

- Source revision: `becc0629688ef8814c247f94fa449dc3e4247faf`.
- Extension version: `0.3.0`; calibration version: `2026-10-02`.
- Authoritative definitions and numerical results:
  [PUBLIC_METHOD.md](../tools/calibration/PUBLIC_METHOD.md).
- Frozen input hashes and recipes:
  [public/manifest.json](../tools/calibration/public/manifest.json),
  [sources.json](../tools/calibration/public/sources.json).
- Model: [`data/calibration.json`](../data/calibration.json).
- Annotation policy: [BRILLIANT_MOVES.md](../tools/calibration/BRILLIANT_MOVES.md),
  `analysis.js`, `move-grades.js`, and their classification tests.

Refer to these files at the pinned Git revision for baseline comparisons; live
links may change after promotion. Record each engine/mode separately, including
search settings. Do not pool metrics from different target or quality scales.

| Surface | Current method | Research question / evidence limit |
| --- | --- | --- |
| SF18 accuracy | Fitted human-outcome logistic curve and legal-choice temperature; arithmetic mean of exponential qualities over nonforced decisions; depth16 evidence | Outcome/choice prediction does not uniquely validate a displayed accuracy percentage. Development cohort is small and consumed. |
| SF19 accuracy | Public centipawn curve and exponential transform; combined ordinary/harmonic means of nonforced qualities | Display estimate is not a fitted SF19 accuracy calibration. Investigate its construct and aggregation independently. |
| Moves-only rating | Separate SF18/SF19 Huber/ridge regressions against recorded public blitz ratings; 20,000-node WDL features; at least ten decisions | Predicts archive rating level, with unvalidated cross-platform transfer; a single game does not establish stable playing strength. |
| Recorded-rating mode | Engine-specific peer-quality percentile converted to a rating adjustment; recorded-rating and moves-only fallbacks | CRPS assesses the quality distribution. It does not establish correctness of the final rating adjustment or true strength. |
| Ordinary categories | Expected-point loss cutoffs 2/5/10/20 percentage points plus context rules | Cutoffs are declared policy, not independently fitted human labels. Our research may define better policy. |
| Special categories | Explicit material, alternatives and board/history gates | Board heuristics do not establish perceived difficulty or instructional value. No validated independent benchmark is bundled. |

Existing June-August 2026 archive evidence can support smoke checks, exploratory
comparisons and reproduction. Its validation observations and training folds
have been consumed in development. Any new dataset record must list that prior
use and check identities against it before claiming a fresh confirmation set.

## Reproduction before comparisons

From the repository root with Node.js 24 or later:

```sh
node tools/calibration/reproduce-public.mjs
```

This offline replay verifies archived observations, fits and outputs. It does
not rerun the engine or independently validate the method. Store the command,
environment and output hash in the first experiment's evidence record. Use a
separate checkout of the pinned revision if the active baseline has changed.

Reuse `tools/calibration/engine.mjs`, `core.mjs`, fitting modules and
`category-benchmark.mjs` where compatible. The category evaluator expects
independent human-review provenance and exposes disagreement/abstention; its
acceptance gate alone cannot replace a preregistered rubric or reviewer audit.
