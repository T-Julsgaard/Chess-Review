# E151 — comparative piece freedom and recorded accumulation

2026-10-10, before implementation/evaluation. Parent E15027b8810. Authorized
current main, research-only/local commits/no push. D001-test preflight passed.
BUILD-FIRST focused checks/tiny pilots; no cumulative or long tests.

Original scopes C0282 improving worst-placed piece, C0292 piece improvement,
C0286 accumulation of small positional benefits, C1064 what is my worst piece.
Shared concrete criterion: LIVE UNIT-SAFE legal destinations. For each own
bishop/knight/rook/queen legal move, enumerate EVERY immediate enemy reply.
Count the move only if its after frame and all replies are live, replies nonempty,
and original moving unit survives on its destination through every reply.
No reset turn/pass. This does not establish overall tactical safety, safety of
other units, mobility quality, general worst-piece status or strategic advantage.
Mates/draw terminals excluded explicitly rather than using vacuous replies.

C1064 bounded answer: complete root ranking by this declared criterion, preserving
all minimum ties and all piece-specific inventories. Never call it a strategic
worst-piece diagnosis. General ranking and educational validity remain open.
C0292: actual quiet nonpawn/nonking relocation; through EVERY live legal enemy
reply, the SAME unit has strictly more live unit-safe legal destinations than
before. Actual unit loss or any nonlive response refutes it. No quality/best claim.
C0282: C0292 plus actual unit belongs to root minimum set (ties retained).
C0286: actual last two supplied history plies are previous own quiet nonpawn
relocation and enemy quiet nonpawn reply. Different actual unit now relocates.
Previous relocated unit gained safe options between its true old root and
current before position, with NO eligible unit losing count after identity
mapping. After actual, every enemy reply preserves every current unit's count
and strictly increases actual unit's count. Trace both real relocations and
prefix. This accumulates observed freedom of distinct units, not independent
valuation of positional benefits, intended plan or general strategic superiority.
Full broader definitions and criterion limitations remain explicit.

Default-false pieceFreedomTags wraps E150. Strict maxPieceFreedomNodes integer
0..50000 default50000. Require full actual legal history. Root complete actor
profile, optional true prior same-actor profile for the two-ply history, and
complete profiles after EACH actual enemy reply. Profiles contain full actor
legal inventory; every eligible B/N/R/Q move, FEN/terminal flags, complete enemy
inventory, ALL enemy replies with FEN/flags and tracked-unit survival. Failed
options retained. Profile units include zero-move units and nonempty minimum
ties. Promotions/EP remain in complete inventories even though pawn moves are
not ranked. Never infer geometric movement count from an invented side-to-move.

Record any visited50move/threefold context; globally abstain from new labels.
Terminal frames close. Actual and previous profiles use full true history,
preserving rights, EP, clock and repetitions. Identity map only real quiet
relocations; reject captures/promotions, missing history or same-unit accumulation.

Cost:3wrapper +1root context+history length; each profile1state+1inventory;
each eligible option1move+1state+1enemy inventory+1per enemy reply;
actual1move+1state+1enemy inventory; each followed enemy reply1move plus profile;
prior history restoration1context+prefix length plus profile. Full failures
charge all work. Cache/fresh equal logical charge; atomic exhaustion drops all
new events/witness and preserves parent. Caller panel independently admitted.
Independent saved checker reconstructs history, all inventories/survival/counts,
ties, identity mappings and labels without detector/collector/derivation imports.

Prospective authored hypothesis: White Kh1,Bc1,Bf1,Pb2,Pe2,Pe3,Ph3 versus
Ka8,Pb4. Both bishops initially have only one legal route. Record Bd2/Kb8;
now Bg2 should improve remaining least-mobile bishop while preserving Bd2's
earlier freedom. The b4 pawn can capture a bishop on c3; that unsafe option
must remain in evidence but not count. Both colors. Missing prior history gives
improvement/ranking only, not accumulation; zero cap/missing history abstain.
Focused controls: tied minima, immediate capture of relocated unit, no increase,
same-unit history, previous benefit lost, captures/nonpiece actuals, terminal/
claims, longer true prefix, EP/promotion inventories, strict/disabled/atomic
budget, cache identity and mutations. These are hypotheses; preserve failures.

Cheap smoke first; pilot<=16authored/reflected cases, source-bound raw reuse.
Soft compressed target200KB; preserve all branches, record overruns. Guard every
chess/evidence entrypoint; retain receipt, environment/commands/null engine+seed,
revision and actual full source/fixture/plan/dependency hashes, compressed raw/
pilot, failures and independent saved replay. Focused E151 plus representative
E150 parent checks, source verification/diff. Defer combined regression/exhaustive
occurrence/absence/priority/history/budget audits, exact main/repeat/initially clean
reproductions and real-game usefulness. Accepted/production/numerical unchanged.
Full catalog goal remains open.
