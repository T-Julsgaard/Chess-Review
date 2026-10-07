# E044 result: named mating combinations and coordinate sacrifice offers

Research only. Usage cutoff and PC shutdown remain cancelled. No extension,
rating changes or push. [Definition scope](SOURCES.md) uses the original list
and frozen mating/sacrifice mechanics; no source games or diagrams imported.

New opt-in combinationTags adds short labels only to certified mating
sacrifices with positive nominal offered loss and legal acceptance. The frozen
parent proof covers every defense, including decline. Named smothered and
back-rank combinations additionally retain an actual qualifying mate for EVERY
legal reply: a sole checking knight with all adjacent king squares occupied by
its own units, or a checking rook/queen on the king's home rank behind at least
two adjacent own pawns. A generic combination additionally needs a separately
certified mating decoy or clearance idea. An ordinary forced mate alone does
not receive that label. Example: “Smothered-mate combination: every legal reply
allows knight mate.” This is a verified subset of Tactic and Combination.

Coordinate labels require actual rook offers on relative h7/g7 or rook-for-minor
capture on relative c3 and complete bounded mate. h7/h2 and g7/g2 also require
check, current enemy g/h home-rank king and actual legal opponent kingside
castling in the supplied history. Board placement alone or the offering side's
own castle is insufficient. The c3/c6 profile makes no Sicilian or strategic
claim. Example: “Rook sacrifice on h7: forced mate within two moves.”

Equal trades, failed offers, missing or wrong-side castle history, budget
exhaustion and disabled profiles withhold the new labels. A multiple-defense
pawn offer without a complementary named role remains a mating sacrifice only.
Default false preserves the exact frozen E043 result. The shared 50,000-node
tag budget discards all new tags on exhaustion while retaining parent proofs.
Tampering with castling, mating moves, omitted replies, blockers and pawns is
rejected by independent replay. Histories retain full canonical FEN and terminal
continuation guards. The initial authored g-file history accidentally used an
illegal e4–e6 knight move; the guard refused it. Correcting the start to d4 and
using d4–e6 makes the legal authored offer work. No gate was relaxed.

Validation: 33 new and 1,202 cumulative tests pass; maintained-source and diff
checks pass. Both colors are exercised. Main evaluates 1,078 authored/reflected
cases: 1,040 with facts, 32 abstentions and six invalid moves refused. Selected
comments stay at most 19 words. Replay checks 1,825 event certificates, 140 mate
queries, 8,591 reply/history edges and 25,606 leaves. New cases use 134 tag nodes
and 224 inherited deep-search nodes. Coverage reaches 247 verified names across
282 original occurrences, with 77 partial and 726 unimplemented. Seven newly
verified names: Tactic, Combination, Smothered mate combination, Back-rank
tactic, Rook sacrifice on h7/h2, Rook sacrifice on g7/g2, Exchange sacrifice
on c3/c6. Each tracker entry states the restricted scope; original list unchanged.

[Demo](evidence/demo.html), [tracker](evidence/concept-status.md) and
[results](evidence/results.json) retain full new proofs and per-defense mating
witnesses. [Main](evidence/run.json), [repeat](evidence/repeat-run.json) and
[initially clean checkout](evidence/clean-run.json) are checked at source
revision `4930d81`: all normalized input hashes, deterministic outputs and
metrics match. Final runs took 79–80 seconds; clean working-tree status is
empty. Separate saved JSON replay verifies all 14 new certificates: two each
h-rook, g-rook, c-exchange, smothered and back-rank, plus four generic. Four
castle histories and eight combination reply rows are retained. All 1,050
inherited full-result hashes exactly match E043 in fixture order. Retained
evidence totals 1,566,096 bytes, below 3 MB.
Pilot: research/runs/E044/development. Guarded D001 eligibility receipts are
retained; no registered game was analyzed.

Reproduce with `node research/experiments/E044-named-mating-combinations/code/run.mjs --out research/runs/E044/reproduction`.
Saved verification obtains the guarded D001 test receipt, reads results.json,
and calls `replay(row.fixture, event)` from code/replay.mjs for coordinate-
sacrifice and mating-combination events. Full certificates are directly in JSON.

Synthetic mechanics are verified; real-game explanation precision and learning
benefit remain unmeasured. Next: E045 investigate additional pawn-supported named
mating patterns from the original list with exact support/flight witnesses and
negative controls. Keep production separate and create only local commits.
