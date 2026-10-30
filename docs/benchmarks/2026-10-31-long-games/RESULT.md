# Stockfish 18 on longer games

Measured on 31 October 2026 with **Intel(R) Core(TM) i7-4790 CPU @ 3.60GHz** in real Chrome workers, using the same configuration as the earlier comparison: one worker, Hash16, maximum skill, MultiPV1, full mainline histories, and exact best/played searches at each original root. Times include worker startup, validation, search and scoring, excluding site fetching and UI. Each game/depth has three independent fresh-worker runs.

A full move means one White move plus one Black move. These examples contain 122, 160 and 208 half-moves.

| Completed game | Full moves | Depth6 median (range), seconds | Depth8 median (range), seconds | Depth6 saves |
|---|---:|---:|---:|---:|
| [qQGPXMfq](https://lichess.org/qQGPXMfq) | 61 | 5.61 (5.36–5.82) | 6.22 (5.60–6.74) | 0.61 s / 9.9% |
| [6Rl2Exa5](https://lichess.org/6Rl2Exa5) | 80 | 7.77 (6.90–9.18) | 7.91 (7.41–9.81) | 0.13 s / 1.7% |
| [mCGCdRKM](https://lichess.org/mCGCdRKM) | 104 | 8.93 (8.86–16.43) | 11.30 (9.56–17.15) | 2.37 s / 21.0% |

All 18 complete-game analyses (2940 half-moves) passed independent legal replay and score re-aggregation. No incomplete runs were substituted or dropped.

These are three measured examples, not a worst-case bound or an estimate of cost per additional move. Different position complexity, legal choices and browser/machine load also affect time. The wrapper replays root histories and resets the engine for each search, so a universal linear estimate is inappropriate. Fresh workers run in the same browser process, and browser/WASM caches may be warm. Production behavior has not been changed.

Collection: `node scripts/benchmark-engine-depths.mjs --out NEW_DIRECTORY --long-games`. Report/replay: `node scripts/summarize-engine-depths.mjs --input NEW_DIRECTORY --out REPORT_DIRECTORY`. Source revision: `93ab66336bf1c280e6234201211490f453aa19a5`.

See [plan](PLAN.md), [input manifest and eligibility receipt](input-manifest.json), [all run timings](runs.json), [summary](summary.json), and [compressed raw observations](observations.json.gz).
