# E036 result: passer context and safe promotion tactics

Research-only development checkpoint; no extension changes or push.

New comments name a flank outside/distant passer separated by at least three
files from every other pawn, and an actual king move newly protecting a passed
pawn. The geometry requires exact current witnesses; it claims no diversion,
permanent protection, safe advance or won endgame.

The promotion tactic requires a moved seventh-rank passer. Every legal enemy
reply must permit same-file queen promotion that either checkmates or leaves
the queen surviving every immediate response with positive nominal material
gain over the position after the actual move. Draw, counter-mate, capture,
blocking, stalemate and any refutation abstain. A shared bounded search never
publishes partial proof on exhaustion. Supplied legal history is preserved.
Comments explicitly stop queen safety at the next response.

Validation: 29 new tests and 989 cumulative tests pass, as do source and diff
checks. Main has 904 authored/reflected cases: 872 with facts, 26 abstentions,
six illegal inputs refused. Maximum selected comment remains 19 words.
Independent coordinate/material replay validates 1,413 certificates, 72 mate
queries, 3,397 reply/history edges and 5,334 response/terminal/fact leaves.
The tracker has 211 verified names across 237 original occurrences, 89 partial
and 759 unimplemented occurrences. Broader promotion/race plans stay deferred.

[Demo](evidence/demo.html), [tracker](evidence/concept-status.md) and
[results](evidence/results.json) retain the exact proof sets. [Main](evidence/run.json),
[repeat](evidence/repeat-run.json) and [initially clean local checkout](evidence/clean-run.json)
match every normalized input and deterministic output hash at source revision
`fd83d0c`. Main, repeat and clean runs took about 41 seconds. Run metadata includes revision, command,
config, environment and guarded D001 receipt. No registered game is analyzed.
Exposed pilot is research/runs/E036/development; evidence stays under 3 MB.

No preregistered gates changed. An additional exposed stalemate control rejects
the tempting promotion label. Conditional tactics and geometric names remain
limited explanations, not real-game precision or measured human benefit.

Next: E037 broadens other short verifiable concepts from the unchanged list.
Continue live five-hour monitoring; at around 10% remaining checkpoint/commit,
record resume state, disable heartbeat and execute authorized normal shutdown.
The separate numerical-rating goal remains paused.
