# E014: joint consistency screen fails; SF19 partial gain

2026-10-05. [The plan](plan.md) freezes one restricted-chosen-move candidate,
four separate engine/budget comparisons, practical/paired-interval gates and
coverage/near-best/stability/resource guardrails. It uses the complete prior
40 SF18 and 45 SF19 development cases; no new searches or confirmation labels.

Five authored tests pass: helpful/worse/missed-choice examples, strict near-best
boundary, mate/node/recovery semantics, query/coverage/history/PV/raw tampering,
independently computed full-panel arithmetic/gates with forged-report rejection,
and dataset-local partition/identity checks. The CLI syntax check caught an extra parenthesis before data access;
corrected before any freeze or assessment. `verify:source` passes.

Previous E013 work is completed and locally committed. Accuracy, rating and
human category validity remain open; B000 scoring is unchanged.

Before candidate evaluation, the initial unregistered combined freeze was
replaced by dataset-local SF18/SF19 freeze/report files: the provenance checker
requires per-game references and parent chains within their own dataset. The
initial zero-assessment freeze is retained only under ignored
`research/runs/E014/pre-partition/`. Metrics, cohort, candidate and gates are
unchanged. There is no mixed-dataset origin-check bypass or raw-data duplication.

The two guarded freezes were completed with zero candidate assessments and
committed with candidate code before the single cached comparison.

## Single frozen assessment

Plan `de22e91` and code/input freeze `4a89e30` precede the one candidate
assessment. The evaluator is terminal, exit 0. All 85 games and both requested
budgets are covered; no fitting, searches or human labels. Separate engine
reports retain all per-game comparisons and unchanged cohort roles.

**Joint operational gates fail.** SF19 meets both numerical improvement gates
at both budgets, but its stability gate fails. SF18 misses the numerical gates
at both budgets, plus both mean-drift and stable-fraction guardrails. Coverage,
false-near-best and intended query-count guards pass in all four panels.

| Engine / nodes | Mean baseline error | Mean candidate error | Paired gain | 98.75% paired interval | Relative reduction |
| --- | ---: | ---: | ---: | --- | ---: |
| SF18 / 20k | .0059375 | .0188000 | -.0128625 | [-.0487875, .0071375] | -216.63% |
| SF18 / 80k | .0036750 | .0063500 | -.0026750 | [-.0164500, .0040500] | -72.79% |
| SF19 / 20k | .0111222 | .0013444 | .0097778 | [.0000333, .0297778] | 87.91% |
| SF19 / 80k | .0101222 | .0047556 | .0053667 | [.0008000, .0143000] | 53.02% |

Errors are engine-WDL expected-point loss differences against each budget's
complete restricted alternatives, not accuracy percentage points. Paired
10,000-replicate intervals are conditional development estimates; engines have
different cohort selection and are not a paired cross-engine comparison.

SF18 candidate low/high loss drift <= .05 holds for 35/40 (87.5%, Wilson lower
73.8879%); SF19 for 38/45 (84.4444%, lower 71.2161%). Both miss the >=90% / >=80%
gate. Mean drift baseline/candidate is .0158875/.0275000 for SF18 (increase
.0116125 exceeds .01), and .0161111/.0211222 for SF19 (increase .0050111 passes).

SF18 near-best agreement baseline/candidate is 40/39 at 20k and 40/40 at 80k;
SF19 is 43/44 and 40/43. Candidate false near-best counts are 1/0 for SF18 and
1/2 for SF19, versus baseline 0/0 and 1/4. The chosen restricted move still
falls below the all-legal maximum in SF18 9/5 cases and SF19 7/6 cases.

Intended candidate/baseline query counts total 97/80 and 99/80 for SF18, 117/90
and 115/90 for SF19 (about 21–30% additional queries in these fixed samples).
Including observed recovery requests gives 98/81, 102/83, 119/92 and 118/93.
These are counterfactual counts from retained searches, not measured deployed
latency. No actual new searches occurred. Earlier exact-score diagnostics and
finite-search misses are retained, rather than silently replaced.

