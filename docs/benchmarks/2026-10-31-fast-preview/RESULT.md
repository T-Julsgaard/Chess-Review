# Batched fast-preview prototype

Real Chrome workers on **Intel(R) Core(TM) i7-4790 CPU @ 3.60GHz**, using SF18 at depth8, Hash16, maximum skill, one worker. Three fresh-worker runs per completed game. Include complete-game validation/preparation, worker startup, searches and scoring; exclude site fetching and UI. Every move is analysed with full history and exact original-root best/played observations.

The isolated prototype validates the mainline once, admits only its matching immutable root histories, and sends ucinewgame once per game. It retains search state between positions. The production scorer and website buttons are unchanged.

| Game | Full moves | Previous depth8 median | Preview median | Preview range | Speedup |
|---|---:|---:|---:|---:|---:|
| [oneIHkm8](https://lichess.org/oneIHkm8) | 44 | 3.60 s | 1.19 s | 1.12–1.21 s | 3.0× |
| [aQ903hcx](https://lichess.org/aQ903hcx) | 40.5 | 3.55 s | 1.06 s | 0.99–1.07 s | 3.3× |
| [nhuWmN0z](https://lichess.org/nhuWmN0z) | 41 | 3.20 s | 1.04 s | 0.87–1.14 s | 3.1× |
| [qQGPXMfq](https://lichess.org/qQGPXMfq) | 61 | 6.22 s | 1.49 s | 1.26–1.65 s | 4.2× |
| [6Rl2Exa5](https://lichess.org/6Rl2Exa5) | 80 | 7.91 s | 1.58 s | 1.45–1.72 s | 5.0× |
| [mCGCdRKM](https://lichess.org/mCGCdRKM) | 104 | 11.30 s | 1.71 s | 1.63–1.79 s | 6.6× |

All 18 whole-game previews (2223 half-moves) passed independent legal replay and score re-aggregation. Preparation tests also reject mismatched histories and malformed/illegal moves, and verify that exact-score checks remain enabled with only one game reset.

Retaining state changes search results, so this remains an **estimated accuracy preview**, not calibrated full-review evidence. Across 12 player-sides, the mean absolute difference from the ordinary cold depth8 score was **1.15 points**, maximum **2.97**. On the three short games with existing depth16 references (six player-sides), the mean difference from cold depth16 was **2.66 points**, maximum **7.91**. No new depth16 references were collected for the long games.

| Game / side | Preview accuracy | Ordinary depth8 | Difference | Depth16 reference |
|---|---:|---:|---:|---:|
| oneIHkm8 / w | 51.4 | 51.3 | +0.1 | 47.5 |
| oneIHkm8 / b | 56.9 | 58.4 | -1.5 | 57.1 |
| aQ903hcx / w | 74.6 | 72.2 | +2.4 | 75.1 |
| aQ903hcx / b | 64.5 | 67.5 | -3.0 | 72.4 |
| nhuWmN0z / w | 88.7 | 89.7 | -1.0 | 88.7 |
| nhuWmN0z / b | 92.8 | 94.5 | -1.7 | 96.2 |
| qQGPXMfq / w | 80.5 | 81.2 | -0.8 | Not collected |
| qQGPXMfq / b | 83.4 | 83.8 | -0.4 | Not collected |
| 6Rl2Exa5 / w | 76.0 | 76.7 | -0.7 | Not collected |
| 6Rl2Exa5 / b | 80.1 | 81.9 | -1.8 | Not collected |
| mCGCdRKM / w | 92.7 | 92.7 | +0.0 | Not collected |
| mCGCdRKM / b | 93.6 | 93.2 | +0.3 | Not collected |

This is six fixed previously exposed games on one older desktop, not a universal latency guarantee or new accuracy calibration. Browser/WASM caches may be warm; background load and fetching the finished game can add time. The prototype demonstrates a feasible separate preview path. A production feature still needs post-game triggering, score-cache messaging, cancellation/deadline handling and the compact button UI. Full-review calibration and stored exact-review evidence must remain separate.

Collection: `node scripts/benchmark-engine-depths.mjs --out NEW_DIRECTORY --fast-preview`. Verification/report: `node scripts/summarize-engine-depths.mjs --input NEW_DIRECTORY --out REPORT_DIRECTORY`. Source revision: `a57d076a75117704b24137c50680ebf4cb49028c`.

See [plan](PLAN.md), [manifest](input-manifest.json), [run timings](runs.json), [summary](summary.json) and [all raw observations](observations.json.gz). Baseline measurements come from the two earlier depth/long-game reports.
