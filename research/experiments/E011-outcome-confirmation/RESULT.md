# E011: verified frozen confirmation fails

2026-10-05. Frozen scalar CP outcome confirmation and20k/80k root-budget panel.
The choice model remains unresolved after E010. This does not close the broader
accuracy/display/rating/category research tracks. The extension stays B000.

Codea7a7cad is committed before reserved collection. Four authored mechanics
tests pass: exact freeze, paired roles/history/budgets/legal PVs, mate-union
exclusion, and independent target/metric/interval/subgroup tampering checks.
`verify:source` passes. Both datasets pass the public-data admission guard.
The starting-position synthetic smoke passed at both budgets; it is not human
evidence. Estimated collection10–15min; hard caps45min/6000 requests/7MiB.

The curve-only freeze and exposure ledger are committed in88f9f63 before
searches. The one collector completed300 games:3,834 distinct queries,
3,945 engine requests,29 cache/repeated-key reuses,887,825 compressed bytes,
approximately664 seconds. All are within the frozen caps. The complete raw
panel and collection receipt are registered; full query/history/score/PV/budget
bindings are checked before commit. No fits or choice searches; zero interim
target assessments. Raw evidence was committed inca423dd before the single
frozen assessment. The assessment is terminal (exit0) and uses no searches/fits.

## Frozen result

**Inconclusive improvement; joint gates fail. No confirmed curve or promotion.**
Both curves/budgets cover300 games and1,881 CP roots. The42-root mate union is
excluded for all models (39 at20k,42 at80k). All games retain CP observations.
Game-weighted scores and97.5% paired10,000-resample game intervals:

| Budget | Fixed NLL | Candidate NLL | Candidate gain [interval] | Fixed / candidate Brier |
| --- | --- | --- | --- | --- |
|20k |0.63306913 |0.62388657 |0.00918256 [-0.00588711,0.02626744] |0.20874236 /0.20652677 |
|80k |0.63298709 |0.62197537 |0.01101172 [-0.00408620,0.02841520] |0.20815658 /0.20567058 |

The20k practical0.01 gate fails; both positive-lower-bound gates fail. Brier is
better at both budgets. Candidate NLL gains versus constant0.5 are0.06926061
[0.04261867,0.09492159] and0.07117181 [0.04387699,0.09759212]; both pass. This
does not establish the candidate's required improvement over the fixed curve.

Maximum candidate root-point drift is<=0.05 in267/300 games (89%; Wilson95%
lower84.9544%); the90% point gate fails despite the80% lower-bound gate passing.
The largest root drift is0.26140446. Focal-root stability in E010 therefore does
not establish full-panel stability. All nine predeclared subgroups have>=30
games and pass their guards at both budgets. Rating groups have42/228/47 games;
root-defined groups can overlap within a game. There are no sparse groups here.

The point gain is smaller than development; overlapping intervals do not prove
a particular cause or equivalence. Preserve the development finding and this
failed confirmation together. Do not relax thresholds, refit or rescue the
candidate on the consumed reserved cohort. Unknown provisional status and
prefix-convenience sampling remain. No SF18, displayed accuracy, causal move
value, rating, category or instructional validity claim follows.

## Verification and resume

Results/run were committed in4e3f753 before verification. Exact replay and
independent equations pass for11,286 predictions,300 game-unit weights, four
10,000-resample intervals, subgroup checks and joint gates. Clean replay from
external Git archive4e3f7532c20f9e64a254e5022f6fb4f29482dce3 also passes,
without Git metadata, dependencies, network, ignored inputs or new searches.
Archive SHA61d12fc976ca4e285408d577a5bba6804a3ed1883b264b763a2c216810300bc5.
The numerical checks do not turn scientific gate failures into a pass.

Evidence: [frozen curves](evidence/models.json), [raw panel](evidence/sf19-observations.json.gz),
[collection receipt](evidence/collection-run.json), [result](evidence/results.json),
[assessment receipt](evidence/run.json), [verification](evidence/verification.json),
[clean replay](evidence/clean-replay.json), [archive recipe](evidence/clean-archive.json).
All are registered in D002's manifest. Durable raw cache remains in
`research/runs/E011/`; collector/assessment/verification/replay are terminal.

```sh
node --test research/experiments/E011-outcome-confirmation/code/method.test.mjs
node research/experiments/E011-outcome-confirmation/code/verify.mjs --out research/runs/E011/replay
```

Completed finding: [F009](../../findings/F009-unconfirmed-outcome-curve.md).
Do not rerun collection or retune this candidate on consumed confirmation data.
Next: register a distinct tactical-property audit of the existing blinded
category pack; independent human annotation remains pending. The broader
research goal stays active, and no runtime implementation is selected.
