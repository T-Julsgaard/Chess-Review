# Current calibration tools

This directory contains the current public calibration, its supporting math,
and offline reproduction. It is included in source packages; the
extension loads only `data/calibration.json` and the runtime scorers in `lib/`.

With **Node.js 24 or later**, run from the repository root:

```sh
node tools/calibration/reproduce-public.mjs
```

No npm dependencies, network, engine run or old research directory is needed.
See [PUBLIC_METHOD.md](PUBLIC_METHOD.md) for the restricted read-only command,
definitions, source records and interpretation limits.

| Files | Why they stay |
| --- | --- |
| `public/` | Frozen release inputs, engine evidence, expected outputs and hash records. |
| `reproduce-public.mjs` | Refits current coefficients and checks archived scores and hashes. |
| `human-policy.mjs`, `grouped-human-choice.mjs` | Fit expected human points and game-weighted legal-move choice. |
| `peer-quality.mjs`, `fullgame-context.mjs` | Fit and assess the recorded-rating contextual model. |
| `sf19-context.mjs` | Reconstruct SF19 contextual peers from fixed-node WDL evidence and compare game-separated CRPS with an unconditional baseline. |
| `fit-rating.mjs`, `fit-huber.mjs`, `core.mjs`, `io.mjs` | Shared mathematics, rating regression and provenance/hash helpers. |
| `engine.mjs`, `engine-host.cjs` | Reusable local engine harness, retained for the real-engine regression test and future evidence collection. Not used by offline replay. |
| `category-benchmark.mjs` | Evaluates supplied independent human annotations, reporting disagreement and abstention. No validated benchmark dataset is bundled. |
| [BRILLIANT_MOVES.md](BRILLIANT_MOVES.md) | Current special-annotation mechanics, sources and limitations. |

Keep one-off investigations and audit reports in ignored `scratch/`. Maintained
research for future accuracy, rating and move-category methods belongs in the
separate [research workspace](../../research/README.md), including unsuccessful
experiments. Keep experimental scripts and candidates there, with bulk runs in
ignored `research/runs/`. This directory retains only tooling and evidence needed
by the active model or a maintained calibration tool; promotion updates its
methodology and reproduction inputs explicitly.
