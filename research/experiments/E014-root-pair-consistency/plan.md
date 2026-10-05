# E014: restricted chosen-move consistency

Registered 2026-10-05, before this comparison is evaluated. Development only.

## Question and fixed candidate

Does re-searching the unrestricted engine's final chosen move under the same
single-move restriction used for the played move improve numerical consistency?
E013 exposed differing near-best decisions from unrestricted-root versus
all-restricted comparisons. This motivates a distinct observation method; it
does not rescue E011's failed curve or establish human quality.

For each position and node budget, let `u` be unrestricted-root WDL points,
`b` its final bestmove, `p` the restricted played-move points, `r(b)` the
restricted bestmove points, and `m = max(all restricted points)`. WDL points are
`(win + draw/2)/1000`, with positive/negative mates mapped to 1/0. All scores
are from the mover's perspective. No learned CP curve crosses engine versions.

- Baseline loss: zero when `b` is played; otherwise `max(0, u - p)`.
- Candidate loss: `max(0, r(b) - p)`, including when `b` is played.
- Finite-search reference loss: `max(0, m - p)`.
- Error: absolute difference from that reference loss. The reference is a
  conditional engine consistency target, not independent tactical/human truth.

There is one candidate, no fitted parameters, alternate restrictions, budget
changes, case replacements or post-result threshold search. Root bestmove must
belong to the exact complete legal list. Missing/changed observations invalidate
the assessment rather than reduce its denominator. Earlier selected exact
scores and recovery searches remain visible; equal requested budgets do not
guarantee equal score-bearing nodes or converged evaluations.

## Frozen cohorts and exposure

Reuse all 24 E012 and all 16 E013 SF18 cases (40 distinct D001 training games),
and all 45 E009 SF19 cases (30 D002 training, 15 development/validation games).
SF19 low-budget rows come from the exact E008 20k panel and high-budget rows
from E009 80k. SF18 panels retain their exact 20k/80k policies. Each game has
one focal decision. Cohorts must be disjoint and retain their original roles.
No D002 reserved/test observation or outcome/rating target enters this study.

Prior results on these cases are exposed development evidence. E012/E013 are
enriched move-review samples; SF19's deterministic focal sample has a different
selection. Assess engines separately; do not pool effects or call a development
screen fresh confirmation. Both public-data registrations and all frozen raw
query/hash/history/PV/config bindings must pass admission. Retain the exact
parent artifact hashes in a registered freeze record before evaluation.

## Primary comparison and stopping decision

For each of four engine/budget panels, use one equally weighted error per game.
Primary improvement is mean baseline error minus mean candidate error. All four
panels must meet both gates for an operational improvement finding:

1. Mean error reduction is at least 25% of baseline mean error; baseline error
   must be positive (a zero comparator makes this gate inconclusive).
2. Paired-game bootstrap percentile lower bound is strictly positive. Use
   10,000 replicates, deterministic LCG seeds 20261051–20261054 in order SF18
   20k, SF18 80k, SF19 20k, SF19 80k. Each interval has level 98.75%, using
   sorted indices `floor(.00625*(B-1))`, `floor(.99375*(B-1))`. This supplies
   a Bonferroni conservative four-comparison family; it remains an approximate
   development bootstrap, conditional on these samples and finite searches.

Guardrails, also required:

- Complete 40/45 game coverage at both budgets; no exclusions or fallback.
- Candidate false near-best fraction (candidate loss < .02, reference loss
  >= .02) may exceed baseline by at most .025 in each panel.
- Mean absolute low/high loss drift may exceed baseline by at most .01 per
  engine. Candidate drift <= .05 must occur for at least 90% of games and its
  Wilson 95% lower bound must be >= 80%, separately per engine.
- Intended ordinary query workload is at most 3 distinct queries per position
  versus 2 for baseline, collapsing duplicates when bestmove equals played.
  Recovery requests are counted separately; cached replay measures no deployed
  latency. The additional chosen-move restriction must have the same config,
  reset, history and node budget. No claim of measured runtime improvement.

Record all counts, error distributions, paired intervals, near-best confusion,
negative residuals/clamps, chosen restricted move below the all-legal maximum,
root bestmove changes, mate presence, exact-score node ranges and recovery
counts. Report SF18 E012/E013 and SF19 train/dev subgroups descriptively, without
selection/gates on sparse subgroups. Four fixed primary comparisons, one look.

## Verification, resources and interpretation

Use the guarded loader for all inputs. Register/commit candidate code and the
source-bound freeze before assessment. Synthetic tests must distinguish a
useful repair, a worse repair, missed alternative when root chooses played,
mate mappings, threshold boundaries and exact/cohort tampering. Verify saved
results by exact replay and independently derived per-query arithmetic,
confusions, intervals and gates, then replay from an external Git archive with
no ignored inputs, Git metadata, new dependencies, network or searches.

Budget: zero new engine searches/fits/human labels; reuse existing observations.
Cap scoring at 2 minutes excluding guarded dataset reconstruction, retained
study reports at 1 MiB, and dependencies at the existing Node.js runtime. Do
not copy large parent raw files into this experiment. Existing public source
eligibility is offline evidence for retained bytes, not new acquisition.

If all gates pass, the supported claim is better conditional engine consistency
on these development panels. If practical/uncertainty gates fail, preserve
partial effects and uncertainty; do not adopt, refit or drop cases. Any promising
method needs fresh broader positions, target validation and actual cost evidence
before changing accuracy, ratings or categories. Human review packs remain fixed
and pending. No extension scoring change or promotion follows automatically.
