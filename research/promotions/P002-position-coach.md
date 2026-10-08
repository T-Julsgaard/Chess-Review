# P002: Player-aware position coach

- Decision: implemented under the user's 2026-10-08 request for move-following
  coach messages, likely-relevance ordering, every matching result, and the
  player's White/Black perspective. Local `main`; no push.
- Authority: [P001](P001-concepts-tab.md) and completed
  [E080](../experiments/E080-pawn-shield-defense/RESULT.md). Canonical tracker
  remains E080: 372 verified occurrences / 322 names, 320 eligible routed names.
  No additional concept, scope, benefit or scientific verification is promoted.
- Selected implementation: `lib/coach-insights.js` is a pure presentation policy;
  `analysis.js` provides Engine/Coach tabs in the existing Engine panel beside
  Accuracy. The existing panel footprint and custom layout are retained; when
  desktop Accuracy is collapsed the Coach can use spare space below it, capped
  at 420px and the board's bottom edge. Longer lists scroll inside the panel.
  `styles.css` spaces successive insights with padding, separators and 12px gaps.
- Message structure: selected move, playing side and existing move assessment;
  then every matched concept name, perspective, explanation and expandable
  original detector text/verified scope. Mainline and variations use the exact
  selected input/history. Navigation replaces the list immediately, including
  pending/initial/practice states, so no previous-move text survives. Async
  results look up the current key; evidence expansion and scroll survive only
  within the same selected input/perspective.
  The existing raw Concepts inspector now also redraws directly on navigation;
  completed/cached inputs have no new worker event and previously left it stale.
- Ordering: stable explicit presentation tiers: terminal result, available draw
  claim, forcing continuation, tactical detail, defensive resource, check, piece
  activity, pawn structure, other position facts. Equal-tier findings retain
  detector order. Every accepted match remains, including multiple catalog names
  for one explanation. This is a relevance heuristic, not measured coach quality
  or a new evaluation. No top-N suppression, stochastic wording or priority proof.
- Perspective: research templates address the mover. Coach wording keeps that
  voice on the player's moves and translates both actors to they/their and
  you/your on opponent moves, including possessives and verb agreement. Board
  flips do not change `S.meSide`. The player's side from game selection is used.
  Overload wording uses the actual proven defender's color/type/square: an
  opponent defender is a conditional opportunity; your defender is a conditional
  risk. The original "if" continuation and next-reply horizon remain explicit.
  Missed mates and defensive resources retain who acted. Structural observations
  are never assigned positive/negative advantage labels merely by ownership.
- Evidence/schema: `lib/concepts/analyze.js` attaches only mover and overloaded
  defender ownership to accepted findings. Full proof trees are not copied into
  summaries. All 63 promoted detector modules and their frozen research sources
  remain semantically unchanged; no search budgets, scoring, grades, existing
  coach phrase banks, avatar narration or saved game schemas change. The memory
  cache profile becomes E080-P002-v1 for the richer summary shape.
- Cost/reuse: Coach and Concepts share the same optional worker, cache and
  checkbox. Coach has an enable action when analysis is off. Opening the tab does
  not enable work automatically. Disabled analysis still skips the worker and
  history-building cost. Worker results refresh only the current visible Coach
  and/or Concepts view. Errors/exhaustion display a compact abstention notice;
  existing Concepts game-wide diagnostics retain their detailed reports.
- Exposure: new UI/policy fixtures are authored synthetic; no new real-game
  acquisition, fitting or effectiveness evaluation. Existing guarded regression
  audit uses D001 preflight, public-data-v1, reconstruction verified.
- Verification: all 322 production regression tests pass, including all-match
  stable ordering, two-side wording/grammar, conditional overload ownership from
  an actual accepted proof, stale completion/navigation, variation/practice/start
  states, scroll/evidence preservation, disable/shared-worker behavior and unchanged
  scoring. P001 canonical tracker/byte identity and guarded retained-synthetic
  routing audits remain in that suite; unchanged detector studies are not refrozen.
  Source verification, whitespace checks and local package builds pass. Firefox
  package lint reports zero errors and one existing dynamic-innerHTML warning.
  The 28 real Chrome layout cases pass, covering Coach desktop/Black perspective,
  narrow 320/390px views with a definite 420px box and internal scrolling,
  raw Concepts, custom/reset/reload and existing library
  behavior. Desktop and scrolled narrow Coach screenshots were inspected.
  Packaged Chrome and Firefox smoke checks both pass with both engine builds and
  rating modes, native tab controls, selected-move replacement, initial clearing,
  all seven selected test-move matches, Engine return and worker shutdown. Each
  browser processes 22 moves / 254 findings with zero errors or unavailable inputs;
  22 bounded mate-budget abstentions remain explicit. Measured concept-analysis work
  totals 35.80s Chrome / 52.05s Firefox on this host; presentation adds no search.
- Rollback: remove the Engine/Coach switch and presentation module, revert compact
  ownership metadata/profile version; P001 remains independently usable. No
  scoring/calibration rollback or persisted analysis migration is necessary.
- Implementation commit: the local commit introducing this record.
- Limits: relevance ordering and educational usefulness have not been evaluated
  with users or an independent game corpus. Geometry remains an observation;
  benefits remain bounded or conditional exactly as the accepted detector states.
