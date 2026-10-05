# F009: fresh outcome confirmation does not establish the CP improvement

2026-10-05. Outcome: **inconclusive improvement; frozen joint gates fail**.
Source: [E011](../experiments/E011-outcome-confirmation/RESULT.md).
The untouched confirmation-stage comparison is numerically verified; the
candidate is **not confirmed** and has no promotion. B000 remains unchanged.

E008's development gain motivated one unchanged scalar curve:
sigmoid(0.22349935786891822*cp/100), compared with the fixed0.368208 curve and
constant0.5. Protocol52c0507, codea7a7cad, curve/exposure88f9f63 and complete
rawca423dd all precede the single assessment. Curve-object SHA
`8d3ed05dece6845e8d22ce2a3aa839dc72969e6fb506b974342e6841a30e4c9f`.
No new fits, temperatures, choice models, searches during assessment or interim
target looks. The retained collection took~664 seconds and3,945 requests.

D002's300 reserved, player/game-disjoint standard blitz games contribute1,881
roots at the declared plies, scored at20k/80k SF19 nodes with full history/cold
reset. Exclude the42-root mate union from every model/budget; all300 games
remain covered. Each game has unit weight across its retained roots.

| Budget | Fixed / candidate NLL | Gain;97.5% paired game interval | Fixed / candidate Brier |
| --- | --- | --- | --- |
|20k |0.63306913 /0.62388657 |0.00918256;[-0.00588711,0.02626744] |0.20874236 /0.20652677 |
|80k |0.63298709 /0.62197537 |0.01101172;[-0.00408620,0.02841520] |0.20815658 /0.20567058 |

The20k practical0.01 gate fails; both fixed-comparator positive-lower-bound
gates fail. Both candidate Brier scores improve. The candidate beats constant
0.5 by0.06926061 [0.04261867,0.09492159] and0.07117181
[0.04387699,0.09759212], passing that comparison. Predictive value against an
uninformative baseline does not establish the required gain over the fixed curve.

Candidate maximum root-point drift per game is<=0.05 in267/300 games (89%,
95% Wilson lower84.9544%). The90% point gate fails; the80% lower-bound gate
passes. Largest root drift0.26140446. E010's45 focal roots passing tolerance
did not establish stability across the full prespecified panel. All nine groups
have>=30 games and pass the declared point guardrails at both budgets; these
guards do not prove universal subgroup improvements.

Exact offline replay, independent equations and a clean external Git archive
reproduce all11,286 predictions,300 game-weight checks, four10,000-resample
paired intervals, subgroup checks and joint gates. The numerical checks pass
with zero searches/fits/network; the scientific gates remain failed. Registered
[verification](../experiments/E011-outcome-confirmation/evidence/verification.json),
[clean replay](../experiments/E011-outcome-confirmation/evidence/clean-replay.json)
and [archive recipe](../experiments/E011-outcome-confirmation/evidence/clean-archive.json)
bind code, source, engine, data, curve and output hashes.

The smaller point gain than development is observed, but overlapping intervals
do not establish a particular cause, equivalence or deterioration. Do not relax
the gates or refit/rescue the candidate on these consumed test games. Further
confirmation of revised candidates requires a fresh registered cohort.

The scope is expected human game points at CP-scored roots. Fractional likelihood
does not identify W/D/L probabilities or causal move values. Prefix convenience
sampling, absent provisional-rating status, mate exclusion and search-budget
conditions remain. No SF18, displayed accuracy/aggregation, rating, brilliance
or instructional claim follows. Preserve F006's development gain and F007/F008/
F009's failures together; continue with a distinct registered hypothesis.
