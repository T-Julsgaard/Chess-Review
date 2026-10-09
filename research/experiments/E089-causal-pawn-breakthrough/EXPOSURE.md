# E089 development exposure

First19 focused checks pass4.5s. Comment clarified to 'no such bounded straight
route existed before', not geometric 'blocked' when a failed route may instead
have a legal tactical refutation. No predicate or gate change. Independent
positive saved tree replay reuses E037; negative queries reconstructed separately.

Focused E089/E088/E037 run fails1 (21.9s): independent checker authenticated
positive route initialBalance via E037 replayQuery, but forgot the same material
baseline for false afterProof queries. Retain failed forgery test; add explicit
root actor/depth/balance/win-tree binding on every after/before query. Candidate
and promotion predicates unchanged. Full semantic replay remains deferred.

Corrected21 E089 focused checks pass; false-query baseline/depth/color/tree
binding now rejects retained forgery. E088/E037 dependency test files passed in
preceding run; no behavior changes in their sources or the E089 candidate.
