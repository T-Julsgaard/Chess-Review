# F002: five nonlinear rating features give too little benefit to adopt

2026-10-05; moves-only rating; outcome no-improvement under a practical gate;
evidence maturity development.

[E002](../experiments/E002-nonlinear-rating/RESULT.md) tested a fixed five-feature
extension using nested player-disjoint folds and engine-specific retained data.
The game-weighted MAE gains over refitted current recipes were SF18 4.491 rating
units (97.5% interval 1.528-7.377) and SF19 3.471 (0.079-6.906). Both missed the
predeclared 25-unit requirement despite small positive development intervals.
The comparison against a retuned current model supports a small feature effect,
not a useful-enough improvement for adoption under this plan.

All numerical runs reproduced exactly on identical inputs. No fresh confirmation
set was used. The target was recorded public blitz rating, not actual strength,
FIDE Elo or a validated game-performance scale. Coverage and stated deterioration
guards passed; the SF19 highest-rating subgroup remains too small for its guard.

Decision: stop this exact polynomial family; no promotion. A retry needs new
theory or richer evidence, not more tuning on the same outer predictions. The
large rating-band errors motivate separately testing richer opportunity-aware
information and calibrated uncertainty. They do not prove that de-shrinking
point estimates will help.
