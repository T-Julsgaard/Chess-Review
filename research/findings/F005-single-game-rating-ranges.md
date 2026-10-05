# F005: marginal rating coverage requires broad ranges in this cohort

Recorded 2026-10-05; [E006](../experiments/E006-rating-uncertainty/RESULT.md),
development evidence. Fixed B000-style moves-only point models plus game-level
calibration give roughly90% simultaneous coverage with mean widths about1,500
recorded Lichess blitz rating units. Learned residual scaling does not deliver
the declared useful improvement; no case meets the ±300 precision threshold.

SF18 coverage for recorded ratings>=2500 is only72.97% in37 games despite about
90% overall coverage. SF19 has too few such games to resolve that guardrail.
Preserve this failure: a globally calibrated range must not be advertised as
equally reliable at every strength or as a confidence interval for true strength.

This does not establish impossibility of better rating inference. It establishes
a limitation of the declared predictor/scale family on the selected development
cohort. Wider ranges, different information, repeated-game targets and abstention
policies require distinct protocols; a confident point estimate is not justified
merely by the existence of a marginal interval procedure.

Numerical replay and fold refitting pass. D001 eligibility, provenance and reuse
limits remain; exact receipts and evidence are linked in E006. Decision: no
promotion and no retry of this exact scale family without a changed premise.
