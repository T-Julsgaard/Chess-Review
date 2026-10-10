# E183 source-cap audit

2026-10-10, after initial32case/96decision pilot and independent replay passed.
Frozen E169 checkWitness verifies exact a.nodes and equality of a.limit to the
input cap, but does not assert a.nodes<=a.limit. A caller could supply a valid
positive source proof with both input and reported cap forged below its cost.
E143 already has the inequality. Original maintained source evidence is not
modified; its genuine default-cap results remain valid.

Strengthen E183 runtime and independent checker admission for BOTH source types:
source analysis.nodes must be a safe nonnegative integer no greater than the
strict original input cap before source success can be cached. Add focused
forged matching-cap controls and keep the original source verifiers unchanged.
This enforces the already registered strict budget contract, not a new weaker
claim, horizon, data choice or rescue gate.

Retain initial-budget-results/run/replay/focus-results/smoke artifacts and the
initial runtime/checker/test sources. Rerun affected cap controls, rederive the
four turnover smoke and three focus decisions from retained raw panels/trees,
and refresh the32case main pilot and FULL independent saved replay on final
bindings. No source panel or earlier certificate is recollected. Long cumulative
regression and clean reproductions remain deferred. Final code-ready status
requires these checks, source verification and diff checks.
