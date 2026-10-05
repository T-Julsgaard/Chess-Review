# Research index

Updated: 2026-10-05. Six studies/tasks complete; fresh cohort verified; human reviews pending.
Baseline: [B000](BASELINE.md). No new improvement has been established.

This is the routing and decision index. Detailed evidence lives in linked
records. Update a row and the active experiment's resume state when work stops.

## Registers

| ID | Question / record | State | Outcome / evidence | Next action |
| --- | --- | --- | --- | --- |
| B000 | [Starting extension baseline](BASELINE.md) | Reproduced | Offline replay passes; no fresh confirmation | Use frozen recipe as comparator |
| D001 | [Public baseline evidence](datasets/D001-public-baseline/README.md) | registered | Training/development evidence; at least fifty consumed test games | Append reuse before each evaluation |
| E001 | [Evidence and exposure audit](experiments/E001-evidence-audit/RESULT.md) | complete | Integrity gates pass; no model evaluated | Numerical development study |
| F001 | [Evidence and exposure finding](findings/F001-evidence-and-exposure.md) | recorded | Development use supported; confirmation requires fresh evidence | Preserve exposure history |
| E002 | [Nonlinear rating features](experiments/E002-nonlinear-rating/RESULT.md) | complete | Small development gains; practical gate fails for both engines | Stop this family; investigate richer evidence/uncertainty |
| F002 | [Nonlinear rating finding](findings/F002-small-nonlinear-rating.md) | recorded | No promotion; numerical replay matches | Retry only with a new hypothesis |
| E003 | [SF19 archive replay](experiments/E003-sf19-archive-replay/RESULT.md) | complete | Exact old models/reports reproduce; both original joint gates failed | New hypothesis and richer evidence |
| F003 | [Small-cohort SF19 finding](findings/F003-sf19-small-cohort.md) | recorded | Narrow choice gain; joint outcome and later choice gates unresolved | No promotion of these recipes |
| E004 | [Practical outcome calibration](experiments/E004-practical-outcomes/RESULT.md) | complete | Both engines miss practical gate; most small gain comes from static context | Stop this interaction family |
| F004 | [Practical context finding](findings/F004-practical-outcome-context.md) | recorded | Added phase/strength benefit unresolved; no promotion | Investigate distinct questions |
| E005 | [Blinded category workflow](experiments/E005-category-review/RESULT.md) | running | 24 legal, traceable cases; workflow checks pass; zero reviews | Review later; numerical work continues |
| E006 | [Rating uncertainty](experiments/E006-rating-uncertainty/RESULT.md) | complete | About90% game coverage needs broad ranges; adaptive scale fails gates | Stop this scale family |
| F005 | [Single-game rating ranges](findings/F005-single-game-rating-ranges.md) | recorded | No ±300 cases; stronger-player conditional coverage fails/unresolved | Fresh evidence and distinct hypotheses |
| E007 | [Fresh evidence pipeline](experiments/E007-fresh-evidence/RESULT.md) | complete | Exact clean reconstruction; provisional status unavailable | Distinct calibration hypothesis |
| D002 | [Fresh prefix cohort](datasets/D002-fresh-prefix/README.md) | registered | 900 disjoint games 450/150/300; reserved evaluation not activated | Guarded development use after protocol |
| E008 | [Human quality curves](experiments/E008-human-quality-curves/plan.md) | planned | SF19 fixed CP versus CP-refit/WDL curves; joint outcome and choice gates | Frozen train/development collection |

No promotion records yet.
Allocate the next unused ID in each series: `E009`, `D003`, `F006`, `P001`.
Use relative links here; append rows rather than reusing IDs.

Experiment states: `planned`, `running`, `complete`, `blocked`.
Completed outcomes: `improved`, `no-improvement`, `inconclusive`, `invalid`.
Evidence maturity: `exploratory`, `development`, `confirmed` (see the protocol).
Promotion states: `proposed`, `deferred`, `rejected`, `accepted`, `implemented`.
A positive experiment and an adoption decision are separate records.

## Backlog, in priority order

These are research questions, not registered hypotheses or claims of success.
The first goal should turn the relevant question into a dated experiment plan.

| Priority | Track | Question and needed evidence |
| --- | --- | --- |
| 1 | Measurement and datasets | Define what an accuracy percentage, a single-game performance rating and each label should mean. Choose falsifiable targets, metrics, meaningful effect thresholds and fresh split ownership before candidate fitting. Inventory existing data reuse and collection cost. |
| 2 | Accuracy | Which outcome/choice models and aggregation rules improve predictive validity and robustness to easy moves, game length and search noise? Assess SF18 and SF19 separately, and justify the displayed scale beyond engine agreement. |
| 3 | Moves-only rating | Can rating-level prediction improve over current regressions and simple training-only baselines, with calibrated uncertainty, player-disjoint evaluation and useful coverage? Specify platform, rating pool and time control. |
| 4 | Contextual rating | Does conditioning on recorded rating provide useful information beyond retaining that rating? Separate peer-quality distribution prediction from evidence for the final rating adjustment. |
| 5 | Move categories | Can loss bands and special annotations better support understandable, defensible explanations? Define our label rubric, acquire blinded independent reviews, report disagreement and test rare classes as well as ordinary moves. |

Cross-cutting checks: mate and forced moves, history/setup positions, openings,
short games, rating/skill bands, time controls, winning/lost positions, engine
stability, latency, unavailable evidence and fallback behavior.

## Next session

Before any research goal starts/resumes or game data is used, follow
[DATA_POLICY.md](DATA_POLICY.md) and run
`npm run research:preflight -- D001 --purpose inspect` (use actual dataset IDs).
Only registered explicitly public, free-to-use sources and traceable derivatives
qualify. New confirmation cohorts need complete acquisition/transform provenance;
D001's historical limitations and exposure remain in force.

Register a distinct human-outcome/legal-choice calibration hypothesis using
D002's development roles, then collect/cache its engine observations. Read E007's
source/target limitations and open both D001/D002 for admission. Freeze later
candidate/access rules before activating reserved evaluation; no new score is
confirmed by the pipeline's successful reconstruction.
E005 awaits later human reviews; pending annotation does not block this work.
Do not retry F002/F003/F004/F005 without a changed premise. No candidate is confirmed.
The research goal is active. The extension remains at B000.
