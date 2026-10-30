# Batched preview feasibility

Requested 2026-10-31: investigate how to avoid the long wait before showing an
estimated score. This is an isolated browser prototype, not a production change.

Reuse the six admitted, already exposed D001 training games from the two timing
comparisons: oneIHkm8, aQ903hcx, nhuWmN0z, qQGPXMfq, 6Rl2Exa5, mCGCdRKM
(81–208 half-moves). Selection is fixed before this prototype is timed.

Use SF18 at depth8, Hash16, maximum skill, one fresh Chrome worker per game and
full-history exact best/played searches. Validate each game once, prepare its
immutable exact root histories, and accept only matching prepared commands.
Send ucinewgame once per game, retaining engine state between all root searches.
The engine itself still receives complete original histories. Keep the existing
exact-score parser and restricted-move legality checks. No sampling or skipped
decisions; include preparation, worker startup, searches and scoring in timing.
Exclude only site fetching and UI, as in the existing comparisons.

Repeat each of the six games three times (18 whole-game previews), retaining all
observations and timings. Verify every raw score and replay the complete games
afterward. Report medians and ranges per game, without guaranteeing a universal
latency. This changes the search protocol and therefore produces an experimental
estimate, not calibrated full-review evidence. Compare shallow scores with the
existing cold depth8 results as a descriptive protocol-sensitivity check; use
existing depth16 references only where those were actually collected.

```powershell
node scripts/benchmark-engine-depths.mjs --out web-ext-artifacts/fast-preview --fast-preview
node scripts/summarize-engine-depths.mjs --input web-ext-artifacts/fast-preview --out docs/benchmarks/2026-10-31-fast-preview
```
