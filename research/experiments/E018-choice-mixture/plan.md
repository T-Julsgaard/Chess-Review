# E018: fixed-component legal-choice probability mixture

Registered 2026-10-05 before fitting or performance assessment. Development only.

E015 rating-temperature and E016/E017 utility transformations did not resolve
incremental choice benefit. Stop those exact recipes. The distinct premise is
that one temperature may not describe both concentrated choices and diffuse
choices well. This tests a predictive distribution, not literal psychological
types, an outcome curve, another CP transform or an estimated-rating adjustment.

## Fixed model and training sequence

Keep utilities `sigmoid(.368208*cp/100)`, mates by sign to 1/0. Mate distance
is ignored. All legal alternatives enter stable softmax probabilities. First
fit the comparator temperature beta in [0,1000] on training choices only with
the maintained convex scalar fitter. Hold this fitted beta fixed inside the
candidate's weight fit. Components on the same alternatives are:

- G: comparator softmax at beta.
- H: softmax at min(1000,2*beta); factor 2 is fixed, not a candidate sweep.
- U: uniform 1/legalMoves.

Candidate `P=(1-a-b)*G+a*H+b*U`, `a>=0,b>=0,a+b<=1`. Fit the two weights by
mean played-move multinomial NLL on the same training rows. Conditional on beta,
this objective is convex; its Hessian is the mean outer product of probability
differences divided by played probability squared. The comparator is included
at a=b=0. This is sequential fitting, not joint optimization of beta and weights.
No rating/phase/opponent/outcome predictor, component-factor search, CP-curve
tuning, regularization search or rescue refit.

Use profiled bracketed Newton/bisection over b in [0,1], with a in [0,1-b].
At most 100 iterations per solve. Require mean profile derivative <=1e-9 or
bracket width <=1e-10, and independent gradient supporting inequalities at all
three simplex vertices >=-1e-7. Record active bounds and flat/degenerate fits.
Candidate training objective must be <= comparator+1e-10. A zero added weight
is legitimate. Simplex boundary optima are allowed; a global or doubled
temperature reaching the numerical cap is not eligible to pass. Use log-space
played probability for finite NLL even when displayed probabilities underflow.
One forced choice has probability 1/NLL0 and is ineligible for fitting; none
enters the fixed focal cohort.

## Frozen inputs and roles

Reuse exact E008 SF19 20k observations:600 D002 focal choices, 450 train and
150 exposed validation; plus all 45 E009 20k/80k pairs. Bind complete histories,
legal sets, played indices, exact raw scores/PVs/configurations and origins.
No consumed 300 test games enter fitting or assessment. Retain archive-prefix
convenience sampling, unavailable provisional status and all previous exposures.
This is not fresh or study-series-wide error-controlled confirmation.

Reuse E015-fold-v1 SHA ordering/index modulo5:five360-game training pairs score
their omitted90; final450 pair scores150validation. Twelve model fits total
(six global scalar fits, six conditional two-weight fits), equal game weights.
Commit plan, source/code/cohort freeze and then models before the one performance
look. Training objectives/derivatives are convergence evidence, not assessment.

## Gates and diagnostics

Development comparator-minus-candidate paired NLL gain must be >=.02 nats and
have positive97.5% paired-game percentile lower bound. Candidate must beat
uniform by >=.02 with positive97.5% lower bound. Two within-study comparisons
use conservative Bonferroni coverage. Bootstrap10,000 LCG(1664525,1013904223)
replicates, seeds20261085/86; endpoints floor(.0125*(B-1))/floor(.9875*(B-1)).
Require mean cross-fit gain>=0 (descriptive interval seed20261087 conditions on
overlapping fits), complete450/150/45 coverage, all finite converged fits and
no capped component temperature. For each fixed rating(<1200,1200–1999,>=2000),
ply(<=20,21–50,>50), comparator root-point(<.1,.1–.9,>.9) and any exact mate
alternative vs none group with >=30 games, candidate mean harm<=.05 nats,
separately cross-fit/development. Sparse groups remain unresolved.

Descriptive: multinomial Brier, five equal-width top-choice probability bins,
first maximum on ties, bin counts/weighted absolute calibration error, empty
bins null. No selection/refit from diagnostics. Report 45-pair complete-vector
TV drift and paired reduction interval(seed20261088), counts<=.1 with Wilson95%
intervals. The subset includes30training cases; higher budget is not human truth.
Retain the operational limitation without treating lower drift as validity.

## Proof, resources and decision

Synthetic checks: known mixture probabilities, normalization/ties/forced moves,
zero/full component weights, log-space underflow, authored interior/edge/flat
weight optima, simplex KKT, training-only roles, fixed folds, tampered source/
model/weight/mate/report fields. Independent audit parses raw CP/mates, computes
all G/H/U/P probabilities and likelihoods, checks global derivatives and candidate
objectives/gradients/vertex inequalities,600vectors,45pairs, Brier/calibration,
40,000 bootstrap replicates and every gate. Exact refit and external Git archive
replay must pass with prefit byte/newline bindings, no new searches, dependencies,
network or ignored inputs. Verification refits are reproduction, not new trials.

Budget: zero new engine searches/human labels; twelve prescribed fits <=5minutes,
scoring<=2minutes excluding guarded provenance reconstruction; retained evidence
<=2MiB. All compatible cached cases determine sample size. No extension after
results. Stop this exact mixture recipe on failure. A pass supports development
legal-choice prediction only; fresh registered D003 and a frozen recipe are
needed for confirmation. No improved Elo, displayed accuracy, category validity
or deployable all-alternative latency follows. Scoring B000 and human packs stay fixed.
