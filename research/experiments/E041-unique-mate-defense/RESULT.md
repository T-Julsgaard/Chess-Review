# E041 result: unique defense against mate in one

Research only. Usage cutoff and shutdown remain cancelled. The extension,
remote repository and separately paused numerical-rating research are untouched.

With opt-in `uniqueDefense: true`, a move can now receive the short comment
“Only move avoiding mate in one: Rxf2+.” The played move must leave a nonterminal
position with a complete negative enemy-mate-in-one proof. Every other legal
choice from the same history must admit an explicit immediate mating reply.
At least two legal moves are required; sole legal moves are separate facts.
The label makes no longer-term safety, winning or best-move claim. Default false
preserves the exact frozen parent result. One shared budget caps all queries
at 50,000 nodes; exhaustion refuses the new claim even after partial success.

Authored rook and bishop capture examples certify unique immediate defenses.
The rook example refutes seven other moves; the bishop example refutes three.
Both colors pass. Another safe checking move, a wrong played move, terminal
dead material and an alternative fifty-move draw all correctly refuse uniqueness.
Legal history is preserved in positive, negative and independently replayed trees.
Tests reject omitted alternatives, missing safety branches, illegal mating moves,
wrong SAN/FEN/winner/depth, invalid budgets and budget exhaustion.

Validation: 21 new and 1,118 cumulative tests pass, alongside source verification
and diff checks. Main evaluates 1,010 authored/reflected cases: 972 with facts,
32 abstentions and six invalid moves refused. Maximum selected comment remains
19 words. Independent replay checks 1,565 event certificates, 94 mate queries,
7,925 reply/history edges and 23,688 leaves. New unique searches use 258 nodes
across the 18 new cases. Coverage is 233 verified names across 268 original
occurrences, 79 partial and 738 unimplemented. Only move and Forced move retain
the explicit immediate-mate-defense subset; broader strategic intentions remain open.

[Demo](evidence/demo.html), [tracker](evidence/concept-status.md) and
[results](evidence/results.json) retain all new proofs directly in compact JSON.
[Main](evidence/run.json), [repeat](evidence/repeat-run.json) and
[initially clean checkout](evidence/clean-run.json) match all normalized input
hashes, deterministic output hashes and metrics at source revision `dc44621`.
All three runs took 75–77 seconds. The clean run records an empty working tree.
A separate disk read-back replay verified all four new positive certificates
and their 20 alternative-move refutations. Retained evidence totals 1,065,601
bytes, below the 3 MB gate. Guarded D001 eligibility receipts are retained;
no registered game was analyzed.

The development pilot completed raw certificate checks but failed on an obsolete
compressed-pack write carried from E040. Removing that writer preserves full
JSON evidence; no gate, search or certificate changed. Final main/repeat/clean
runs all completed successfully. Bulk pilot/test output stays in research/runs/E041.

Reproduce with `node research/experiments/E041-unique-mate-defense/code/run.mjs --out research/runs/E041/reproduction`.
To verify the saved proofs, load `results.json`, obtain the guarded D001 test
receipt, and call `replay(row.fixture, event)` from `code/replay.mjs` for each
`unique-mate-defense` event. No decompression or proof hydration is needed.

Synthetic legal mechanics are verified; real-game explanation precision and
human learning benefit remain unmeasured. Next: E042 investigate further
concrete defensive concepts with explicit threat and response certificates.
Preserve frozen evidence, keep comments short and make only local commits.
