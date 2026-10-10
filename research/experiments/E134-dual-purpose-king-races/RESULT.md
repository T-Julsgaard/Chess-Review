# E134 — provisional bounded dual-purpose king races

2026-10-10. Preregistration783439d; pre-evaluation clarification47f9f82;
disclosed fixture amendments47734d4 and58f9757. Parent E133f57d4ad.
Authorized current main, local research commits/no push. C0655 has one narrow
candidate scope; broader Réti maneuver and full-game outcomes remain unresolved.
Accepted tracker, numerical research and production unchanged.

Default-false kingRaceTags; strict maxKingRaceNodes integer0..50000 default50000
and kingRacePlies integer0..10 default10. Disabled exactly E133. Atomic extra
exhaustion preserves parent events/comment. Actual quiet diagonal king move in
live K+P versus K+P, no castling/en-passant rights, must reduce Chebyshev distance
to both unchanged pawns. Geometry alone never certifies the maneuver.

Complete bounded legal policy must guarantee A OR B against every enemy choice:
A eliminates the tracked enemy pawn or its promoted successor, including a capture
leaving bare kings; B promotes the own tracked pawn to queen and keeps that queen
alive through every immediate enemy reply, with live positions. Queen probes extend
one ply beyond the declared policy horizon. No positive material-gain requirement;
retain all balances and gains. Terminal outcomes without a fulfilled resource fail
this operational test, without establishing a lost chess game. Require separate
complete failures of capture-only and queen-only policies at the same horizon:
the combined success must depend on adapting to the opponent's choices.

Search ORs own moves and ANDs enemy moves. Save required chosen/all branches in
a DAG, keyed by full FEN/clocks, tracked identities, remaining horizon, mode and
repetition ledger since the last irreversible pawn move/capture. Full supplied
history still controls terminal checks. Independently reconstruct that ledger on
replay; no FEN-only cache. Retain failed combined/single-resource witnesses too.
The checker imports neither search nor memo helper and verifies legal inventories,
identity transitions, goals, queen probes, material, histories and exact labels.

Original authored Kh8/Pc6 versus Ka6/Ph5, Kg7 H10 failed:10727ticks, with the
mirrored case9023ticks. This is an unmet bounded-resource hypothesis, not a
refutation of the classical drawing idea. One retained defense to the tempting
route is 1.Kg7 h4 2.Kf6 Kb6 3.Ke5 h3 4.Kd6 h2 5.c7 Kb7 6.c8Q:
the queen on c8 can be captured by Kb7, so B fails its immediate-reply probe.
Independent saved replay checks the complete retained negative policy, not only
this illustrative branch. A second authored Kf5/Pc6 versus Kb5/Pc3, Ke4 H4
also failed223ticks (mirror239): same-file queen capture defeats the resource.
Both failures remain required pilot cases, without altered goals or budgets.

Prospectively added after those disclosed failures, Kf5/Pc6 versus Kb5/Pd3,
Ke4 H4 succeeds in547ticks in both colors: ...Kxc6 requires stopping the enemy
pawn, while ...d2 permits the own queen resource. Combined proof54nodes has
7 stopping and17 queen leaves. Capture-only69node refutation selects ...d2;
queen-only59node refutation selects ...Kxc6. This variant is exploratory build
evidence, not independent confirmation or broad maneuver acceptance. Short-bound,
wrong geometry, zero budget, extra-piece profile, actual pawn move, clock terminal,
full history and single-resource-already-suffices controls also checked.

36 focused checks passed18.7s, including15 proof mutations, exact547/546 atomic
budget boundary, strict inputs and enabled-parent preservation. Three representative
E133 parent checks passed0.4s. Source verification and diff checks pass. No full
cumulative suite, engine/tablebase search, acquired-game evaluation or long tests.

Guarded D001-test authored pilot12cases:2 positives,2 expected exhaustions and
8 retained witnesses including negatives. Independent saved semantic replay passes
all8 witnesses and144 normalized source/fixture/dependency hashes. Original H10
failure stays unresolved rather than being silently replaced by the later positive.
Evidence copied from research/runs/E134/final to evidence/results.json.gz and
evidence/run.json. Actual source revision58f9757, source hashes, environment/argv,
null engine/seed and guarded receipt retained. Plain1616719bytes,gzip128227.
Packed SHA25673688356127f310ebf41f52981520398a4d1c46343718a37deba1c5fb8fbae25;
plain2055836d866cefdf947c283e7ae1dca2373ac1575f93030b069a0c1425be8a3c.
Replay: node research/experiments/E134-dual-purpose-king-races/code/replay-saved.mjs

Accepted E082 remains378/1085(34.8%). Build318 provisional original entries,
55ready/0stale batches;696 accepted-or-candidate(64.1%),389 without ready code.
Deferred combined regression, exhaustive interaction/absence/priority/history/
budget/original-occurrence audits, exact main/repeat/initially clean reproductions,
real-game precision/usefulness and broader full-game outcome evidence. A finite
resource policy is not a tablebase draw/win or general Réti maneuver detector.

Next unused E135: remaining compatible finite rook/endgame or strategic scopes;
continue focused batches and cheap pilots without cumulative tests. Preserve the
original maneuver's unresolved horizon/resource/outcome prerequisites explicitly.