## Interpretation and resume

Do not adopt this as a universal root-pair repair. Preserve the narrower SF19
consistency gain and its failed stability guard together. SF18's failure and
both exposed development samples rule out a general grading claim. A later
method needs a changed premise, broader fresh positions and actual cost/target
validation, rather than cherry-picking the successful engine or subgroup.

Source inspection also clarifies the motivation: E012/E013's raw root-pair
diagnostic lacks the `top` zero-loss exception used by published move scoring.
E014's baseline includes that exception. Thus the earlier diagnostic mismatch
does not establish an error in published grading; even this WDL comparison is
distinct from the published CP/human-outcome curves.

Exact replay and independent raw-WDL/mate equations, confusions, distributions,
paired intervals and gates pass for all 85 source-bound games / 170 budget
comparisons. The two reports were committed before this verification.

The first external archive be9d58432598db7c3dd148f222ae851321f0acd2 stopped
at the shared source byte check, before candidate replay. Three maintained
calibration sources have differing mixed CRLF/LF representation in checkout
and archive, with identical text after newline normalization. Keep the failed
receipt. A research-only replay binding records archive, checkout and canonical
LF digests plus the exact CRLF line ranges; it reconstructs the recorded bytes
without accepting source edits. Two authored newline/tampering tests pass.
Scoring code, queries, reports, seeds and gates remain unchanged. Fresh external
archive bb87254869e086f4b00e74f2fc915af1b444273c passes exact and independent
replay for all 85 games / 170 comparisons, with no Git metadata, dependencies,
network, ignored inputs, new searches or fits. Archive SHA
441848097d3ac181b612b2fa7ed9fdb0aac462b2e635ef3dce494d9288714da0. The three original
checkout source byte hashes are reconstructible from their registered newline
bindings; source text edits are rejected. Both blinded packs remain fixed.

```sh
node --test research/experiments/E014-root-pair-consistency/code/study.test.mjs
node research/experiments/E014-root-pair-consistency/code/run.mjs verify --out research/runs/E014/replay
```

## Completed verification and next action

All seven authored checks (five study, two source-replay) pass; source verifier
and local-link checks pass. The scorer and verifier are terminal, as are both
clean-replay attempts. All frozen inputs, per-engine reports, run/verification
receipts, newline bindings, first failure and final archive receipts are
registered under their own dataset.

Evidence by engine: [SF18 freeze](evidence/freeze-SF18.json),
[SF19 freeze](evidence/freeze-SF19.json), [SF18 report](evidence/results-SF18.json),
[SF19 report](evidence/results-SF19.json), [SF18 run](evidence/run-SF18.json),
[SF19 run](evidence/run-SF19.json), [SF18 verification](evidence/verification-SF18.json),
[SF19 verification](evidence/verification-SF19.json),
[SF18 clean replay](evidence/clean-replay-SF18.json),
[SF19 clean replay](evidence/clean-replay-SF19.json),
[SF18 archive recipe](evidence/clean-archive-SF18.json),
[SF19 archive recipe](evidence/clean-archive-SF19.json),
[SF18 original failure](evidence/failed-clean-replay-SF18.json),
[SF19 original failure](evidence/failed-clean-replay-SF19.json),
[SF18 newline bindings](evidence/source-line-endings-SF18.json),
[SF19 newline bindings](evidence/source-line-endings-SF19.json).

Finding: [F012](../../findings/F012-root-pair-consistency.md). Next register a
rating-conditioned choice likelihood study on cached development choices.
Distinct premise: peer choice prediction rather than F004 outcome interactions
or F002 moves-only rating features. It cannot by itself validate final estimated
rating/adjustment. Human packs remain pending, no promotion is proposed, and
the broad research goal remains active with published scoring at B000.
