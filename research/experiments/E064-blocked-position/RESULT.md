# E064: newly completed pawn walls and finite legal mobility

2026-10-07. Research only; numerical work paused, usage cutoff/shutdown cancelled.
Original list unchanged. No extension integration, acquired games or pushes.

Opt-in blockedPositionTags names an actual straight noncapturing pawn advance
that completes a matched central pawn wall. ALL pawns on the board must form
one opposing ram per contiguous file, at least four files including d/e. The
complete actual enemy legal pawn move set is empty. An explicit legal, live
hypothetical own turn (EP cleared) also has zero pawn moves. After EVERY actual
enemy reply the child must remain live, preserve the complete pawn lists and
wall, and permit zero own pawn moves. This is finite legal mobility evidence,
not permanent blockage, a fortress, a draw, advantage or nonpawn immobility.
Default-disabled behavior equals frozen E063; shared budget exhaustion removes
all new events while preserving parent facts and selected comments.

Example: “Blocked position: e4 completed 4 pawn rams; neither side has a pawn
move now, and yours stay immobile after every reply.”

Full evidence retains legal history/actual move, all before pawn moves, complete
pawn identities and matched rams, ALL actual enemy move records, hypothetical
own-turn FEN/pawn moves and every reply's terminal flag, complete pawn lists
and own pawn moves. Independent replay imports no detector helpers and checks
all history, counterfactual legality, material, geometry and complete legal sets.
Four-, six- and eight-file walls, both colors and horizontal counterparts pass.
Double-step closure qualifies only when no legal EP or other pawn move exists.

EXPOSURE.md retains the invalid castling-fixture failure and correction before
source freeze: a rook already checked the authored own king. No detector or
priority changes. Castling is included among legal enemy replies. A checking
reply may qualify when the child is live and the wall/pawn immobility persist.
Enemy king/rook captures of wall pawns, knight/bishop offers enabling own pawn
captures, legal EP captures, extra pawns, noncentral/noncontiguous/undersized
walls, unmatched rams and adjacent pawn captures refute. Promotions, captures,
king moves, actual mates and illegal own-turn counterfactuals do not qualify.
Enemy mating replies also refute rather than using vacuous immobility.

The pre-existing capture of another own piece remains possible in a positive
wall. Parent policy excludes already available captures from newly hanging
piece warnings; a failed warning-selection assertion is retained and corrected
to document that scope. The wall label makes no claim about other-piece safety.
A parent-certified trapped knight selects ahead of a valid wall; urgent enemy
mate warning selects on a refuted wall. No unsupported fork warning added.

All 149 new tests and 3,196 cumulative E020–E064 tests pass. Maintained source
verification and diff checks pass. Full run: 2,940 cases, 2,810 with facts,
84 abstentions and 46 refused illegal moves; selected comments at most 21 words.
Cumulative independent replay: 5,559 certificates, 288 queries, 17,839 reply
or history edges and 42,284 replay leaves. New classification uses 3,960 bounded
nodes; inherited trap checks 149 on new cases. No engine search/numerical fitting.

Main, repeat and initially clean clone use exact source 9c9336e and match
normalized input hashes, physical output hashes and metrics; 190–193 seconds.
Saved JSON independently reconstructs 48 new certificates on 48 positive rows,
with 88 legal negative rows and four refused illegal moves. Evidence retains
308 complete enemy moves/replies, 140 before pawn moves, 216 ram references,
2,608 reply pawn-identity references and eight history plies. Four castle replies,
16 checking replies and four captures of other own pieces remain in positive
certificates. Negative captures, offered pieces, EP and mates physically checked.
All 2,800 inherited full-result fingerprints match E063 in order; original-list
hash unchanged.

Full evidence 4,237,262 bytes, within the prospective 5MB budget; all proofs
retained with frozen E053 compact display. Coverage 289 verified names /
331 original occurrences; 76 partial and 678 unimplemented occurrences. Only
Blocked position's finite central-wall scope is newly marked verified. Human
teaching benefit, real-game precision and extension readiness remain unknown.

[Demo](evidence/demo.html), [tracker](evidence/concept-status.md),
[results](evidence/results.json), [main](evidence/run.json),
[repeat](evidence/repeat-run.json), [clean](evidence/clean-run.json).
Reproduce: `node research/experiments/E064-blocked-position/code/run.mjs --out research/runs/E064/reproduction`.
Guarded D001 test receipts retained. Continue in the isolated checkout while
other activity owns the shared checkout.

Next: investigate history-confirmed Triangulation. Require a legal three-move
king triangle restoring full piece placement against two reversible enemy
moves, with the opponent now to move. Preserve rule-state/counter differences
explicitly; do not claim zugzwang, a win or successful tempo use from shape alone.
