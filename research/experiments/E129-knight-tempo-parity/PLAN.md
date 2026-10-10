# E129 — global knight-return parity and recorded tempo constraint

2026-10-10 preregistration. Parent E128 3de664a, current main authorized,
local research commits/no push. BUILD-FIRST. C0708 knight inability to lose a
tempo easily: exact universal knight-placement invariant plus relevant legal
recorded maneuver, not another shallow search. E065 king triangulation is known;
this is its knight-only impossibility counterpart, not a copied triangle label.
Earlier remaining broad pawn/opening/rook families still need their own evidence.

Default-false knightTempoTags; maxKnightTempoNodes integer0..50000 default50000;
knightTempoMoves odd integer3..9 default3. Disabled exactly E128; independent
atomic extra exhaustion preserves parent. Full validated actual/history, live
actual quiet knight move. Material at segment start/end only kings/pawns/knights,
actor has at least one knight; no arbitrary army-count cap. Rights/EP must be
absent at both segment boundaries. No phase or good/bad move classification.

Use last2N-1 actual plies including played move, N=knightTempoMoves. EVERY actor
move is a quiet nonpromotion knight move; EVERY opponent move is quiet nonpawn
(king/knight under material profile). Opponent's entire piece placement must
return exactly. Actor's nonknight pieces stay fixed. Save all segment records,
full history, inventories and exact counters/turn/rule fields. N odd, hence the
actor's knight placement cannot be restored even with multiple identical knights
or identity permutations. Require all predicate evidence, never a generic label
after any isolated knight move. Missing history/mismatched window abstains.

Build complete64-square geometric knight graph, all336 directed moves, dark/light
partition. Legal quiet knight moves are a subset of these edges; every edge
crosses the partition. Count of own knights on dark squares changes by +1/-1
with every quiet knight move, so its parity toggles. Thus ANY knight-only return
of the entire knight placement needs EVEN own knight moves, globally, without
a finite search cutoff. Even is necessary, not sufficient for a legal return.
The theorem does not rule out waiting with kings/pawns, tactical opponent changes,
or other ways to lose a tempo. No forced draw, zugzwang gain or optimality claim.

Save complete graph, edge count, actual per-actor-move before/after knight sets,
dark counts/parities and root/end army restoration checks. Independent checker
imports neither detector nor graph generator; enumerate jump offsets independently,
verify the complete graph/bipartition, reconstruct strict legal history and each
actual parity transition, opponent restoration and exact labels. One tracked
knight returning must NOT fool the collective-placement predicate if another
knight moved once. All actual after terminal draws/mates suppress claims.

Authored representative both colors, N3/N5 windows, multiple knights, enemy
king/knight return, nonreturning enemy, mixed own pieces/pawn moves/captures,
insufficient history, strict controls, disabled compatibility and exact atomic
budgets; mutated graph/history/count/restoration proofs rejected. Guarded small
synthetic pilot <=32cases, source/diff and representative parent checks. No
acquired games, labels, engine, cumulative inherited suite or historical recollection.
Graph is fixed small proof (~400 nodes+history work), compact retained certificate.

Deferred combined regression, exhaustive interaction/priority/absence/history/
budget/original-occurrence audit, exact main/repeat/clean and real-game usefulness/
precision. N7/N9 and complex knight material/history matrices remain combined
work. Entire original idea remains in scope; other-piece tempo resources are not
declared unavailable by this knight-only theorem.
