# E136 — provisional exact mate distance and lost pawn-ending transitions

2026-10-10. Preregistration01f2687, disclosed amendments27cf86c/9ede6fb;
parent E135f8036a4. Authorized current main, research-only local commits/no push.
C0750/C0878 have callable candidate scopes. Accepted tracker, numerical research
and production unchanged. Broader tablebase/outcome/endgame scope remains open.

Reuse E029's complete legal mate query and separate independent replayQuery;
no replacement mate solver or engine. Defaultfalse mateDistanceTags, strict
maxMateDistanceNodes integer0..50000 default50000, mateDistancePlies integer0..5
default3, mateDistanceSide enumactor/opponent defaultopponent. Disabled exactly
E135 with no implicit flags. Atomic exhaustion preserves inherited events/comment
and drops all extra witness/event state. Full supplied legal history preserved;
no material-count or piece-type shortcut in the mate query.

After actual move, search requested winner at every bound0..H until first full
winning mate proof. Retain every query including shorter refutations. Winner
chooses a continuation, defender's entire legal inventory must be covered; every
mate leaf is actual checkmate, not promotion/material/king-distance evidence.
First successful bound is exact minimax distance IN PLIES because every lower
bound failed completely. No finite success means unresolved, not drawn/lost or
a fabricated number. Actual delivered mate has distance0 from the resulting board.
This is a computed finite proof, not a tablebase probe, mate-in-moves score or DTZ.

E029 treats chess.js claimable draws as terminal. To preserve EXACT semantics,
walk all required proof trees with full history before issuing any numeric claim.
If a required draw leaf depends on50move/threefold availability, return claim-rule-
prerequisite with no exact value/event. In particular an attacker may decline a
draw claim to mate; mandatory-draw modeling cannot silently refute a faster mate.
Clock99 quiet actual and future attacker-claim leaf after clock98 actual both
refuse exactness. Actual third repetition after a legal seven-ply history also
refuses it. Mechanical stalemate/insufficiency and actual mate remain distinct.
Broader claim/automatic-draw rule integration remains a combined prerequisite.

Lost pawn-ending event additionally requires supplied immediately preceding enemy
rook capture of actor's last rook in a pure K/R/P ending; actual king/pawn then
captures that same last enemy rook without promotion, leaving only kings/pawns.
Save prior board/move, rook origin, exchange square, recapture and exact pawn-ending
inventory. Opponent must be the requested proven mating side. Without history,
same current board gets only exact mate distance. No prior-outcome, avoidable
blunder, best alternative or player-intention judgment inferred from this fact.

Original authored Ka2/Pa3 versus Kc2/Pb2/Ra1, Kxa1 was illegal because Pb2 attacks
a1. Original Kf6/Qe7 versus Kh8, Qf7 was stalemate. Both retained, both colors.
Prospectively corrected exchange White Ka2/Pa4 versus Black Kc3/Pb2/Ra3, Kxa3,
with history from White Ra3 versus Black Rb3, ...Rxa3+, succeeds at exact3plies:
...b1Q a5 Qb3#.197ticks both colors including history and claim guards. Queries
0/1/2 fail and3 succeeds. No-history same current board196ticks, distance3 only.

Second proposed distance2 move Qe6 with Kf6 versus Kh8 remained unresolved atH3,
377ticks: proposed Qg7 from e6 was not legal. Keep that failed hypothesis as
unresolved, not a draw. Before further evaluation registered third core K g6/Qg5
versus Kh8, Qe7, from exposed authored E029 mechanics with extra pieces removed.
It succeeds at exact2plies23ticks, with0/1 refutations: ...Kg8 Qe8#.
Actual Qg7# in the other core returns exact0,4ticks. No goals/budgets/search rules
weakened in response to failures. All these mechanics are exploratory development,
not a fresh confirmation sample. Odd one-ply reflected history uses initial
fullmove2 so its final FEN/clocks match exactly; no history check was bypassed.

Final50focused checks passed5.2s; 3 representative E135 parent checks passed0.8s.
Strict controls, illegal actual/history mismatch, exact197/196 atomic boundary,
enabled bridge parent, winner-side binding, all shorter proofs, no-history scope,
H0/neutral unresolved, actual mate0, claim clocks and actual threefold checked.
13 witness mutations plus missing-defender-branch and event-label mutations
rejected. Independent checker imports neither solver nor detector; reuses E029
semantic proof replayer and independently binds actual/full history, all depths,
minimum, claim leaves, exchange identities/inventory and exact labels. Source
verification/diff checks pass. No long cumulative tests or game/engine collection.

Guarded D001-test authored pilot22cases:8positives,2expected exhaustions and
2expected illegal-input refusals. Independent saved semantic replay passes all18
retained positive/negative witnesses and148 normalized source/fixture/dependency
hashes. Original failed hypotheses and shorter refutations remain in evidence.
Evidence copied from research/runs/E136/final to evidence/results.json.gz and
evidence/run.json. Revision9ede6fb plus actual source hashes, environment/argv,
null engine/seed and guarded receipt retained. Plain114342bytes,gzip18664.
Packed SHA256c25a3326a2811d69c23d969447d67334ec4e5bc0b464d8ffd40be9547bb19c75;
plain daec5e99d9dd46312ea3f121ed1910ffcc9e4f599c61992b16abd2b9985a8ed1.
Replay: node research/experiments/E136-exact-mate-distance/code/replay-saved.mjs

Metadata-only source review: [Syzygy generator](https://github.com/syzygy1/tb)
and [Lichess tablebase server](https://github.com/lichess-org/lila-tablebase) reveal
separate licensing/probe/format prerequisites; no tablebase files/outputs acquired.
Ply-based mate-score context from [Chess Programming Wiki](https://chessprogramming.org/Score).
Incidental search snippets disclosed in EXPOSURE.md, with no imported games,
diagrams or routes. Shared data policy/source registry remain unchanged.

Accepted E082 remains378/1085(34.8%). Build322provisional original entries,
57ready/0stale batches;700 accepted-or-candidate(64.5%),385 without ready code.
Deferred combined cumulative regression, exhaustive interactions/absence/priority/
history/budget/original-occurrence audit, exact main/repeat/initially clean
reproductions, real-game precision/usefulness, longer mate distances, tablebase
WDL/DTM/DTZ and general lost-pawn-ending classification. No narrower candidate
discharges those original scopes or establishes prior exchange desirability.

Next unused E137: remaining compatible defensive rook/endgame or strategic work;
preserve long/short-side, Philidor/Vancura, sustainable perpetual attack and licensed
tablebase-format prerequisites. Continue focused batches and cheap pilots.
