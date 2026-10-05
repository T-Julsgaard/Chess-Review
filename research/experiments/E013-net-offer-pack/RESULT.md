# E013: tested selection and search code; pack build next

2026-10-05. A separate16-case prospective pack will target8 net voluntary offers
plus8 matched nonoffers, using train-only eligible source WDL context and the
unchanged B000 board predicate. E005's24 games are excluded. No new pool scan,
selection or property metrics yet; human annotation is pending.

The first authored test invocation caught an extra closing parenthesis in the
new shared root-panel helper, before data access. The syntax is corrected; no
real pack, searches or metrics were produced by that failed invocation.

Four authored tests pass: deterministic matching and inadequate pools, source/
policy/blinding/all-legal tampering, positive independent net-cost witnesses and
screen equations, and E013 partial-progress/export namespace. `verify:source`
passes. The exact E012 SF18 smoke is reused because engine/budgets/options are
unchanged. Selection/collector/scoring/verification code is committed before the
real pool scan. The shared research-only root-panel helper avoids duplicating
the collector in later studies; E012's frozen code remains unchanged.

Next: run `node research/experiments/E013-net-offer-pack/code/build.mjs` once.
Its5min cap and insufficient-pool rule are frozen. Register/commit complete pack,
key, policy and build receipt before collecting; do not rebuild over existing
canonical cases. Keep all later unsupported/unstable cases and preserve E005.
Human annotation, broader scoring research and implementation remain pending.
