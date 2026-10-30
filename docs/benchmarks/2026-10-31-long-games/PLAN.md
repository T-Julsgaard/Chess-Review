# Stockfish 18 timing on longer games

Requested 2026-10-31: compare depth6/depth8 when a game exceeds 60 full moves.
Extend the existing browser benchmark without changing production behavior.

Select the first admitted D001 training games with exactly 122, 160 and 208
half-moves, corresponding to 61, 80 and 104 full moves. The fixed cases are
qQGPXMfq, 6Rl2Exa5 and mCGCdRKM. Only length and training role select these
examples; do not replace them based on their timing or score.

Use the same bundled SF18 NNUE, Chrome worker, Hash16, maximum skill, MultiPV1,
complete histories, and exact original-root best/played searches as the previous
comparison. Keep its production reset protocol, including both ucinewgame and
explicit Clear Hash. One fresh worker per game/run, one active worker at a time.
Include startup, validation, searches and scoring; exclude site fetching and UI.
Repeat each game at each depth three times (18 whole-game analyses), alternating
depth order between repeats. Retain the guarded data receipt, source hashes,
hardware/browser, every observation and timings. Compare per-game medians,
ranges, seconds saved and percentage reduction. Position complexity differs
between examples, so this is not a controlled estimate of time per extra move.

The existing successful real-engine runs establish harness feasibility. Expect
roughly 2–4 minutes of additional collection on this older desktop. Independently
replay all completed games and recalculate scores before reporting timings.
Use a new output directory; preserve all existing measurements.

```powershell
node scripts/benchmark-engine-depths.mjs --out web-ext-artifacts/long-game-comparison --long-games
node scripts/summarize-engine-depths.mjs --input web-ext-artifacts/long-game-comparison --out docs/benchmarks/2026-10-31-long-games
```
