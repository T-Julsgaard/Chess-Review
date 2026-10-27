# Release 0.4.0 verification — October 27, 2026

## Upgrade and first-open behavior

The new `settingsResetFor040` migration is independent of the previous 0.3.0
marker. It applies on 0.4.0 and later until completed, including direct upgrades
that skip 0.4.0. New installations receive the same Modern panel designs,
arrangement and two analysis/panel lines. Modern stays saved; later deliberate
changes remain saved, including selecting Old or Custom.

The migration writes only settings, layout, layout mode/version and its own
completion marker. It preserves sound/mute, master and event volumes, sound
selections, move animation and speed. Usernames, player history, games, favourites,
stored analyses, caches, pending jobs, learning progress and unrelated storage
keys remain intact. The workspace waits for migration completion before reading
preferences or painting. Failed writes remain retryable, and simultaneous update
and startup callers cannot reset later edits twice.

The developer note is independent of the migration and remains available once
for new installs, including future versions. It highlights both learning buttons,
respects previous dismissal/opt-out, and never changes the selected layout.

## Verification performed

- Full suite after the furthest-result navigation follow-up: **1,245 passed**, zero failures, cancellations or skips, using
  `node --test --test-concurrency=4 tests/*.test.mjs`. A prior unrestricted run
  during concurrent lint/browser work hit an existing wall-clock Elo animation
  assertion; limiting test concurrency produced the clean final run.
- Chrome **156.0.8078.48** and Firefox **159.0**: real engine startup, both engine
  reviews and rating modes, responsive board sizes, reloads, simulated 0.3.0
  upgrades with the old marker, preservation of data/audio/motion, subsequent
  customisations, missed-update recovery and the once-only new-install note.
- Both browsers loaded all **50,000 packaged puzzles**. Packaging regression
  coverage compares every puzzle and all source metadata, including IDs, order,
  positions, solutions and ratings, and rejects missing/invalid package parts.
- Chrome layout audit: **20 cases passed**, including square boards, desktop and
  narrow windows, popup sizing, saved layout reset/reload, legacy preferences and
  concurrent library writes. The audit found and verified a correction for canvas
  boards becoming rectangular at intermediate window widths.
- Developer-note audit: seven desktop/narrow viewport sizes, both highlighted
  buttons remaining clickable, arrow endpoints, normal/reduced-motion dismissal,
  opt-out and reload suppression. Representative screenshots were inspected.
  The note now moves below scaled controls when it would cover the puzzle button.
- Current dedicated puzzle UI, opening-library and statistics browser audits
  passed, including desktop/mobile interactions and ten opening views.
- Source validation and all four engine SHA-256 checks passed during packaging.
- The actual Firefox ZIP passed `web-ext lint` with **zero errors, zero notices**
  and one pre-existing `UNSAFE_VAR_ASSIGNMENT` warning at the bundled HTML helper
  in `analysis.js`. No new HTML assignment was introduced by this release work.

## Package format and provenance

The previous single puzzle JSON exceeded the Firefox validator's 5 MiB parsing
limit. The builder now generates seven JSON parts below 4 MiB and a small index.
The complete readable dataset stays in the source ZIP. Each browser package record
contains the source dataset SHA-256 and hashes of the generated index/parts.

ZIP verification checks every packaged file against source/generated hashes,
archive checksums, matching 0.4.0 version metadata, browser-specific background
declarations, and exclusion of test harnesses and development directories. The
Firefox ID and extension permissions are unchanged from the 0.3.0 source manifest.
Upload these as updates through the existing store listings.

The final build record and checksums are available through
`web-ext-artifacts/latest-release.json`; export folders are preserved independently.
The upload ZIPs are generated from the committed working tree. No store upload or
Git push is performed by this task.

## Pending-analysis navigation follow-up

Parallel engine workers finish different positions at different times. The graph
already plotted later results with gaps, but buttons, keyboard, graph and move-list
navigation were capped at the uninterrupted completed prefix. A slow earlier
position could therefore prevent browsing until the rest of the analysis finished.

Navigation now stops at the furthest position with a completed evaluation, rather
than the first unfinished position or the end of the loaded game. Pending gaps
before that limit remain accessible and show calculating states. Later moves stay
locked, and new completed results extend the limit without moving the selected
position. Buttons, keyboard, move-list clicks, every graph design, playback and
recorded board moves share this limit. Autoplay waits at the boundary and resumes
when it advances. Preview scores and completion counters cannot unlock moves;
interrupted analysis retains the same boundary. Search budgets, worker scheduling,
scores and saved analyses are unchanged.

Ten navigation regressions cover keyboard, move-list clicks, all six graph designs,
matching board moves, autoplay and stopped analysis. The deferred-worker regression
also holds positions zero and one unfinished while later results arrive and checks
the boundary and independent updates to the selected gap. All 48 focused tests
passed, followed by the full 1,245-test suite. The viewport-preview fixture now
publishes scores when simulating completed analysis before restoring a saved move.
The packaged Chrome/Firefox smoke checks reproduce gaps, verify the navigation
boundary and confirm that new results extend it independently.

The selected extension summary is now: “Free, open-source chess analysis, puzzles
and opening lessons.” These changes remain part of the unreleased 0.4.0 packages;
use the newest release directory from `latest-release.json` for upload.

## Remaining tooling limitation

The older combined learning audit assumes a fixed board top edge, a retired tab
order and an empty statistics view. It is not used as the current release gate.
The dedicated current audits listed above cover those shipped flows. Test-only
exports, browser profiles and the temporary Mozilla-signed Firefox runtime remain
outside the upload ZIPs.
