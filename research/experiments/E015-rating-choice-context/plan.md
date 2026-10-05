# E015: rating-conditioned legal-choice likelihood

Registered 2026-10-05 before candidate fitting or assessment. Development only.

## Claim and fixed recipe

Question: does recorded Lichess blitz rating help predict the selected player's
observed legal move beyond a single global engine-utility choice model? This is
peer-choice prediction, a prerequisite for contextual performance research. It
does not predict the recorded rating while using that rating as input, establish
latent strength or validate an estimated-rating adjustment.

F004's phase/strength outcome interactions and F002's nonlinear moves-only
rating features address different targets. The new premise is that human move
selection conditional on available alternatives may vary with recorded rating.
No failed E011 curve is retuned or rescued here. Freeze utilities to the current
SF19 CP curve: `sigmoid(.368208 * cp/100)`, positive/negative mates to 1/0.
This comparator utility is an engine-derived input, not calibrated human truth.

For legal utilities `u[j]`, assign choice probabilities proportional to
`exp(beta * (u[j] - max(u)))`, and score the observed played index by stable
multinomial negative log likelihood. One focal decision per game has weight 1.

- Uniform comparator: probability `1/legalMoves`.
- Global comparator: fit one `beta` in [0,1000] on training choices only, using
  the maintained convex likelihood fitter, identical utilities/coverage.
- One candidate: `s = (clip(rating,100,3000)-100)/2900`,
  `beta(rating) = betaLow + s * delta`, with `betaLow >= 0`, `delta >= 0`,
  `betaLow + delta <= 1000`. Fit both parameters by mean choice likelihood.
  No phase/opponent/outcome/player-ID predictors, fitted utility curve, arbitrary
  rating bands, regularization search or additional candidate family.

The constrained two-parameter objective is convex: each temperature is affine
in the parameters, and multinomial log likelihood is convex in its logits.
Use profiled scalar minimization with bracketed Newton/bisection, analytic
gradient/curvature, at most 100 iterations per scalar solve. Require mean
profile/active-set derivative tolerance <= 1e-9 or bracket width <= 1e-7.
Record the active constraints and independent likelihood/KKT checks. A zero
rating slope is a legitimate no-improvement result; do not force positivity.
Upper numerical-cap optima are not eligible for a passing development finding.

## Cohort, fitting stages and exposure

Use all 600 E008 fixed SF19 20k focal choices: 450 D002 train and 150 existing
development/validation games. All players/games retain their disjoint source
roles. D002's consumed 300 test games are never fitted or scored here. Prior
development labels/results are exposed; this is not fresh confirmation.

The guarded loader must bind complete game histories, legal alternatives, raw
scores/PVs/config hashes and rating metadata to the registered dataset. Keep
source/private games outside chat. Preserve D002's archive-prefix selection,
absent provisional status and source/exposure limitations. Numeric rating is
legitimate context for this target, not a moves-only feature.

For training cross-fit diagnostics, sort the 450 training IDs by SHA-256
`E015-fold-v1:<gameId>` and assign sorted index modulo 5 (90 games per fold).
Fit global/candidate on each other 360, then score its 90 omitted games.
Also fit one final global/candidate pair on all 450 train, then score all 150
development games. No validation data enters any fit, fold assignment or
hyperparameter choice. Freeze source/folds/code before fits; commit fitted
models and optimization evidence before the single performance assessment.
Training-fit objectives/derivatives may be used only for numerical convergence.

## Gates and uncertainty

Primary: mean paired global-minus-candidate choice log loss on the 150
development games. Pass requires gain >= .02 nats per choice and a strictly
positive 97.5% paired-game percentile lower bound. Use 10,000 replicates,
LCG(1664525,1013904223), seed 20261055, sorted endpoints
`floor(.0125*(B-1))` / `floor(.9875*(B-1))`.

Also require:

- Candidate beats uniform on development by >= .02 nats and positive 97.5%
  interval (same procedure, seed 20261056). Two fixed interval comparisons,
  conservative Bonferroni family. No separate candidate selection from either.
- Mean paired gain of the five-fold training cross-fit is >= 0. Its descriptive
  interval uses seed 20261057 and explicitly conditions on overlapping fold
  fits; it does not certify training-fit uncertainty or independence of folds.
- Complete paired coverage: 450 cross-fit plus 150 development choices, identical
  histories/legal alternatives/played indices, no missing or replacement games.
- In each predefined rating (<1200,1200–1999,>=2000), ply (<=20,21–50,>50) and
  fixed root-point (<.1,.1–.9,>.9) group with >=30 games, candidate mean log loss
  may exceed global by at most .05, separately for cross-fit and development.
  Sparse groups remain unresolved, never silently treated as passes.
- All twelve fits (global/candidate, five folds plus final) are finite/converged;
  no upper-cap optimum. Record lower/zero-slope active bounds, exact fitted
  coefficients, score-bearing diagnostics and out-of-anchor rating clipping.

Sample rationale: all compatible cached training/development observations,
one case per player-disjoint game. This modest cohort supports a development
screen, not rare-tail, provisional, global-population or single-game-rating
claims. No sample-size extension after seeing results.

Secondary operational diagnostic: reuse all 45 fixed E009 20k/80k complete
legal-choice vectors with the final models. Report paired total-variation
distribution/drift versus global and counts <= .1, with Wilson 95% intervals.
No numerical stability gate selects/refits the primary candidate here; preserve
the diagnostic as an adoption limitation. Higher-budget search is not human
truth; the 30 train/15 development subset is not a fresh model evaluation.

## Proof, resources and decision

Preregister and commit before fitting; register source-bound freeze and candidate
code; retain models before performance comparison. Synthetic mechanics must
test constant and increasing-temperature families, boundary/flat data, stable
probabilities/mates, training-only roles, unique folds and tampered bindings.
Independent verification must parse raw score utilities, reconstruct every
temperature/probability/NLL, check fit objective/KKT convergence, reproduce
fold ownership, paired metrics/bootstrap/gates and the cached stability
diagnostic. Refit exactly and replay from an external Git archive without new
searches/dependencies/network/ignored inputs or Git metadata; use explicit
newline bindings if recorded mixed source bytes differ in Git representation.

Budget: zero new engine searches/human labels; twelve predeclared fits, at most
5 minutes fitting and 2 minutes scoring, excluding guarded source reconstruction.
Retained experiment outputs <= 2 MiB; reuse parent observations without copies.
No test confirmation is activated. One decisive performance look, no rescue
refit after a failed gate.

If all development gates pass, report improved peer-choice prediction under
these conditions. It is not an improved Elo estimate, accuracy percentage,
rating adjustment or human category classifier. Scientific confirmation needs
a new registered cohort and a frozen recipe; final contextual performance needs
independent future/repeated performance targets beyond retaining recorded
rating. If unsuccessful/inconclusive, preserve the result and stop or change
the premise explicitly. Runtime B000 and both human review packs remain fixed.
