# D002: fresh traceable prefix cohort

Acquisition/verification: [E007 result](../../experiments/E007-fresh-evidence/RESULT.md).
Admitted under the shared guard. 900 player-disjoint standard blitz games from
approved CC0 June/July/August2026 archive prefixes:450 train,150 development
validation,300 reserved evaluation. 1,800 distinct lowercase identities; no D001
game/player overlap. No new source or license is assumed.

Archive-prefix sampling is a restricted convenience population. Eligibility,
complete raw-to-normalized lineage and fresh scientific confirmation are separate
requirements. E008 fitted development curves; F006 records its limited gain.
No promotion has been made on this data.
Numeric recorded ratings are retained, but provisional status is unavailable;
do not describe this as established strength or a nonprovisional-only cohort.

## Files and admission

[manifest.json](manifest.json) binds every artifact and dependency. Raw standard
frames are in `raw/`; [sources.json](sources.json) retains exact export requests,
ranges, 12-byte leading metadata and compressed/decoded hashes. `games.json.gz`
contains full normalized histories and per-game raw PGN byte locators;
[exclusions.json](exclusions.json) binds the excluded D001 identities. Selection
and split algorithms are frozen in `research/fresh-format.mjs` by manifest hash.
[run.json](run.json) records exact acquisition/transform revision and environment.

```sh
npm run research:preflight -- D001 D002 --purpose inspect
node research/experiments/E007-fresh-evidence/code/verify.mjs --out research/runs/E007/replay
```

Both IDs are required because admission verifies the D001 exclusion inputs.
Use `readJson()` for normalized/structured records and `readFrame()` for raw
decoded frames after opening the guard. The frozen pipeline is rebuilt on
admission; arbitrary file copies cannot establish eligible origins.

E011 activates the 300 reserved games for one frozen scalar CP outcome-curve
confirmation and a paired20k/80k root-search panel. Its committed protocol,
code and curve freeze precede searches. No choice model is included. Their
`test` role remains; after the assessment this cohort cannot provide fresh
confirmation for revised candidates. Before activation only structural parsing
and identity audit occurred. Append exposure below; renaming cannot undo it.

## Exposure ledger

