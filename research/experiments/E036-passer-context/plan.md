# E036: passed-pawn context and safe promotion tactics

Date: 2026-10-07. Research only, no extension or acquired games.

Add explicit outside/distant passer geometry: pawn on a/b/g/h, every other
pawn at least three files away, at least two other pawns including both colors.
Describe the actual separation, never king diversion or a won ending.
King escort requires actual king move newly protecting an adjacent own passer;
it promises current protection only. Pawn moves can describe an outside passer
again because its advance is an actual event. En passant excludes passers.

Promotion tactic requires a moved own passer now on its seventh relative rank.
After EVERY legal opponent reply it must have a legal same-file queen promotion
that is mate or nonterminal with positive nominal material gain over the
position AFTER the actual move; after EVERY immediate response the promoted
queen must survive and the nominal gain must remain positive. Countermate,
draw, stalemate, captured pawn, blocked promotion or any refutation abstains.
Use verified history when supplied, no history-erasing transposition cache.
Bound all search nodes jointly to 0–50,000; exhaustion drops new proof claims,
never partial proof. Generic geometry may remain. Text explicitly limits queen
safety to the next response, no whole-game win/optimality or human benefit.

Authored synthetic fixtures plus color/rank reflections, targeted refutations,
budget/history/tampering tests and E020–E035 regression tests. Independent
coordinate/identity/material replay validates exact reply/counterreply sets.
Guard D001 eligibility before fixture loading; no registered games analyzed.
Pilot under research/runs/E036/development. Commit plan before decisive run,
source before retained main, repeat and initially clean local clone. Match
normalized input/output hashes, retain exact revision/receipt/config/env;
evidence <3 MB, comments <=24 words, source verification and local commits.

Continue measured five-hour cutoff: around 10% remaining stop new work,
checkpoint, disable heartbeat, normal authorized shutdown without /f.
