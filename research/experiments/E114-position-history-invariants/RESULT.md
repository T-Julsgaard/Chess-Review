# E114 position and history invariants

2026-10-09 provisional build-first batch. Preregistration fa001ed, parent E113
c74f07d; current main authorized by user. Research only/local commits/no push.
Five original candidate scopes C0971 asymmetrical position, C0382 uncastled king,
C0806 pawn move irreversibility, C0927 irreversibility and C0213 pawn hole.
Default-disabled positionInvariantTags wraps E113, maxPositionInvariantNodes
integer0..50000 default50000. One atomic budget covers histories/inventories/
reply iteration/events; exhaustion preserves parent events/comment exactly.

Actual legal move snapshots supply complete inventories. Asymmetry specifically
means an exact full-army color/rank mirror is broken, not strategic inequality.
Uncastled king requires complete standard-start history including the played
move, with no actor castle. Missing/nonstandard history unavailable; king square
or lost rights alone cannot establish whether that king castled previously.

Pawn identity strictly advances relative rank or promotes: that same pawn cannot
return to source as a pawn. Captures permanently reduce total units; promotion
cannot increase that total. Lost castling rights cannot return with pieces.
Complete legal next replies retain unit-count/rights monotonicity. These are
rule invariants, not declarations that every part of a position is irreversible.

Pawn-control holes require a nonpromoting advance abandoning an empty central
attack square, with every remaining own pawn at/above that target's relative
rank. None can ever retreat to the required one-rank-behind attack rank, even
if captures change files. Promotion creates no replacement pawn. Permanent lack
of pawn control does not establish lack of piece defense or strategic weakness.
Candidate comments keep that distinction and qualityClaim:false, <=24words.

Informative development observations: e3e4 with own Pb5 leaves permanent
pawn-control holes d4/f4; putting the extra pawn on b2 instead blocks both claims
despite its distant file. Occupied d4 is excluded. En passant e5xd6 (Black e4xd3)
also leaves f6 (f3) permanently pawn-uncontrolled under the same rank invariant;
initial ad-hoc expected lists omitted that additional fact and were corrected.
No gates changed. Standard e4/e5 histories report the actual uncastled side;
missing history omits that claim. After actual/prior castling the king is not
reclassified uncastled. Returning Rh2h1 does not regain rights. EP capture square,
promotion identity and full next-reply unit counts replay independently.

48focused checks pass in2.4s; E1133disabled/strict/history representatives pass
in0.67s. Tests include both colors, standard/missing/castled histories, captures/
EP/promotions/rights, occupied/behind-rank negatives, strict controls, exact atomic
budget, JSON and independent inventory/rank/history/reply/label mutations. Terminal
fixtures require their exact expected refusal, not any exception. Source
verification and diff checks pass. No long cumulative suite or engine search.

First guarded 31case pilot/replay passed with117source hashes, then terminal
error checks and parent-test dependency bindings were strengthened. Final distinct
research/runs/E114/final pilot and independent replay pass31cases,25witnesses,
20positive cases,4expected exhaustions,2terminal refusals,121normalized source/
fixture/dependency hashes. Neutral checker imports neither detector nor solver;
independently parses FEN snapshots and replays every legal reply/history/label.
Retained evidence/run.json binds preregistration revision plus actual working
source hashes, runtime/argv, engine:null,seed:null,D001receipt. No acquired games
or clean frozen confirmation. Plain162,694bytes,gzip22,117bytes; packedSHA256
a13de22663f51bff32dc459d70915c3b73c54d50edb41e10ac7af6600e9d81ea;
plainSHA256ddaaa844530172b9f76c3ecac7be4359fe7cea7d19585c09e461f44f4f6ce19d.
Replay: node research/experiments/E114-position-history-invariants/code/replay-saved.mjs

Accepted E082 unchanged378/1085(34.8%),328names. Build metadata271provisional
entries,35ready/0stale;649accepted-or-candidate59.8%,436withoutreadycode.
Broader original meanings stay in scope. Deferred combined cumulative regression,
complete semantic/absence/integration/priority/history/budget matrix, exact frozen
changed main/repeat/initially-clean reproductions, occurrence audit and real-game
precision/usefulness. Factual prototype coverage is not accepted strategic quality.

Next unused E115: inspect remaining approved queue after these descriptor/history
claims, group compatible quantified tactical/ending policies, preregister before
evaluation. Continue current authorized main, focused checks/small guarded pilots,
reuse unchanged prerequisites and preserve original catalog/evidence. Numerical
research and production remain unchanged; no push or shutdown action requested.
