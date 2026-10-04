# Navigation during analysis — 2026-10-04

The reported lag is fixable in part without reducing analysis quality. Profiling
found repeated display work on the main UI thread, in addition to engine CPU
load and full-game classification. Two rendering optimizations are included in
the current 0.2.1 source and rebuilt packages.

## Assessment and tradeoffs

| Option | Benefit | Cost or risk | Decision |
| --- | --- | --- | --- |
| Keep unchanged piece images mounted | Less DOM/image work; progress updates no longer interrupt a piece's animation | Must replace images when the piece or selected set changes | Implemented and regression-tested |
| Cache readable engine lines by full FEN and displayed UCI moves | Avoid repeated chess move generation and SAN formatting | Small bounded memory use; keys must include move counters and side to move | Implemented with a 128-entry limit and copied results |
| Use fewer engine workers | Free CPU for navigation | Longer analysis; resource-dependent benefit | Keep existing user preference |
| Refresh analysis progress less often | Less frequent UI work | Progress, scores, and lines arrive later | Keep current frequency |
| Move classification/scoring into a worker | Reduce occasional expensive UI-thread calculations | Larger asynchronous refactor, state coordination and stale-result risks | Defer |

The retained images still update for captures, promotions, en passant, castling,
backward navigation, board flips, and piece-set changes. Drag cleanup restores
the original image's visibility. The formatting cache has no engine or scoring
state and returns independent arrays so callers cannot mutate its contents.

## Timing comparison

An isolated headless Chrome profile analyzed the same 92-ply public calibration
game with four workers and depth 16. Navigation advanced through up to the first
15 available plies, returning to the start, every 100 ms during analysis. Both
repeat runs completed all 92 plies without an analysis error. Function timings
include startup; a 20 ms timer sampled event-loop lateness during navigation.
No test suites or packaging commands ran alongside these repeat measurements.

| UI work | Before median / p95 | After median / p95 |
| --- | --- | --- |
| Move navigation (`go`) | 13.5 / 19.3 ms | 9.5 / 15.3 ms |
| Progress refresh (`flushProgress`) | 15.9 / 25.6 ms | 8.5 / 14.9 ms |
| Board repaint | 3.2 / 4.8 ms | 1.0 / 1.9 ms |
| Engine-line panel | 3.3 / 8.1 ms | 1.1 / 2.7 ms |
| Event-loop lateness | 0.1 / 17.4 ms | 0.0 / 12.7 ms |

The representative navigation median improved by about 30%; progress refresh
by about 47%. An earlier pair also improved, with other checks running alongside
the candidate. These measurements establish a benefit for this fixture and
machine, not a frame-rate guarantee across devices or game lengths. Occasional
classification work still exceeded 100 ms at startup, and engine CPU saturation
can still cause pauses. Search depth, worker defaults, engine algorithms, scores,
and refresh frequency are unchanged.

Local diagnostic output: `scratch/performance-4D8t8f/results.json` (baseline)
and `scratch/performance-AAVnGD/results.json` (optimized). These disposable
profiling files are ignored by Git and excluded from extension packages.

## Verification

- Full automated suite: 254 tests, all passed, including the new rendering and
  cache regressions and existing navigation, sound, badge and practice checks.
- Source verification and Chrome/Firefox package build passed.
- Packaged Chrome and Firefox browser smoke checks passed with both NNUE18 and
  SF19 Lite: complete reviews, rating modes, reload, and nine responsive sizes.
- Final clean packages are compared against the tested packages by shipped file
  hashes. The package version remains 0.2.1.

The broader installation, update and aspect-ratio audit is recorded in
[RELEASE_AUDIT.md](RELEASE_AUDIT.md).
