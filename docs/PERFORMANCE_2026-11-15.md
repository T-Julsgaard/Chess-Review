# Invisible efficiency pass — 2026-11-15

Follow-up to [the 2026-10-25 implementation](PERFORMANCE_IMPLEMENTATION.md). The bar
for this pass was stricter: no change to what the user sees, and nothing that could
misbehave on an unusual machine. Search depth, scoring, engine choices, worker
defaults, animation options and all displayed content are unchanged.

## Implemented

| Area | Change | Why |
| --- | --- | --- |
| Analysis progress (`analysis.js`, `requestProgress`) | A hidden review tab no longer redraws while the engines run. Progress is remembered and drawn once when the tab becomes visible. Completion still renders directly. | Seven redraws a second in a tab nobody can see. |
| Analysis progress (`progressDelay`) | The ~140 ms refresh interval grows only when a refresh measured more expensive than the interval itself (twice its cost, capped at one second). | On a slow PC the refresh could take longer than the interval, starving input and the engine message loop. Normal machines keep the same cadence. |
| Review button preview (`button-preview-content.js`) | The once-per-second poll becomes a 10 s safety net. Refreshes are driven by the site adapters' re-checks, navigation and visibility events, which already covered the real triggers. | A timer woke on every chess.com and lichess page for as long as it was open, including during live games. |
| Preview service (`lib/button-preview-service.js`) | Local accuracy estimates are remembered in `buttonPreviewCache:v1` (50 entries; game id, PGN, summary), validated by version and exact PGN. | The in-memory cache died with the background worker, so revisiting a finished game page reran a six-second engine pass. |
| Chess.com adapter (`content.js`) | Window resize goes through the existing frame-batched scheduler. | Resize events stream while a window edge is dragged; each ran a full page scan with forced layout. |

## Considered and left out

- **Grading the game once per refresh instead of twice.** Measured at about 1.8 ms
  per refresh for a 160-ply game on the development machine. A memo would have to
  track every input to classification (engine evidence mutated in place, live
  thresholds), so the risk of a stale label outweighed the saving.
- **Batching the review page's own resize handlers.** Small benefit, and the layout
  tests rely on synchronous resize behavior.

## Verification

`tests/progress-throttle.test.mjs`, the extended `tests/button-preview.test.mjs`,
`tests/button-preview-content.test.mjs` and `tests/content-performance.test.mjs`
cover hidden-tab deferral, the adaptive interval, the stored estimate cache and the
resize batching. See the commit for the full-suite result.
