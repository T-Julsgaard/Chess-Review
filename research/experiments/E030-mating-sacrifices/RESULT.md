# E030 result and resume state

State: complete, 2026-10-07. Synthetic mechanics gates pass; educational benefit
remains inconclusive. Coach expansion/cutoff active; numerical research paused.
No extension integration or pushes. Frozen E020–E029 are unchanged.

Plan registered `5b649f9`; evaluated source `76c293c`. Short explanations name
queen, rook, bishop, knight and pawn offers for bounded forced mate. Exchange
sacrifice additionally requires the played rook captures a minor; clearance
requires vacating the sole blocker on a stationary slider-to-king ray and
opening check. Every legal acceptance and decline retains a complete E029
mate-in-two/three proof. Offers are not presented as already accepted or
necessary. Equal trades, no legal acceptance, unproven mate and exhausted
budgets withhold new labels. Default profile 0 preserves the frozen parent.

The [tracker](evidence/concept-status.md) records 172 verified names and 183
verified occurrences, 83 partial and 819 unimplemented occurrences among all
1,085 original entries. General sacrifice timing remains partial; positional,
deflection, defensive and named historic combinations remain deferred. Sources
and narrowed scopes are in [definitions](SOURCES.md) and [plan](plan.md).
No source games, diagrams or positions were imported; all fixtures are authored.

812 cumulative tests and source verification pass. All 750 synthetic cases
pass: 724 produce facts, 20 abstain and 6 refuse illegal moves. The
[demo](evidence/demo.html) contains 22 new rank/color cases; 728 inherited
cases are checked and fingerprinted in [results](evidence/results.json).
There are 831 independent event certificate/fact records and 72 separate
query-tree replays, including bounded negative searches. Event replays include
inherited geometry and defense facts, not only material-gain certificates.
They retain 2,159 relevant reply branches and 3,836 response/terminal leaves.
New cases use 156 budgeted deep-search nodes; longest selected comment is
19 words. The pawn case includes an en-passant acceptance on the actual
captured square f4 and legal declining replies, all with positive mate witnesses.

Independent replay imports the frozen E029 tree verifier but no new detector
helpers. It recomputes the actual played piece, nominal loss, complete legal
capture set and acceptance branches. Separate coordinate-based replay checks
clearance rays. Missing/duplicate captures, altered capturer/type/square/value,
negative mate branch and invented ray/king/slider/vacated square refuse.
An ordinary rook offer cannot be relabeled exchange sacrifice. Warning priority
stays above new labels; specific terminal mates also retain higher priority.

Early setups exposed an escaping king, a friendly knight blocking the planned
mating rook, invalid back-rank pawns and an extra bishop blocking the played
queen path. These were corrected or rejected before retained evaluation and
are disclosed in the plan; no failed proposal is represented as a positive.

Main, repeat and initially clean local checkout exactly match normalized source
and deterministic output hashes. [Main](evidence/run.json),
[repeat](evidence/repeat-run.json) and [clean](evidence/clean-run.json) retain
exact revision, receipt, environment, configuration and hashes. Main evaluation
took about 23 seconds excluding eligibility; retained evidence is about 1.3 MB.
D001 is only an eligibility dependency, not an analyzed game sample.

These are conservative mating subsets. Nominal loss uses fixed piece values,
not an engine evaluation; the proven compensation is mate. No necessity,
psychological intention, lasting positional compensation or real-game teaching
benefit is established. Explicit deep profiles retain the shared 50,000-node
ceiling and may abstain; FEN-only inputs cannot supply earlier repetition.

Next: E031 broadens other short verifiable concepts. Continue monitoring actual
300-minute usage; near 10% remaining checkpoint/commit, disable heartbeat and
perform authorized normal shutdown without force-closing apps.
