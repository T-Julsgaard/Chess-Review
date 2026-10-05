# Research index

Updated: 2026-10-05. Thirteen studies/tasks complete; root-pair joint gates fail; reviews pending.
Baseline: [B000](BASELINE.md). New CP gain is development evidence, not confirmed.

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
| E006 | [Rating uncertainty](experiments/E006-rating-uncertainty/RESULT.md) | complete | About 90% game coverage needs broad ranges; adaptive scale fails gates | Stop this scale family |
| F005 | [Single-game rating ranges](findings/F005-single-game-rating-ranges.md) | recorded | No ±300 cases; stronger-player conditional coverage fails/unresolved | Fresh evidence and distinct hypotheses |
| E007 | [Fresh evidence pipeline](experiments/E007-fresh-evidence/RESULT.md) | complete | Exact clean reconstruction; provisional status unavailable | Distinct calibration hypothesis |
| D002 | [Fresh prefix cohort](datasets/D002-fresh-prefix/README.md) | registered | 900 disjoint games 450/150/300; E011 activates reserved outcome panel | Preserve role and exposure ledger |
| E008 | [Human quality curves](experiments/E008-human-quality-curves/RESULT.md) | complete | CP passes joint development screen/replay; WDL fails;23,584 cached searches | Preserve gain alongside E010/E011 failures |
| F006 | [Fresh human curves](findings/F006-fresh-human-curves.md) | recorded | CP prediction gain at development maturity; no display/adoption claim | Read F009; unchanged candidate is not confirmed |
| E009 | [Search stability](experiments/E009-search-stability/RESULT.md) | complete | Verified overall failure: CP loss/display mean pass, WDL/rank fail | Distinct frozen-candidate probability stability study |
| F007 | [Search stability finding](findings/F007-search-stability.md) | recorded |45-game operational limits; independent/clean replay passes | Preserve failures; no exact-best/human validity claim |
| E010 | [Candidate probability stability](experiments/E010-candidate-stability/RESULT.md) | complete | Verified probability-vector gate failure; focal root-point tolerance passes | Separate frozen outcome confirmation; choice stability unresolved |
| F008 | [Candidate stability finding](findings/F008-candidate-probability-stability.md) | recorded | No distribution stability gain; exact/independent/clean replay passes | Preserve negative result; no bundled adoption |
| E011 | [Frozen outcome confirmation](experiments/E011-outcome-confirmation/RESULT.md) | complete | Verified joint failure:20k practical gain, both fixed intervals and root stability;300 test games consumed | Distinct hypothesis; no retuning/rescue on this cohort |
| F009 | [Unconfirmed outcome curve](findings/F009-unconfirmed-outcome-curve.md) | recorded | Small unresolved gain; predictive value vs constant; exact/independent/clean replay passes | Keep failed confirmation with development finding |
| E012 | [Offer-evidence audit](experiments/E012-offer-evidence/RESULT.md) | complete | Verified screen failure:0/8 supported; 21/24 stable; 822 alternatives per budget | Register net-offer review selection; retain original pack |
| F010 | [Offer-selection evidence](findings/F010-offer-selection-evidence.md) | recorded | Capture heuristic insufficient; root gaps do not change focal near-best labels; clean replay passes | Improve evidence selection; no human category claim |
| E013 | [Net-offer review pack](experiments/E013-net-offer-pack/RESULT.md) | complete | Verified7/8 support, 15/16 stability;8 independent net-offer witnesses; separate blinded pack | Later human review; cached root-pair consistency study |
| F011 | [Net-offer enrichment](findings/F011-net-offer-enrichment.md) | recorded | Improved operational targeting; deterministic/independent/clean replay; no human category claim | Preserve both packs; investigate root-score consistency |

| E014 | [Root-pair consistency](experiments/E014-root-pair-consistency/RESULT.md) | complete | Verified joint failure: SF19 numerical gains, SF18 worse means; both stability gates fail | Distinct rating-conditioned choice hypothesis |

| F012 | [Root-pair consistency finding](findings/F012-root-pair-consistency.md) | recorded | SF19 conditional gains retain failed stability; SF18 worsens; no universal repair | Distinct contextual-choice hypothesis; no repair promotion |

| E015 | [Rating-conditioned choice](experiments/E015-rating-choice-context/RESULT.md) | running | Primary failure: .001149 nats < .02, interval includes zero; complete coverage | Commit reports; exact/independent/clean verification |

No promotion records yet.
Allocate the next unused ID in each series: `E016`, `D003`, `F013`, `P001`.
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

Read E014's compact RESULT and F012. Numerical SF19 gains coexist with failed
stability, while SF18's observed mean errors increase. Do not adopt a universal
root-pair repair. Its raw-motivation diagnostic omitted published top-move
zero-loss behavior; the tested baseline includes it. Both E005/E013 human packs
are fixed and pending; no synthetic/engine evidence supplies perception.

E015 registers the rating-conditioned legal-choice likelihood study using cached
E008 development choices. This tests whether rating context predicts peer move
choice beyond a global choice model; it is distinct from F004's outcome-context
interactions and F002's nonlinear moves-only rating regressions. It cannot by
itself validate a final estimated rating or adjustment. Freeze the target,
comparator, candidate and development gates before fitting; reserve any future
confirmation for new registered evidence.

For accuracy work, F006–F009 retain development gains and failed confirmation/
stability gates. D002's 300 reserved games are consumed and keep their `test`
role; revised candidates need a fresh registered confirmation cohort. Use both
D001/D002 for D002 admission and retain E007's source/target limitations.
Do not retry F002/F003/F004/F005 without a changed premise. No candidate is confirmed.
The research goal is active. The extension remains at B000.
