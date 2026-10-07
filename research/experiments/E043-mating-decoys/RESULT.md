# E043 result: verified conditional mating decoy roles

Research only. Usage cutoff and shutdown remain cancelled. No extension,
rating changes or push. [Definition sources](SOURCES.md) supply terminology
metadata only; no source games, diagrams, puzzles or evaluations were imported.

New opt-in decoyTags explains a specific legal sacrifice-acceptance line only
when the frozen mate-in-two certificate proves mate against every defense.
Acceptance and decline remain covered by that parent proof. The short comment
is conditional, for example “Deflection sacrifice: if ...Rxg8, Nf7# follows.”
The offer must have positive nominal cost and actual legal acceptance.

Three roles have separate evidence. Deflection proves that the accepting unit
could legally capture the same eventual mating unit before the offer; after
acceptance the identical own move actually mates. Self-blocking decoy proves
the capturer remains next to its king after mate and blocks an escape square:
explicitly removing just that unit permits a legal king escape there. This is
a geometric counterfactual, not a playable removal. King attraction proves
accepting king movement turns a same before-legal, nonmating move into mate.
Actual legal mating responses other than the inherited tree's chosen move may
witness a role, but every one executes as checkmate.

The authored decoy-only rook-on-d8 case has no former legal capture of Nf7 and
therefore never receives deflection. Equal trades, failed offers, no acceptance,
disabled/exhausted mate profiles and zero/exhausted tag budgets refuse new roles.
The shared 50,000-node tag budget drops all new roles on exhaustion; parent
certificates remain. Defaults preserve the exact frozen parent result. Names
never assert forced acceptance, exclusive causation or psychological intent.

Validation: 25 new and 1,169 cumulative tests pass; source verification and diff
checks pass. Both colors, omitted roles, fabricated defender duties, mating moves,
acceptances, artificial escapes and supplied-history/FEN mismatch are tested.
The independent replayer checks full canonical FEN after history, including
counters, and refuses continuation from a terminal history. Main evaluates
1,050 authored/reflected cases: 1,012 with facts, 32 abstentions and six invalid
moves refused. Selected comments remain at most 19 words. Independent replay
checks 1,681 event certificates, 112 mate queries, 8,323 reply/history edges and
24,558 leaves. New cases use 44 tag nodes and 136 inherited deep-search nodes.
Coverage reaches 240 verified names across 275 original occurrences, with
79 partial and 731 unimplemented. Deflection, Distraction, Deflection sacrifice,
Decoy and Attraction retain the exact witnessed subsets above.

Generic Pin/Clearance partial descriptions now acknowledge certified queen-
relative/cross pins and mating clearance sacrifices, preserving unresolved
broader scopes and coverage counts. Earlier frozen trackers remain unchanged.

[Demo](evidence/demo.html), [tracker](evidence/concept-status.md) and
[results](evidence/results.json) retain the full new proofs and role witnesses.
[Main](evidence/run.json), [repeat](evidence/repeat-run.json) and
[initially clean checkout](evidence/clean-run.json) match all normalized input
hashes, deterministic outputs and metrics at source revision `ef5c23f`.
Final runs took 73–74 seconds; clean working-tree status is empty. Separate
saved JSON replay verifies all eight new certificates and 14 role witnesses:
four deflections, six self-blocking decoys and four king-attraction continuations.
All 1,030 inherited full-result hashes exactly match E042 in fixture order.
Retained evidence totals 1,272,271 bytes, below 3 MB. Guarded D001 eligibility
receipts are retained; no registered game was analyzed. Pilot: research/runs/E043/development.

Reproduce with `node research/experiments/E043-mating-decoys/code/run.mjs --out research/runs/E043/reproduction`.
Saved verification obtains the guarded D001 test receipt, reads results.json,
and calls `replay(row.fixture, event)` from code/replay.mjs for each mating-decoy
event. Full certificates are in JSON; no decompression or hydration is needed.

Synthetic mechanics are verified; real-game explanation precision and learning
benefit remain unmeasured. Next: E044 evaluate coordinate-specific rook/exchange
sacrifice offers and named mating combinations, using actual legal mate patterns
and complete all-defense certificates. Preserve frozen evidence, keep comments
short and create only local commits.
