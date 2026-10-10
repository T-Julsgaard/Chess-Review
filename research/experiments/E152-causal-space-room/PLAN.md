# E152 — causal pawn-space and maneuvering-room comparisons

2026-10-10 before implementation/evaluation. Parent E151ab02d2d. Authorized
current main, research-only/local commits/no push. D001-test preflight passed.
BUILD-FIRST: focused checks/tiny pilot, no cumulative/long tests. Full catalog open.

Compatible original scopes C0289 space advantage, C0290 space disadvantage,
C0291 cramped position, C1072 who has more space. Scheduling deviation recorded:
reuse E151's full legal unit-safe profile method immediately. Earlier C0287/
C0288 need a distinct causal creation-of-second-target/material-defense panel;
E049 conditional preexisting duties or E150 checking forks do not alone establish
that claim. Keep them next, not solved, removed or relabeled as mere counts.

Actual quiet nonpromoting pawn move and explicitly supplied distinct legal quiet
same-pawn spaceAlternative, both from identical real root/full history. No pass
or reset turn. Each alternative reaches a genuine opponent-turn frame with
unchanged opponent unit identities. Complete opponent B/N/R/Q legal profile,
using E151 live unit-safe destination criterion: move after frame and ALL
immediate actor replies live/nonempty, moved unit survives each reply. Zero-move
units included, all option inventories/counterreplies retained, no early pruning.
Frozen E151 profile closure is not exported: implement the same declared neutral
method for each genuinely alternating side without modifying frozen source.

Space descriptor: geometric pawn-controlled squares in advanced middle band:
White ranks5/6, Black ranks3/4, all files. Union, occupied cells retained and
explicitly marked. This is declared pawn pressure, not legal territory ownership,
safe occupation, full-board control or general positional value. Actual set must
strictly add cells over alternative, with no cells lost. Actual actor count must
exceed opponent's for C0289/C1072, under this criterion only.

Causal room comparison: same opponent unit set/types; every actual safe count
<= alternative and at least one strictly less. For EVERY lost safe option,
the identical UCI remains legal after actual but unsafe; its destination lies
in newly controlled cells, and raw actual continuation contains a LEGAL pawn
capture by the actually advanced pawn of that moved unit, live after capture.
Retain all such captures and failed options. No aggregate count may hide an
improved opponent unit or an unrelated lost option. This causally connects the
pawn advance to lost immediate room without inventing a turn or a defense.

C0289: descriptor advantage plus causal room comparison. C0290: causal room
comparison, labeled from opponent's restricted-room perspective. C0291: causal
comparison and >=2opponent units each have<=1actual safe option and strictly
more under alternative. C1072: report both advanced-middle pawn-control counts
only when C0289 holds. Never diagnose whole-game advantage, lasting cramp,
best move or the comprehensive strategic space question. Broader scopes open.

Default-false spaceRoomTags wraps E151. Strict maxSpaceRoomNodes integer0..50000
default50000; required comparison otherwise explicit alternative-prerequisite.
spaceAlternative must be distinct legal quiet same-source nonpromoting pawn
move. Missing full actual history abstains. Optional spaceRoomPanel untrusted,
independently admitted before derivation. No engine/tablebase/acquired games.

Raw root complete legal inventory, pawn-control snapshot, history/actor/source;
both actual/alternative variants sorted, each exact FEN/flags/control/complete
opponent profile. Profile every opponent nonpawn/nonking move, resulting full
actor legal inventory and ALL immediate replies with descriptors/FEN/flags and
unit-survival identity. Terminal frames close. Any visited50move/threefold claim
context globally abstains. Costs:3wrapper +1context+history length+1root
inventory+1root control; per variant1move+1state/control+1profile state+1profile
inventory; per eligible opponent option1move+1state+1actor inventory+1per actor
reply. Same cache/fresh charge, atomic exhaustion drops all new events/witness.

Prospective authored hypothesis: White Ka1,Pa4,Pb4,Pe2,Ph4 versus Kh8,Ra8,Re8,
Nc7,Ng7,Pa6,Pb5,Pe6,Ph5. Actual e4 versus e3. Nc7 only has d5 and Ng7 only f5;
e4 should make both unsafe via exd5/exf5, whereas e3 does not. Other enemy unit
counts should not increase. White advanced-middle pawn control grows4to6 versus
Black3, with newly controlled d5/f5 tracing both losses. These are hypotheses,
not results. Both colors. Controls: single affected unit (not cramp), reversed
actual/alternative, missing comparison/history, zero cap, no control superiority,
unit-improving tradeoff, unrelated loss/pin, terminal/claims and strict inputs.

Cheap smoke before expanding; pilot<=16authored/reflected cases. Exact source/
input-bound raw reuse, focused strict/disabled/cache/atomic/full-history/EP/
promotion/control/capture-identity/inventory/count/label mutations plus E151 parent
representatives. Independent saved checker imports neither collector, detector
nor derivation helpers. Retain guard receipt, environment/commands/null engine+
seed, revision, full source/fixture/plan/dependency hashes, compressed raw/pilot
and failures/amendments. Soft compressed target150KB; no discarded branches to
fit it. Source verification/diff. Defer combined full regression/occurrence/
absence/priority/history/budget audits, exact main/repeat/initially-clean
reproductions, broader strategic validity and real-game precision/usefulness.
Accepted tracker, production, shared policy and numerical behavior unchanged.
