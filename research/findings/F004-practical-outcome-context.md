# F004: small contextual outcome gains, no qualifying improvement

Recorded 2026-10-05; development evidence from [E004](../experiments/E004-practical-outcomes/RESULT.md).
The monotone phase/strength WDL candidate fails the predeclared practical gate
for SF18 and SF19; the added interaction effect beyond rating-difference/color
context is unresolved. Keep B000 and stop this exact candidate family.

Raw fixed-node WDL is a poor direct predictor of the sampled humans' game
points under the registered loss/clipping policy. Simple scalar calibration
accounts for most of the reduction. That observation motivates a bounded new
question about probability calibration; it does not validate move-loss scales,
displayed accuracy, single-game ratings or human categories. Extreme-probability
quantization/clipping and cohort selection must be explicitly controlled.

Evidence supports small possible development gains, not equivalence, new-player
population representativeness or fresh confirmation. Numerical replay, coverage,
monotonicity and subgroup checks pass; D001 historical provenance limitations
remain. Exact inputs, outputs and the data eligibility receipt are linked in E004.

Decision: no promotion. Do not retry the same features/grid on consumed data
unless a materially changed premise is registered first.
