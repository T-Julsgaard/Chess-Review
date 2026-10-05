# E017: signed-log CP utilities for human legal-choice prediction

Registered 2026-10-05 before fitting or performance assessment. Development only.

## Distinct premise and fixed recipe

E016's raw linear CP recipe predicts choices worse despite lower search drift.
Stop that recipe. This comparison tests context scaling: a CP gap near equality
may matter more than the same gap when far ahead/behind, while retaining more
tail sensitivity than a sigmoid. This is a utility transformation, not softmax
centering, another rating-temperature fit or rescue of the E011 outcome curve.

[Regan and Haworth (2011), section 3.1](https://cse.buffalo.edu/~regan/papers/pdf/ReHa11c.pdf)
motivates a log scaling differential. Our symmetric transform, scalar softmax,
mate policy, Stockfish and Lichess blitz cohort differ from their full recipe.
No reproduction of their ratings or external-site scores is an objective.

For ordinary CP `c`, let `x=clip(c,-10000,10000)/100` in pawns, and define
`u=.5+sign(x)*log1p(abs(x))/(2*log(101))`. This maps the fixed +/-100-pawn
anchors to 0/1. Its derivative inside the bounds is proportional to
`1/(1+abs(x))`: absolute position context changes the gap scale. Bounds,
normalization and one-pawn log offset are fixed, never fitted. Mates map by sign
to 1/0, retaining E016/comparator semantics to isolate the ordinary-CP transform.
Mate distance is ignored and capped CP can tie mates; this remains a limitation,
not a claim of optimal mate utility. Count every CP clip and mate alternative.

Comparator: `sigmoid(.368208*c/100)`; mates by sign to 1/0. Each recipe uses
all legal alternatives, probabilities proportional to `exp(beta*(u-max(u)))`,
and one train-only beta in [0,1000] fit by mean multinomial NLL using the
maintained convex scalar fitter. No rating/opponent/phase/outcome predictor,
curve tuning, candidate sweep, extra fitted parameter or rescue refit.
Uniform `1/legalMoves` is an additional baseline. A single forced move scores
probability 1/NLL 0 and is ineligible for fitting; none enters the focal cohort.

## Inputs, roles and one performance look

Reuse exact E008 SF19 20k observations for 600 D002 focal choices:450 train,
150 exposed validation; and all 45 E009 20k/80k pairs. Preserve complete history,
legal sets, played indices, exact raw scores/PVs/configurations and game origins.
No consumed 300 test games are fitted or scored. Source-prefix convenience and
unavailable provisional status persist. Many previous development looks have
occurred; this is not a fresh or study-series-wide error-controlled confirmation.

Reuse label-independent E015-fold-v1 SHA ordering/index modulo5:five360-game
training fits score their omitted90; final450 fits score150validation. Twelve
scalar fits in total. Each game has weight1. Commit plan, then source/cohort/code
freeze, then train-only fitted models before the single performance assessment.
Training objectives/derivatives are convergence evidence only. No extension of
sample size or change of thresholds after results.

## Gates and fixed diagnostics

Development paired comparator-minus-candidate NLL gain must be >=.02 nats and
have a strictly positive97.5% paired-game percentile lower bound. Candidate
must beat uniform by >=.02 with a positive97.5% lower bound. Two fixed primary
comparisons use conservative Bonferroni family coverage within this study only.
Bootstrap10,000 replicates with LCG(1664525,1013904223), seeds20261075/76;
endpoints floor(.0125*(B-1))/floor(.9875*(B-1)).

Also require mean cross-fit gain>=0 (descriptive interval seed20261077 conditions
on overlapping fits), complete450/150/45 paired coverage, finite converged fits,
no upper-cap optimum, independently checked mean derivative/KKT tolerance1e-8.
In each fixed rating(<1200,1200–1999,>=2000), ply(<=20,21–50,>50), comparator
root-point(<.1,.1–.9,>.9) and **any exact mate alternative vs none** group with
>=30 games, candidate mean harm<=.05 nats, separately for cross-fit/development.
The additional mate guard is fixed before fitting. Sparse groups are unresolved.

Keep E016's descriptive multinomial Brier, five equal-width top-choice calibration
bins (first maximum on ties; empty bins null), bin counts and weighted absolute
calibration error. No selection or refit from these diagnostics. Keep 45-pair
complete-vector TV means/quantiles, paired reduction interval(seed20261078) and
counts<=.1 with Wilson95% intervals. This is not a primary gate: the subset has
30 training cases, higher search budget is not human truth, and E016 shows why
lower drift alone cannot establish improved choice prediction.

## Proof, budget and decision

Synthetic checks must cover known log values, monotonicity/symmetry, reduced gap
size far from equality (translation invariance is intentionally absent), mates,
caps/forced moves, stable extreme probabilities, flat/boundary/contaminated fits,
fixed fold ownership, mate-group assignment and tampered bindings/report fields.
Independent code parses raw CP/mate text and computes log utilities separately,
checks twelve objectives/derivatives,600vectors,45pairs, Brier/calibration,
40,000 bootstrap replicates and every gate. Exact refit and external Git archive
replay use source-byte/newline representations recorded before fitting; zero new
engine searches, dependencies, network or ignored inputs. Twelve original fits
plus deterministic verification refits are reproduction, not candidate trials.

Fits<=5minutes, scoring<=2minutes excluding guarded provenance reconstruction;
retained evidence<=2MiB. All compatible cached observations determine sample
size; no new engine searches or human labels. A pass supports development
legal-choice prediction under these conditions only. No improved Elo, displayed
accuracy, category label, deployable all-alternative latency or confirmed model
follows. Scientific confirmation requires fresh registered D003 and a frozen
recipe. On failure retain the result and stop this exact signed-log recipe.
Production scoring B000 and both pending blinded review packs remain fixed.
