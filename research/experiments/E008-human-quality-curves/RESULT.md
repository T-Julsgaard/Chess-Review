# E008: collection complete; frozen evaluation next

Updated2026-10-05. Development experiment only, SF19. Plan registered in
`f47409d`; collector/query guards committed in `e26d865`. The extension stays B000.

The authored startpos pilot and two-game guarded smoke completed. Smoke:2 games,
81 unique searches,82 engine requests,15,562 compressed bytes, zero model fits.
This checks mechanics and cost only. The full600-game run completed from
`e26d865` using exactly the same frozen engine configuration:23,584 unique
searches,23,706 requests,69 compatible query reuses,1,794 seconds,4,453,580
compressed bytes. Terminal77316 exited0. No candidate fits ran during collection.
Reserved300 games remain excluded. No validation metrics have been inspected.
The complete observations and collection run are registered D002 derivatives;
the guarded provenance check passes.

## Resume

The collector is terminal. Canonical observations and collection receipt are
in `evidence/`; use the guarded loader. Its ignored progress/cache/header under
`research/runs/E008/sf19/` are unregistered and must not be loaded into a model.
Do not rerun collection or substitute those files for the complete artifact.

Commit completed observations/registration **before** model fitting. Then run
the frozen evaluator, register/commit its outputs, and run verification
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
