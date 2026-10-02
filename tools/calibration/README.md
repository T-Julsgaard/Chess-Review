# Current calibration tools

This directory contains the current public calibration, its supporting math,
and a compact development history. It is included in source packages; the
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
| `public/` | Eight frozen input, engine-evidence, expected-output, source and hash records needed for exact replay. |
| `reproduce-public.mjs` | Refits current coefficients and checks archived scores and hashes. |
| `human-policy.mjs`, `grouped-human-choice.mjs` | Fit expected human points and game-weighted legal-move choice. |
| `peer-quality.mjs`, `fullgame-context.mjs` | Fit and assess the recorded-rating contextual model. |
| `fit-rating.mjs`, `fit-huber.mjs`, `core.mjs`, `io.mjs` | Shared mathematics, rating regression and provenance/hash helpers. |
| `engine.mjs`, `engine-host.cjs` | Reusable local engine harness, retained for the real-engine regression test and future evidence collection. Not used by offline replay. |
| `category-benchmark.mjs` | Evaluates supplied independent human annotations, reporting disagreement and abstention. No validated benchmark dataset is bundled. |
| [BRILLIANT_MOVES.md](BRILLIANT_MOVES.md) | Current special-annotation mechanics, sources and limitations. |

Keep new exploratory outputs under ignored `calibration-runs/`. Promote only
the code, evidence and documentation needed by an adopted model or an ongoing,
clearly documented maintenance tool.
