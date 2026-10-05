# E016: linear centipawn gaps for legal-choice prediction

Registered 2026-10-05 before fitting or performance assessment. Development only.

## Question and motivation

Does a fixed linear CP utility predict observed human legal choices better than
the fixed SF19 sigmoid utility, when each has one training-only temperature?
Both use every available alternative. Subtracting the best utility in a softmax
does not itself change probabilities; the distinct premise is removing the
sigmoid's compression of CP gaps in winning/lost positions.

[Regan and Haworth (2011), Intrinsic Chess Ratings](https://cse.buffalo.edu/~regan/papers/pdf/ReHa11c.pdf)
motivates evaluating alternatives and checking calibration. Their scaled gaps,
two skill parameters, probability conversion, engine and tournament cohort differ
from this study. This is our simpler falsifiable comparison, not a reproduction
or an endorsement of unscaled gaps by that paper. Linear CP preserves more tail
differences, which could improve discrimination or overpenalize human choices.

## Frozen recipes

- Global comparator: `u = sigmoid(.368208 * cp/100)`; mates by sign to 1/0.
- One candidate: `u = .5 + clip(cp,-10000,10000)/20000`; mates by sign to 1/0.
  The fixed 100-pawn limit bounds outliers and numerical scale, not a tuned
  parameter. Record all clipped CP and mate observations; no removal. Mate
  distance is ignored, and capped CP may tie mates; this limitation is explicit.
- For each model `p[j]` is proportional to `exp(beta * (u[j]-max(u)))`.
  Fit one beta in [0,1000] by mean multinomial NLL on training only, with the
  maintained convex scalar fitter. For unclipped CP alternatives the candidate
  is exactly proportional to `exp(-lambda * CP_gap_in_pawns)` with
  `lambda=beta/200`. Translation invariance applies only where clipping/mates
  do not intervene. Uniform probability `1/legalMoves` is an additional baseline.
- No rating context, utility tuning, phase predictors, outcome fitting, gap
  exponent, candidate sweep or post-result refit. Rating is only a subgroup label.

One focal choice per game, equal game weights. Reuse all 600 E008 SF19 20k choices
(450 D002 train / 150 exposed validation) and all 45 E009 20k/80k budget pairs.
No consumed 300 test games enter fitting/scoring. Guard complete histories,
legal sets, played indices, scores/PVs and exact engine configurations. Preserve
source-prefix convenience selection, absent provisional status and all exposures.
Forced choices are absent from this frozen focal selection; the scorer handles
one legal move as probability 1, NLL 0, ineligible for fitting.

Reuse E015's fixed `E015-fold-v1:<gameId>` SHA ordering and index modulo 5:
five 360-game training fits score their omitted 90; final 450-game fits score
150 validation. Twelve scalar fits in total. Reusing that label-independent
assignment supports comparison; it does not make development evidence fresh.
Commit source/cohort freeze before fits and models before the one assessment.

## Gates and diagnostics

Primary development gain is paired comparator minus candidate NLL: >= .02 nats
and strictly positive 97.5% paired-game percentile lower bound. Also candidate
minus uniform improvement >= .02 and positive 97.5% lower bound. Two fixed
interval comparisons use conservative Bonferroni family coverage. Use 10,000
LCG(1664525,1013904223) bootstrap replicates with seeds 20261065/66 respectively;
endpoints floor(.0125*(B-1)) and floor(.9875*(B-1)).

Require mean cross-fit gain >=0 (descriptive interval seed 20261067 conditions on
overlapping fold fits); 450/150/45 paired coverage; all fits finite/converged;
no upper-cap optimum; independent derivative/KKT tolerance 1e-8. For each fixed
rating (<1200,1200–1999,>=2000), ply (<=20,21–50,>50) and comparator root-point
(<.1,.1–.9,>.9) group with >=30 choices, candidate mean harm <= .05 nats in
cross-fit and development separately. Sparse groups stay unresolved.

Secondary, descriptive only: multinomial Brier score and top-choice calibration
using five fixed equal-width probability bins [0,.2),...,[.8,1]. Select the first
max-probability alternative deterministically on ties and compare its predicted
probability with actual selection frequency; report bin counts and weighted
absolute calibration error. Empty bins remain empty. No calibration threshold
or model selection from these diagnostics. Report complete-vector TV drift on
45 budget pairs, paired reduction interval seed 20261068 and counts <=.1 with
Wilson 95% intervals. Higher budget is not human truth; final fits include 30
of these training games. Stability is an adoption limit, not a primary gate.

## Reproduction, budget and decision

Synthetic checks: translation invariance inside CP limits, sigmoid contrast,
mates/caps/ambiguous scores, forced moves, extreme finite likelihood, flat/boundary
fits, train-only fitting, fold ownership and tampered freeze. Independent audit
parses raw CP/mate text, checks all twelve fit objectives/derivatives, 600 vectors,
45 budget pairs, calibration/Brier, four intervals and every gate. Exact refit
and external Git archive replay use recorded source newline representations;
zero new searches/network/dependencies/ignored inputs. Retain <=2 MiB evidence;
fits <=5 minutes and scoring <=2 minutes excluding guarded provenance loading.

All compatible cached cases determine sample size; no extension after results.
One candidate and one decisive performance look. Failures stop this exact recipe.
A pass supports development legal-choice prediction only, not an improved Elo,
displayed accuracy, category label or a confirmed model. Fresh registered D003
would be needed for confirmation. Runtime B000 and human packs stay fixed.