| Date / record | Use | Restriction |
| --- | --- | --- |
| 2026-10-05 E007 registration | Source metadata/terms only | No new game acquired or model evaluated yet. |
| 2026-10-05 E007 complete | Raw retrieval, structural normalization, selection/identity/metadata audit and clean offline reconstruction | All labels parsed structurally; no engine/model evaluation, outcome summaries or manual case inspection. Reserved evaluation not activated. Provisional-status limitation retained. |
| 2026-10-05 E008 registration | 450 train /150 development validation games | SF19 outcome/legal-choice collection and frozen two-candidate screen;300 reserved games excluded from searches/fits. Results not inspected yet. |
| 2026-10-05 E008 development evaluation | 450 train fits /150 development metrics and shortlist | Fixed two-candidate screen: CP passes, WDL fails; development consumed.300 reserved games still excluded. No confirmation/adoption. |
| 2026-10-05 E009 collection |30 train /15 development games, score-blind hash selection | Reuse E00820k cache, collect80k operational stability reference; no human truth or additional candidate tuning. Reserved300 excluded. |
| 2026-10-05 E010 cached assessment | Same45 development games; exact E008/E009 queries | No new searches/fits or reserved access. Frozen CP choice-vector stability fails; focal root tolerance passes. |
| 2026-10-05 E011 activation |300 reserved `test` games, predeclared outcome roots at20k/80k | Plan52c0507 and codea7a7cad committed before activation; curve-only model is registered in manifest before collection. No refit, choice queries, interim target metrics or promotion. Complete raw evidence must be registered and committed before a single frozen assessment. |
| 2026-10-05 E011 first frozen assessment |300 test games,1,881 retained CP roots; paired game metrics at both budgets | Rawca423dd precedes scoring. Joint confirmation fails:20k practical gain, both fixed-comparator intervals and90% root-stability rate. No refit/search/choice assessment. Verification pending. This cohort is consumed; revised candidates/new rating or choice recipes need fresh confirmation evidence. |
| 2026-10-05 E011 verification | Exact, independent-equation and external clean replay of the saved first assessment | All numerical checks pass without new searches/fits or new candidate selection. Scientific joint gates remain failed; no confirmation or promotion. Test consumption remains in force. |
| 2026-10-05 E014 activation | All 45 E009 development focal cases (30 train / 15 validation), exact E008 20k and E009 80k queries | Plan de22e91 freezes one restricted-chosen-move candidate. Prior 600-game observation validator is reused for input binding; only the fixed 45 games enter new consistency metrics. No reserved predictions/target comparisons, outcome/rating fitting, human labels or new searches. |
| 2026-10-05 E014 first assessment | Same 45 fixed SF19 development games, both cached budgets | Code/freeze 4a89e30 precedes one assessment. Numerical consistency gains meet both gates at both budgets, but 38/45 stable misses the joint guard. Full coverage retained; verification pending. No reserved target evaluation or new searches/fits/human labels. |
| 2026-10-05 E014 verification | Exact/independent equations and external clean replay, dataset-local retained reports | All 85 games / 170 budget comparisons verify jointly. First archive source-byte mismatch retained; exact mixed-EOL checkout reconstruction proves representation-only changes. Fresh clean archive passes; no new searches/fits/human labels or reserved target use. Joint operational gates remain failed. |
| 2026-10-05 E015 activation | All 600 E008 focal choices (450 train / 150 exposed development) plus fixed 45 E009 budget pairs | Plan 9925e26 freezes monotone rating-conditioned temperature, exact global/uniform comparators, five 90-game training folds and held-development gates. Recorded rating is choice context, not the target. Register/commit source/code/folds before twelve fits; no reserved targets, new searches or human labels. |
| 2026-10-05 E015 fitting | Final 450-game train pair plus five 360-game training-only pairs | Code/freeze 1b63e37 precedes twelve converged prescribed fits. Objective/KKT checks use fitting rows only; raw utility/source validation covers all declared inputs. No upper-cap optimum, rating clipping, candidate development/OOF performance assessment, new searches or human labels. Models are registered/committed before evaluation. |
| 2026-10-05 E015 first performance assessment | Frozen 450 cross-fit / 150 development choices and 45 budget pairs | Trained models 6e32fdc precede the one look. Development gain .001149 nats misses .02 and interval includes zero; other coverage/numerical/subgroup guards pass with sparse groups unresolved. Candidate mean vector drift increases. No reserved target evaluation, new fits/searches or human labels; independent/clean verification pending. |
| 2026-10-05 E015 verification | Exact refit/report/predictions, independent raw-score equations and clean archive | Twelve models reproduce; 600 vectors, five folds, twelve optimality checks, 45 budget pairs and 40,000 bootstrap replicates verify. Source representations recorded before fitting bind archive equivalence. Initial twelve fits plus deterministic verification refits are reproduction only; no new candidate trials/searches/human labels/reserved targets. Primary gates remain failed. |
| 2026-10-05 E016 activation | All 600 E008 focal choices (450 train / 150 exposed validation), fixed 45 E009 budget pairs | Plan 5aa7e82 freezes one linear CP utility, sigmoid/global and uniform comparators, mate/cap handling, reused label-independent E015 folds, primary gates and calibration/stability diagnostics. Guarded sources and exact source representations are bound before twelve scalar fits. No reserved target assessment, new searches or human labels; no recorded-rating model input. |
| 2026-10-05 E016 fitting | Final 450 training choices and five 360-game training folds | Source/cohort freeze 396566b precedes twelve converged scalar fits. Independent train-only objectives and derivatives pass; no active upper cap. Models are retained before any omitted-fold/development performance comparison. No new searches, human labels or consumed test targets. |
| 2026-10-05 E016 first performance assessment | Frozen 450 cross-fit / 150 validation choices, 45 budget pairs | Models 24d724c precede the single look. Linear CP choice utility loses .366494 nats against sigmoid on development (97.5% interval wholly below zero), fails cross-fit/subgroup gates, but beats uniform and has lower vector drift. Independent/clean verification pending; no refit/new searches/human labels/consumed test targets. |
| 2026-10-05 E016 verification | Exact refits/report/vectors, independent raw-score/calibration equations and external archive | Twelve fits, 600 choice vectors, 45 budget pairs and 40,000 bootstrap replicates verify in checkout and archive 1d381837aba976aa83c69faa96927da68f73dcb0. All negative gates and descriptive calibration failures remain. Verification refits reproduce the fixed candidate; no new trials, searches, human labels or consumed test targets. |
