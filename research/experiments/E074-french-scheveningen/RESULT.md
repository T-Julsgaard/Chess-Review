# E074: verified French pawn chains and Scheveningen control

Completed 2026-10-08. Research-only opt-in comments for **French pawn chain**
and **Sicilian Scheveningen structure** from the unchanged original list.
`centerTags` defaults false, preserving exact E073 behavior. Its shared integer
`maxCenterNodes` budget is 0..50000; exhaustion atomically removes new events
and preserves the parent comment. No extension integration or scoring change.

An actual own pawn move must newly complete the fixed core in a live position.
French advanced-role chains require own d4/e5 against enemy d5/e6; base-role
chains require own d4/e3 against enemy d5/e4, color reversed for black. Both
support links require independently legal opposite-knight replacement captures.
The two central pawn pairs are rams. Complete legal moves from the named pawns
are retained on explicit fresh turns for both sides: no forward advance exists,
but captures can remain legal. Standard and reversed wording distinguishes roles.

> French-type pawn chain: d4 supports e5 against d5/e6; both central pawn pairs block forward advances.

Scheveningen requires black d6/e6 against white e4, empty c5/d5/e5/f5 targets,
and no own c-file or enemy d-file pawn. Every named pawn control edge must have
a legal replacement capture. White uses explicit reversed wording and targets.
Recorded history must trace the original own c-pawn and enemy d-pawn: one
captures the other as a pawn and an opposite non-pawn immediately recaptures.
Both capture orders and en passant are supported; a final FEN alone cannot
prove this exchange. Identity tracking in the detector and scalar tracking in
independent replay use separate implementations.

> Sicilian Scheveningen structure: d6/e6 control c5/d5/e5/f5 after the recorded c-pawn/d-pawn exchange.

These facts do not establish opening identity, strategic superiority, a winning
attack, successful break, permanent closure or safety. Comments have
`qualityClaim:false`, at most 24 words and priorities 101.012/101.013 below
urgent warnings. Pins, missing context/history, illegal counterframes, occupied
targets, wrong files/ranks/colors and unrelated preexisting shapes refuse new
labels. Every full-history enemy reply retains its complete move, inventories,
core/shape loss and check/mate/stalemate/draw/gameOver flags. Structure loss or a
terminal reply does not become a promise of permanence.

[EXPOSURE.md](EXPOSURE.md) retains authored fixture failures: a blocked setup
path, a wrong capture-completing move and a recapturing knight left on a required
empty target. Corrected fixtures preserve the original geometry and legality
gates. A sparse Scheveningen position also exposed a hanging central pawn:
its higher-priority warning remains selected. That case is retained separately
from the normally supported center. No priority, legality or budget was loosened.

Frozen source **5a829ce632beb48cdbfe31b6becb97073703b7d9**. Focused **195 tests**
passed in 7.7s; cumulative **4,741 tests** passed in 118.3s. Maintained source and
diff checks passed. Main/repeat/initially clean detached runs exited 0 with exact
revision, input hashes, physical output hashes and metrics; durations
243457/242760/248081ms. All **4,232 ordered E073 full-result fingerprints** and
the original list hash remain unchanged.

Independent saved-proof replay verified **48 new certificates**: 28 French
(22 advanced, six base) and 20 Scheveningen, plus 136 legal negatives and four
invalid moves across 188 new cases. It reconstructed 512 replies, 146 legal
countercaptures, ten named-pawn moves, 130 history plies, 32 promotions, eight
terminal replies and 48 shape losses. Tests reject tampered inventories,
support/control sets, ram/move sets, exchange identities/history, reply flags and
text. Explicit checks cover actual en-passant ram loss, en-passant exchange,
normal comment selection and tactical warning precedence.

Full corpus: **4,420 cases**, 4,162 with facts, 164 abstentions and 94 invalid
moves; longest selected comment **21 words**. It retains 7,559 certificates,
288 query proofs, 26,825 reply edges and 53,546 continuation leaves. New center
analysis consumed 1,674 counted nodes. Canonical evidence **5,690,907 bytes**,
within the prospective 20,000,000-byte budget.

[Results](evidence/results.json), [demo](evidence/demo.html),
[tracker](evidence/concept-status.md) and main/repeat/clean manifests are retained.
`npm run research:status` computes coverage from the original occurrence IDs.
Verified names describe these explicit mechanics subsets. Synthetic evidence
establishes neither real-game precision nor teaching value; stricter legal
counterframes and history requirements may abstain on other valid structures.

Next E075: investigate Benoni and Botvinnik structures against primary naming
sources, then preregister bounded support/control and any required exchange
provenance before implementation. No inferred opening or successful attack.
Reuse existing branches/checkouts; no push, numerical research, cutoff/shutdown,
automation revival or agents.
