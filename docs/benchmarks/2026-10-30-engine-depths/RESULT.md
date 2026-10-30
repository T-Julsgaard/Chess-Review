# Bundled-engine depth comparison

Collected 31 October 2026 at 00:00 (Europe/Copenhagen). Source revision `caeae03d`.

Measured in real headless Chrome workers on **Intel(R) Core(TM) i7-4790 CPU @ 3.60GHz**. One worker, Hash16, maximum skill, MultiPV1, full mainline history, exact best/played observations at each original root. Times include fresh worker startup, searches and scoring; site fetching, network downloads and review UI are excluded.

**Depth 6 works in both engines. The app currently exposes only depths 8–22.** Stockfish 19 Lite production review scoring uses fixed 20,000-node searches at Hash32, independently of the depth slider. The SF19 depth-based scores below are experimental applications of its display formula, not its production fixed-node review.

Three previously exposed CC0 Lichess training games, selected before measurement:

| Game | Half-moves | White rating | Black rating |
|---|---:|---:|---:|
| [oneIHkm8](https://lichess.org/oneIHkm8) | 88 | 904 | 919 |
| [aQ903hcx](https://lichess.org/aQ903hcx) | 81 | 1751 | 1754 |
| [nhuWmN0z](https://lichess.org/nhuWmN0z) | 82 | 2758 | 2778 |

## Startup-inclusive whole-game timing

Clear hash before every search, matching the main review scoring approach. Depth6/depth8: three repeats per engine/game; depth16: one run per engine/game. The pooled timing range includes differences between games.

| Engine | Depth | Runs | Median seconds | Range seconds | Median startup seconds |
|---|---:|---:|---:|---:|---:|
| Stockfish 18 NNUE | 6 | 9 | 3.07 | 2.56–4.60 | 0.28 |
| Stockfish 18 NNUE | 8 | 9 | 3.55 | 3.01–3.64 | 0.27 |
| Stockfish 18 NNUE | 16 | 3 | 40.37 | 33.88–58.13 | 0.29 |
| Stockfish 19 Lite | 6 | 9 | 2.89 | 2.58–3.46 | 0.17 |
| Stockfish 19 Lite | 8 | 9 | 3.56 | 3.08–4.09 | 0.18 |
| Stockfish 19 Lite | 16 | 3 | 58.85 | 51.59–75.70 | 0.17 |

Depth8 median by game (three repeats):

| Game | SF18 seconds | SF19 Lite seconds |
|---|---:|---:|
| oneIHkm8 | 3.60 | 3.58 |
| aQ903hcx | 3.55 | 3.71 |
| nhuWmN0z | 3.20 | 3.30 |

## Accuracy versus each engine’s depth16 reference

Scores are percentages. Deltas are percentage points: shallow score minus depth16. Shallow repeats use their median score. The two engines have different display formulas; compare each engine with itself across depths.

### Stockfish 18 NNUE

| Game / side | Depth16 | Depth8 | Depth6 | Δ8 | Δ6 |
|---|---:|---:|---:|---:|---:|
| oneIHkm8 / White | 47.5 | 51.3 | 55.5 | +3.8 | +8.0 |
| oneIHkm8 / Black | 57.1 | 58.4 | 57.2 | +1.3 | +0.1 |
| aQ903hcx / White | 75.1 | 72.2 | 73.7 | -2.8 | -1.4 |
| aQ903hcx / Black | 72.4 | 67.5 | 68.8 | -4.9 | -3.6 |
| nhuWmN0z / White | 88.7 | 89.7 | 85.8 | +1.1 | -2.9 |
| nhuWmN0z / Black | 96.2 | 94.5 | 92.1 | -1.7 | -4.1 |

### Stockfish 19 Lite

| Game / side | Depth16 | Depth8 | Depth6 | Δ8 | Δ6 |
|---|---:|---:|---:|---:|---:|
| oneIHkm8 / White | 73.7 | 71.8 | 75.3 | -1.9 | +1.6 |
| oneIHkm8 / Black | 76.0 | 71.4 | 70.9 | -4.6 | -5.1 |
| aQ903hcx / White | 92.4 | 91.7 | 89.6 | -0.7 | -2.8 |
| aQ903hcx / Black | 86.7 | 84.7 | 85.1 | -2.0 | -1.6 |
| nhuWmN0z / White | 94.5 | 94.2 | 92.7 | -0.4 | -1.8 |
| nhuWmN0z / Black | 98.9 | 96.6 | 93.7 | -2.3 | -5.2 |

| Engine | Shallow depth | Mean absolute difference | Largest absolute difference |
|---|---:|---:|---:|
| Stockfish 18 NNUE | 6 | 3.4 points | 8.0 points |
| Stockfish 18 NNUE | 8 | 2.6 points | 4.9 points |
| Stockfish 19 Lite | 6 | 3.0 points | 5.2 points |
| Stockfish 19 Lite | 8 | 2.0 points | 4.6 points |

## Separate depth8 reset-overhead comparison

The plan intended this as a retained-cache variant, and raw keys retain that historical name. Inspection after collection found that the production wrapper still sends `ucinewgame` before every search; Stockfish clears its search state for that command. Therefore these runs remove the additional explicit `Clear Hash` command, but **do not retain the search cache**. The source protocol is visible in [engine/uci.js](../../../engine/uci.js); upstream confirms the [ucinewgame handler](https://github.com/nmrugg/stockfish.js/blob/v18.0.0/src/uci.cpp) and [search_clear implementation](https://github.com/nmrugg/stockfish.js/blob/v19.0.0/src/engine.cpp). Maximum score difference from the corresponding double-reset runs: 0.0000000000 points.

| Engine | Runs | Median seconds | Range seconds |
|---|---:|---:|---:|
| Stockfish 18 NNUE | 9 | 2.56 | 2.32–2.90 |
| Stockfish 19 Lite | 9 | 2.73 | 2.43–3.13 |

Single-reset depth8 accuracy differences from that engine’s depth16 reference:

| Engine | Mean absolute difference | Largest absolute difference |
|---|---:|---:|
| Stockfish 18 NNUE | 2.6 points | 4.9 points |
| Stockfish 19 Lite | 2.0 points | 4.6 points |

## Evidence and limits

All 60 complete-game runs (5020 analysed half-moves) passed independent legal replay and score re-aggregation. Maximum accuracy range across identical shallow repeats: 0.0000000000 points.

The sample contains only three games on one older desktop. A fresh worker is used per run within the same browser process; browser startup is excluded, and browser/WASM caches may be warm. Depth16 is a deeper reference, not ground truth. Results do not establish performance on slower devices or all tactical positions. The supplementary comparison is a reset-overhead test, not a validated fast-preview implementation. Earlier subsecond feasibility timings used a lighter command loop without the current wrapper’s repeated history validation and reset protocol. No production engine, depth slider, scoring formula or calibration has been changed.

Reproduce collection with `node scripts/benchmark-engine-depths.mjs --out NEW_DIRECTORY`; summarise with `node scripts/summarize-engine-depths.mjs --input NEW_DIRECTORY --out REPORT_DIRECTORY`. The published SF18 coefficients are reconstructed from guarded frozen public evidence; no new tuning choices are made.

See [plan](PLAN.md), [input manifest and eligibility receipt](input-manifest.json), [all run timings](runs.json), [summary](summary.json), and [compressed raw observations](observations.json.gz). The raw package retains every repeated run.
