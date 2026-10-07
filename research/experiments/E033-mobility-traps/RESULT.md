# E033 result and resume state

State: complete, 2026-10-07. Synthetic mechanics gates pass; educational benefit
remains inconclusive. Coach expansion/cutoff active; numerical research paused.
No integration or push. Frozen E020–E032 remain unchanged.

Plan registered `22f3c76`; evaluated source `3ff86a3`. Exact mobility comments
report legal destination reductions. Conditional domination proves capture
with positive immediate material gain after every legal move by the named unit;
it does not promise capture after other defenses. Full trapped-piece labels
add a current attack and complete proof against every legal opponent reply,
including captures of the attackers, moves of other units and counterchecks.
The original unit is tracked when it moves, then legally captured with positive
gain through every immediate counterreply. No pawn/king trap or trap while the
opponent is checked is labeled. Actual capture mate still needs positive gain.

The [tracker](evidence/concept-status.md) records 190 verified names and 208
verified occurrences, 90 partial and 787 unimplemented occurrences among all
1,085 original entries. Restriction is exact static mobility in the stated
scope; larger preparatory/trapping combinations remain partial. See
[definition](SOURCES.md) and [plan](plan.md). No source game, diagram or position
was imported; all evaluated fixtures are authored synthetic development.

905 cumulative tests and source verification pass. All 828 cases pass: 798
produce facts, 24 abstain and 6 refuse illegal moves. The [demo](evidence/demo.html)
contains 24 new rank/color cases; 804 inherited cases are checked and
fingerprinted in [results](evidence/results.json). There are 1,257 independent
event certificate/fact records and 72 separate mate-query replays. Records
include geometric/terminal/rule facts, not only material-gain certificates.
Combined records retain 3,283 reply/history edges and 5,034 response/terminal
or fact leaves. New cases visit 855 trap-search nodes; longest selected comment
remains 19 words. Queen, knight and bishop traps and conditional knight/bishop
domination have separate authored positives.

Independent replay recomputes legal mobility, exact relevant reply sets,
attackers, tracked identity, chosen legal capture, all counterreply sets and
exact baseline/minimum gains without detector helpers. Missing/duplicate
branches, altered scope/target/type/attacker/capture, counter sets, gain/minimum
and invented destination refuse. Full queen proof includes Bxc7 attacker
removal and axb6 against the other knight. Each still
permits profitable queen capture. A restricted pinned knight instead has zero
legal destinations but no profitable full capture proof.

Safe knight escape, capture of the sole attacker, insufficient-material draw,
checking moves, own check-evasion comparison and actual counter-mate refute or
suppress new finite claims. The counter-mate control explicitly replays
Bxc7, Nxa8 and Qxh2#. Zero and late shared-budget exhaustion discard all new
finite proofs, including previously completed ones; exact mobility survives.
Invalid budgets refuse. The original domination setup left bishop versus bare
king after capture; retained as a draw negative, with a remaining pawn providing
the positive. An illegal queen move through its own king was replaced by a
legal checking control. See exposed plan notes.

Main, repeat and initially clean local checkout match every normalized source
and deterministic output hash. [Main](evidence/run.json),
[repeat](evidence/repeat-run.json) and [clean](evidence/clean-run.json) retain
exact revision, receipt, environment, configuration and hashes. Main run took
about 35 seconds excluding eligibility; retained evidence is under 3 MB.
D001 is an eligibility dependency only, not an analyzed game sample.

Mobility comparison explicitly swaps the before-position turn and clears EP;
it is disabled if the mover initially was checked, where that hypothetical
board would be invalid. Counts do not judge square quality or later replies.
Finite gain uses fixed values and a three-ply horizon after the actual move,
not whole-game evaluation. Domination is conditional; full traps cover all
current legal replies, with a shared 50,000-node ceiling and abstention on
exhaustion. No necessity, preparatory intent or human teaching benefit is proven.

Next: E034 broadens other short verifiable concepts. Continue live 300-minute
usage monitoring; near 10% remaining checkpoint/commit, disable heartbeat and
perform authorized normal shutdown without force-closing apps.
