# F013: no resolved rating-conditioned choice gain

2026-10-05. Outcome: **inconclusive benefit; primary development gates fail**.
Source: [E015](../experiments/E015-rating-choice-context/RESULT.md).
Development evidence only; no confirmed model or promotion.

The fixed candidate uses recorded Lichess blitz rating to make legal-choice
temperature increase affinely, keeping absolute SF19 CP utilities fixed at
the published .368208 curve. Ratings are context for the played-move target,
not a rating target/predictor tautology. This differs from prior outcome-context
interactions and moves-only rating regressions; it does not estimate latent
strength or validate a final rating adjustment.

Plan `9925e26`, code/source/fold freeze `1b63e37`, models `6e32fdc` and report
`bdaeff5` preserve the preregistered sequence. All six global/candidate pairs
(five training folds plus final) converge and satisfy independent optimality
checks. Final global beta 15.464491662877617; candidate betaLow 0 and
delta/betaHigh 32.59543170030444 between anchors [100,3000]. The permitted
lower-endpoint constraint is active; no upper-cap fit or rating clipping.

| Comparison | Games | Mean gain, nats / choice | 97.5% paired-game interval |
| --- | ---: | ---: | --- |
| Development global minus candidate | 150 | .00114922 | [-.04383280, .04243666] |
| Omitted-fold global minus candidate | 450 | .02316114 | [-.02401839, .07449177] |
| Development uniform minus candidate | 150 | 1.03572331 | [.77762645, 1.28751150] |

The development gain misses .02 and its interval includes zero: both primary
gates fail. Cross-fit's nonnegative mean guard passes, but its interval also
includes zero and conditions on overlapping fits. Predictive value versus
uniform does not establish incremental value of rating context over global.
Coverage, numerical and sufficiently large subgroup harm guards pass; sparse
group validity remains unresolved. No rescue refit, changed threshold or case
replacement follows the failed screen.

In the secondary 45-game cached 20k/80k diagnostic, mean probability-vector TV
is .08378902 global and .09061219 candidate. Paired reduction -.00682316 has
interval [-.01454019,.00020554]. TV <= .1 counts are 28/45 and 26/45, with
Wilson lower bounds 47.6299% and 43.3008%. This was not a primary gate; it
remains an operational limitation. The subset includes 30 training games and
15 development games and cannot supply fresh model confirmation.

Exact twelve-model refitting, all 600 prediction vectors/reports, independent
raw CP/mate utilities, likelihoods, KKT supporting inequalities, fold ownership,
40,000 bootstrap replicates and 45 stability pairs verify. External archive
replay passes without Git metadata, ignored inputs, new dependencies, network
or engine searches. Source newline representations were recorded before
fitting and reconstruct the exact run's checkout bytes; source text edits fail.
Verification refits reproduce the fixed recipe, not additional candidate trials.

D002 is an exposed archive-prefix convenience cohort with absent provisional
status and one focal decision per game. All-legal engine alternatives are
required; reuse of cached searches does not prove deployable latency. No
single-game Elo, displayed accuracy, percentage scale, final rating adjustment,
human category rule or future population claim follows. D002's consumed test
games retain their old role and do not confirm revised candidates.

[Models](../experiments/E015-rating-choice-context/evidence/models.json),
[result](../experiments/E015-rating-choice-context/evidence/results.json),
[predictions](../experiments/E015-rating-choice-context/evidence/predictions.json.gz),
[verification](../experiments/E015-rating-choice-context/evidence/verification.json),
[clean replay](../experiments/E015-rating-choice-context/evidence/clean-replay.json)
and [archive recipe](../experiments/E015-rating-choice-context/evidence/clean-archive.json)
retain the source/code/folds/parameters/roles/gates and output hashes.

Stop this exact monotone rating-temperature recipe rather than claiming rating
can never help or the models are equivalent. A distinct next hypothesis is
whether choice utility should depend on the position's relative CP alternatives
rather than an absolute outcome-probability mapping. Review the relevant source
literature and preregister that comparison before fitting. Fresh confirmation
is still required for any eventual shortlist; both human packs remain pending.

Development global/candidate mean NLL is 2.39040465 / 2.38925543; cross-fit
2.44233009 / 2.41916895. Development low/high fixed-point groups (11/18) and
low/high rating groups (18/23) are sparse; all cross-fit groups have >=30 games.
Worst sufficiently large subgroup gains -.02184263 / -.02794844 remain within
the -.05 harm guard. Archive revision bdaeff5ce6ee8b2f8c3e07195394048060a4fbe6
and SHA fed818aaa7269ea03f0795f9b37c800d7e001f42d974b0f0620d805c6ed2365a bind clean replay.
