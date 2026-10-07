# E031 result and resume state

State: complete, 2026-10-07. Synthetic mechanics gates pass; educational benefit
remains inconclusive. Coach expansion/cutoff active; numerical research paused.
No integration or push. Frozen E020–E030 remain unchanged.

Plan registered `e545f73`; evaluated source `5c58bc1`. The prototype names
intermediate checks/captures and actual intermediate mate. Verified history must
establish the immediately preceding enemy capture and a currently legal direct
recapture. Actual intermediate moves do something else first; ordinary direct
recaptures are excluded. Finite certificates require every legal defense still
permits recapturing the original capturing unit, tracking it if it moves. Each
chosen recapture must survive every immediate counterreply with positive fixed
material gain versus the board after the intermediate move, or actually mate.
Terminal defender outcomes, counter-mate and draws refuse the finite claim.

The [tracker](evidence/concept-status.md) now has 176 verified names and 188
verified occurrences, 84 partial and 813 unimplemented occurrences among all
1,085 original entries. Zwischenzug is checked only for this objective
recapture-delay subset. Automatic recapture remains partial: legal alternatives
are available, but necessity and subjective human choice are not inferred.
See [definition](SOURCES.md) and [plan](plan.md) for narrowed scopes. No source
games, diagrams or positions were imported; fixtures are authored development.

839 cumulative tests and source verification pass. All 772 synthetic cases
pass: 746 produce facts, 20 abstain and 6 refuse illegal moves. The
[demo](evidence/demo.html) includes 22 new rank/color cases; 750 inherited cases
are checked and fingerprinted in [results](evidence/results.json). There are
851 independent event certificate/fact records and 72 separate mate-query
replays. Event records include inherited geometry/defense facts, not only
material-gain certificates. They retain 2,327 relevant reply branches and
3,966 response/terminal leaves. New cases consume 266 intermediate-search
nodes; the longest selected comment remains 19 words.

Independent replay recomputes the legal history and immediate recapture set,
actual move, exact all-defense and all-counterreply sets, tracked target,
nominal balances and terminal outcomes, without new detector helpers. Missing
or duplicate branches, wrong prior target, recapture move, initial balance,
gain/minimum and mate FEN refuse. A rook that answers the intermediate check
with Ra4xe4 is tracked to e4 and recaptured with Pd3xe4. The nonchecking
intermediate capture also retains recapture against every legal reply.

Missing history, no direct recapture, ordinary recapture, refutable delay,
counter-mate after recapture, insufficient-material draw and exhausted budget
make no new finite claim. Invalid history/budget refuses. The original proposed
refutable check was not a check; the retained negative is an actual check
refuted by Bf7xe8, removing the checking rook. See exposed plan notes.

Main, repeat and initially clean local checkout match every normalized input
and deterministic output hash. [Main](evidence/run.json),
[repeat](evidence/repeat-run.json) and [clean](evidence/clean-run.json) retain
exact source revision, receipt, command, environment, config and hashes. Main
evaluation took about 24 seconds excluding eligibility. Retained evidence is
under 3 MB. D001 is an eligibility dependency only, not an analyzed game sample.

This does not prove the move is best, necessary, surprising or stronger than
immediate recapture; comments state only the verified context and finite option.
Positive gain uses fixed piece values and a three-ply horizon after the move,
not whole-game evaluation. Last-capture promotions are excluded. Budget is
shared and capped at 50,000 nodes; exhaustion drops new finite claims while
parent facts remain. Actual intermediate mate needs no finite search.

Next: E032 adds history-grounded repetition/draw facts with precise claim
wording. Continue live 300-minute usage monitoring; near 10% remaining
checkpoint/commit, disable heartbeat and perform authorized normal shutdown
without force-closing apps.
