# Reproducible public calibration

The public calibration makes the numerical model, source evidence and fitting
procedure inspectable. All inputs needed to reconstruct the published SF18
accuracy/context and separate SF18/SF19 moves-only rating coefficients are included
under `public/`. Fitting and replay work offline. Node.js 24 or later is required.

```powershell
node tools/calibration/reproduce-public.mjs
```

For a filesystem-restricted replay:

```powershell
node --permission --allow-fs-read=tools/calibration --allow-fs-read=lib --allow-fs-read=data/calibration.json tools/calibration/reproduce-public.mjs
```

This reconstructs training coefficients before opening expected outputs, verifies
compressed and decoded SHA-256 hashes, and checks exact numerical equality of the
SF18 models and 250 player-side scores. It separately reconstructs both engine's
moves-only Huber models and verifies their search configurations. It launches no
engine, subprocess or network request and needs no research run directory.

## Public sources and roles

Inputs come from the [Lichess CC0 standard-game archives](https://database.lichess.org/),
June–August 2026. `public/sources.json` records URLs, exact byte ranges and local
frame hashes. Whole-archive checksums were not verified. `dataset.json.gz` contains
the versioned normalized public mainlines, outcomes, ratings and split IDs.
Both colors stay in one split, and player identities are disjoint across roles.
Only training observations fit coefficients. Development validation is consumed;
it does not provide untouched final-test confirmation.

The depth model uses 100 training and 25 validation whole games, balanced across
five focal-rating bands. Both players have at least ten nonforced decisions.
Eighty training and twenty validation games contribute four fixed legal choices
each. Frozen histories, legal alternatives, roles and raw searches are included
in `sf18-evidence.json.gz`; a replay never resamples them or selects on validation.

## Accuracy and categorization

SF18 expected human game points are `E(cp) = sigmoid(alpha * cp / 100)`, with mate
signs at 1/0. Alpha is fitted by game-weighted fractional Bernoulli likelihood on
the training outcomes at predeclared plies 11/31/51/71. The published value is
**0.21367705872097242**. Ambiguous mate zero is never accepted as numerical evidence.

Every legal alternative is evaluated at its original root. Beta minimizes
multinomial choice log loss, giving each game unit weight across its sampled
decisions. The published beta is **21.42704255760559**. Move quality is
`100 * exp(-beta * max(0, E(best) - E(played)))`; game accuracy is its arithmetic
mean over nonforced decisions. Engine-top moves score 100. Forced moves are
excluded; opening moves remain in the numerical aggregation.

The bundled SF18 Lite NNUE network is `nn-9067e33176e8.nnue`. Searches use depth16,
Hash16, MultiPV1, maximum skill, one thread, full initial-position history, and
`ucinewgame + Clear Hash + isready` before every search. Non-top played moves are
searched with `searchmoves` at the same root. `data/calibration.json` records loader
and WASM hashes. Custom SF18 search settings do not produce calibrated numerical
scores. Setup-FEN positions remain available for annotation, outside the fitted
standard-start accuracy domain.

Move labels use expected-point loss bands and separately documented board/context
rules. Brilliant requires a legal material offer plus soundness and competitive
position evidence; Great requires adequate evidence about alternatives. These
are explicit annotation rules, not fitted human-label probabilities. Brilliant,
Book and other labels never change accuracy or rating inputs. See
[Brilliant move rules](BRILLIANT_MOVES.md) for detailed cases and limitations.

## Two rating definitions

**Use recorded rating**, the SF18 default, conditions on a player's recorded
rating. Gaussian peer weights use a bandwidth selected from 200/400/800 by five
game-disjoint training-fold CRPS. The observed full-game quality percentile adds
`400 / ln(10) * logit(percentile)` rating units to the recorded rating. This unit
conversion is a declared performance convention. Fewer than twenty effective
peer sides retain the recorded rating. One to nine decisions are short-game
extrapolations, not established playing strength.

**Moves only** predicts recorded public blitz rating level without using the
reviewed player's rating as a predictor. It retains separately fitted SF18/SF19
models. Board/search predictors describe RMS WDL loss, engine-top frequency,
early and contested decisions, decision count and legal-choice complexity.
The declared frozen Huber/ridge recipes are SF18 delta100/lambda1 and SF19
delta250/lambda10. `sf18-rating-evidence.json.gz` and `sf19-rating-evidence.json.gz`
contain the training move evidence used to reconstruct these fixed recipes.
At least ten nonforced decisions are required. The archive target is public
blitz rating level; cross-platform transfer is unvalidated.

Rating searches use 20,000 nodes, Hash32, full skill, cold history and restricted
played-root evaluations. Selecting moves-only for SF18 adds these separate
observations; it never feeds depth16 WDL into a fixed-node regression. SF19 uses
its own fixed-node observations and WDL arithmetic quality; no SF18 coefficients
are assigned to SF19. Displayed ratings are rounded to 50, while model outputs
retain full precision. Saved analyses include scoring evidence and versioned
settings; incompatible saved observations are recomputed.

## Development results and limits

SF18 development validation includes 25 games and 50 player-sides. On the finite
centipawn outcome domain, log loss is **0.63850**, Brier loss **0.22441**. Eighty
heldout choices across twenty games have log loss **2.55249**, versus **3.45841**
for uniform legal-move choice. Full-game contextual quality CRPS is **3.56770**.
These are prediction/distribution checks, not proof of a uniquely correct display
percentage or true game rating. The small development cohort and short-game
extrapolation limit interpretation. `public/validation.json` records the frozen
assessment; `public/manifest.json` declares definitions and artifact hashes.

Repository tests also replay the actual review scorer against all published
player-side accuracy values and verify engine restriction, cold reset, WDL,
cache/settings migration, mate handling and annotation independence.
