# E070: pawn-supported knight outposts

2026-10-07. Preregister before implementation/evaluation. Research-only.
Outpost C0268, Outposts C0558; Advanced outpost C0269 has a separate depth gate.
Reuse frozen E069 and 3,604 ordered inherited cases. Guarded D001 test purpose,
authored synthetic positions; no acquired games, extension, push or cutoff.

outpostTags boolean default false, maxOutpostNodes integer 0..50000 shared.
Disabled exact parent; exhaustion removes all new tags/proofs. Actual legal
knight move ends at relative rank 4–6, actual after live. At least one own pawn
supports the destination geometrically AND has a legal capture onto it in an
explicit legal live counterframe: replace only the moved own knight by an enemy
knight, set own turn, clear EP, retain other placement/rights/counters. Save
the full counterframe and ALL such legal supporting pawn captures. This rejects
absolute pawn pins; it does not promise a recapture after every future exchange.

For EVERY current enemy pawn, retain a complete finite forward reachability DAG
before promotion: one-rank straight steps and either diagonal capture step,
plus starting-rank double steps; no occupancy/check/capture-target restrictions.
Ignore blockers and availability of capture victims deliberately: a superset
of every legal pre-promotion pawn route, including future captures that change
files. Any reachable node geometrically attacking the knight's fixed square
refutes the label, even if that route is not presently legal. No current enemy
pawn may have such a node. Store full nodes/edges/attacks and negative witnesses;
do not replace future proof by absence of an immediate pawn attack. Promotion
ends each pawn DAG; a promoted piece may challenge the knight, explicitly outside
the comment's pre-promotion claim. No guarantee against other pieces or pawn
support removal, no permanent safety or best move claim. Vacuous no-enemy-pawn
case retained explicitly; require the actual supporting pawn nonetheless.

Outpost tag requires all above. Advanced outpost additionally relative rank six.
Text <=24 words, qualityClaim false, priorities outpost 101.006, advanced 101.007
below urgent material/mating warnings and stronger causal tactics. Retain EVERY
full-history legal enemy reply, knight-presence flag, geometric support/attacking
pawn flags, captures/promotions and terminals, including loss of the knight or
support. History strictly replayed when supplied.

Independent replay imports no detector helpers; reconstruct history, counterframe
and all legal pawn recaptures. Independently enumerate reachability by rank/file
distance (not detector BFS) and compare complete canonical DAGs. Independently
reconstruct every legal enemy reply, flags and exact short text. Positive/negative
gates separately for outpost and advanced: both colors/reflections, rank 4/5/6,
captures/check evasions, one/two supporters, no pawns, remote/behind enemy pawns,
promotion replies; immediate/future/capture-file-shift challenges, blocked yet
theoretically reachable pawns, pinned supporters, no support, wrong piece/rank,
terminal actual/replies/full-history draws, budget/domains/illegal moves and
tampered histories/counterframes/support/DAGs/replies/text. Retain failed pilots.

Cheap pilot then focused/full cumulative/source/diff gates; freeze source before
main/repeat/initially clean detached reused checkout runs. Require exact source,
input and physical output hashes/metrics, unchanged original list and ALL ordered
inherited fingerprints, independent saved-proof replay. Estimate ~250–280 sec/run
overlapping three, prospective full evidence <=20MB for explicit pawn DAGs.
Keep/report misses without pruning evidence or changing budgets. Commit coherent
changes; local integration only under existing clean/ancestry branch rules.
Exposed synthetic mechanics do not prove real-game precision or teaching value.
