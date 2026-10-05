# E008: collection running; no candidate results yet

Updated2026-10-05. Development experiment only, SF19. Plan registered in
`f47409d`; collector/query guards committed in `e26d865`. The extension stays B000.

The authored startpos pilot and two-game guarded smoke completed. Smoke:2 games,
81 unique searches,82 engine requests,15,562 compressed bytes, zero model fits.
This checks mechanics and cost only. The full600-game run then started from
`e26d865` using exactly the same frozen engine configuration. Reserved300 games
remain excluded. No candidate has been fitted or validation metrics inspected.

## Resume

The full collector is live in terminal session `77316`, collector PID8428,
engine PID32404. Poll that existing handle, not a new invocation. Its ignored
progress/cache/header are `research/runs/E008/sf19/`; these partial artifacts
are unregistered and must not be reused or loaded into a model. Read compact
progress only. The collector refuses an unregistered partial-run restart.

On successful exit, register the completed observations and collection run as
D002 derivatives, verify provenance, and commit them **before** model fitting.
Then run the frozen evaluator, register/commit its outputs, and run verification
and a clean offline replay. `research/clean-replay.mjs E008 <archive-commit-SHA>`
runs the fit/independent equations from an external Git archive without `.git`,
network, ignored caches or dependencies. Retain the archive command/hash and
receipt. Report every failed gate and target limitation.
If the collector fails, document the exact failure and decide an explicit,
provenance-checked recovery; do not erase exposure or silently change searches.

The new code checks full query bindings, legal alternatives/PVs, raw score/
diagnostic identity, train-only fitting, matched coverage and equal game weights.
An independent equation implementation checks gradients, every prediction and
metrics. These checks establish numerical integrity only. A passing development
screen would still require fresh confirmation, search-budget stability and
separate display/aggregation evidence. E005 human annotation remains pending.
