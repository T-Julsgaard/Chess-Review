# P001: Optional, inspectable Concepts tab

- Decision: implemented 2026-10-08 under the user's explicit initial Concepts
  integration request. Reuse local `main`; commit locally, without pushing.
- Evidence: E080 completed at `5f3b18f`; frozen detector source
  `fe78fcf871cc485fb6078fc78a2d3e3addcdda31`. The canonical tracker has 372
  verified occurrences / 322 names. [E080 RESULT](../experiments/E080-pawn-shield-defense/RESULT.md)
  retains exact main/repeat/initially clean runs and independent saved replay.
  This verifies synthetic mechanics, not real-game precision/human usefulness.
- Selected files: `scripts/promote-concepts.mjs` deterministically relocates
  imports in the 63-module E020–E080 runtime dependency graph to
  `lib/concepts/detectors/` and normalizes trailing newlines to one LF, without
  changing detector logic. It generates
  `provenance.json` with LF-normalized source/imported SHA-256 hashes and exact
  verified occurrence scopes. Frozen research code/evidence remain unchanged.
- Scope authority: `lib/concepts/registry.js` explicitly routes events and
  certificate attributes to 320 verified names. Board coordinates (notation)
  and Illegal move (attempted-input support) are excluded from played-move
  review. Partial occurrences, glossary, rating and training support are
  excluded. Duplicate names retain verified IDs/scopes; a verified name never
  promotes a partial occurrence or a weaker precursor event.
- Strict examples: Only/Forced move require E041 unique mate-defense proofs,
  not only-legal-move facts. Pawn shield requires E080, not cover geometry.
  Outpost requires E070, not E024 geometry. Deflection combination uses E049
  overload certificates, not E043 mating roles. King in the center requires
  E079 audited reuse of E039 before-refuted/after-proven safe promotion.
- Runtime/UI files: `lib/concepts/{analyze,profile,registry,session,worker}.js`,
  `analysis.js`, `styles.css`, associated tests and the browser layout harness.
  Append Concepts after Visual/Engine in the existing right Settings expansion;
  default off, persist checkbox. Show every routed finding without priority
  selection/list caps, short text, factual/bounded-proof label and exact scope.
  Supplement only directly validated check/capture/promotion/EP/castling facts
  omitted by terminal fact selection. No strategic predicate changes.
- Preserve scoring: model B000, calibration, grades, Stockfish searches,
  existing coach comments and stored analysis schemas are unchanged.
- Inputs: before-FEN, actual strict UCI and complete preceding mainline or
  variation history with initial FEN. Research validates/replays it. Missing,
  malformed, nonstandard-start or terminal history abstains/errors as specified;
  never fabricate history. Initial/practice positions have no supported context.
- Cost/profile: one isolated serial module worker. Cheap pass completes
  foundation/inventory/open-line/battery work at 4,000 units per module; other
  optional searches use zero (E020/E022/E023 minimum one). Detailed pass enables all
  optional detectors at 4,000 units per module, mate depth 3 and promotion/
  support/race depth 6, with alternative comparison. Five-second wall limit
  separately for initial and detailed phases. Exhaustion abstains; terminate
  hung jobs, retain validated facts, report unfinished detectors and continue.
  These runtime limits never change frozen research budgets/acceptance gates.
  Disabling immediately terminates the worker and queue, with no new concept
  work/history construction. No new permissions/network services.
- Reuse/schema: in-memory 1,024-entry oldest-entry-eviction cache, keyed by
  P001 detector/profile version and complete input/history. FEN alone is
  insufficient. Completed summaries and node-budget abstentions are compatible;
  worker errors/timeouts retry on a later enabled session. No persistent cache
  migration or new game-derived research cache.
- Debug: total per-position concept time over the mainline (reused work clearly
  identified), processed/total positions, named findings, reused positions,
  errors, unavailable inputs and exhausted node/wall budgets. Variations have
  separate diagnostics and are excluded from game totals. Disabled metrics
  retain already incurred current-game work; in-progress counts are provisional.
- Exposure/provenance: new fixtures are authored synthetic; no new real-game
  acquisition/fitting/evaluation. Guarded existing research regression/admission
  uses D001 preflight, public-data-v1, reconstruction verified. The routing audit
  checks saved synthetic physical output hashes. No numerical confirmation claim.
- Verification: imported detector byte identity, canonical tracker/occurrence
  coverage, retained synthetic routing/exclusions, history/no-history,
  E080/terminal fixtures, disable/cancel/stale/cache/watchdog behavior, tab order
  and selected variation context; full app/cumulative coach tests, source
  verification, lint/package and browser wide/narrow worker/UI checks.
- Rollback: disable/remove the tab and bundled concept import; stored scoring/
  coach analysis remains compatible. Local implementation only, not published.

Implementation commit: the commit introducing this record (no self-referential
hash). Verification results (2026-10-08):

- `npm test`: 317 passed, including eight new integration regressions.
- `npm run research:coach-tests`: all 63 cumulative coach test files passed in
  524.6 seconds. Canonical E080/source and retained synthetic routing audits pass.
- `npm run verify:source`, `git diff --check`, Chrome/Firefox package builds pass.
- Packaged Firefox lint: zero errors, one existing dynamic-innerHTML warning.
  Repository `npm run lint` still reports three pre-existing oversized research
  JSON artifacts (E066/E071/E079) and research-demo CSP warnings; none ships.
  Firefox-specific lint flags the intentionally Chrome-only packaged manifest;
  the source manifest and Firefox package retain their existing fallback/ID.
- Real Chrome: 24 layout cases, including Concepts at 320/390px; worker processes
  four positions, finds 44 named findings in 3.616 seconds of concept work,
  zero errors/unavailable inputs and four explicit node-budget abstentions.
  Selected move, unchanged scores, disable, compatible reuse and game switching
  pass. Wide/narrow screenshots were visually inspected. The restricted Windows
  sandbox could not launch Chrome GPU children; tests pass in isolated profiles
  outside that sandbox. Native timer receiver and checkbox activation regressions
  are retained in the application/browser tests.
- Packaged Chrome and Firefox smoke pass both existing engines, rating controls,
  reload/reset, and real 22-move Concepts workers. Both produce 254 named findings
  with zero errors/unavailable inputs and 22 explicit node-budget abstentions;
  concept work takes 26.977s in Chrome and 52.510s in Firefox on this host.
  Firefox's initial 40s smoke wait ended after 19 positions with no worker errors;
  extending only the test wait verifies completion. Runtime budgets are unchanged.
