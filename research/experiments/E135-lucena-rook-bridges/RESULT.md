# E135 — provisional rook bridges and recorded Lucena completion

2026-10-10. Preregistration1c8937b, prospective negative-control amendment7324d05.
Parent E1341b6bcfb. Authorized current main, local research commits/no push.
C0669/C0668 gain bounded mechanism/history candidates, not complete endgame
outcomes. Accepted tracker, numerical research and production unchanged.

Definition-only [Chess.com Lucena teaching page](https://www.chess.com/terms/lucena-position-chess)
reviewed2026-10-10: promotion-square king, seventh-rank nonrook-file pawn, rook
cutoff and rook shielding mechanism. Its definition motivates the operational
scope; it does not prescribe this detector or finite policy. Incidental example
prose/moves in responses disclosed in EXPOSURE.md. No source diagrams/games/routes
or acquired game contents used in fixtures/evaluation; boards/history authored.

Default-false rookBridgeTags, strict maxRookBridgeNodes integer0..50000 default50000
and rookBridgePlies integer0..6 default4. Disabled exactly E134, no implicit parent
flags. Extra exhaustion atomically preserves inherited events/comment. Full legal
history if supplied, live root/actual, absent rights/EP. Pure K+R+P versus K+R,
own nonrook-file pawn on relative7. Actual quiet rook move to relative4 must
interpose between checking enemy rook and adjacent supporting own king, all on
the pawn file. Retain the exact checking ray and piece identities.

Geometry is only an entry gate. Complete legal policy ORs own moves and ANDs
every defender reply, forcing the tracked pawn to promote to queen within H.
Queen must survive every immediate enemy reply in live positions with at least
8 material points gained relative to before actual. One-ply survival probe extends
beyond H explicitly. Reciprocal rook exchange is allowed; losing one's rook
while leaving the defending rook does not meet the gain threshold. No full-game
win/mate, optimal move or strategic superiority claim. Terminal outcomes before
the operational goal fail it, without establishing chess loss. No memoization or
history approximation: short legal trees use full chess.js repetition/clock state.
Save all required chosen/all branches, legal inventories and negative witnesses.

Recorded Lucena event additionally requires actual supplied legal history from
the seventh-rank pawn, own king on its promotion square and own rook on an entirely
clear file strictly between pawn and defending king at least2files away. Save the
whole cutoff file, initial king/rook/pawn/enemy king, and exact history. Track the
same own rook, with no pawn move/capture/promotion anywhere in the history. Current
bridge and the complete promotion policy are still required. No-history geometry
never fabricates this provenance, and blocked initial cutoff removes the Lucena
event while preserving an otherwise proven current bridge.

Authored Kc5/Pc7/Rd4 versus Kf7/Rc1, Rc4 H4 passes1738ticks; mirror1968.
The complete root defender inventory includes ...Rxc4, answered by Kxc4 and
promotion, alongside waiting/other rook/king choices. Positive retained tree has
8 all-enemy nodes,114 own-choice nodes,107 surviving-queen leaves. Recorded history
starts Kc8/Pc7/Rd4 versus Kf7/Rc1 and follows Kb7 Rb1+ Kc6 Rc1+ Kb5 Rb1+
Kc5 Rc1+, then Rc4. Legal history is independently reconstructed; passes1746ticks,
mirror1976. These authored mechanics are not real-game precision/usefulness data.

H0 retains a failed limit proof. Near defending king Kd7 with own Re4 instead of
Rd4 retains a real H4 refutation42ticks: ...Rxc4 is selected first, and a later
...Kxc7 branch loses the tracked pawn. Geometry alone therefore cannot label it.
Unsupported king/shield, wrong rank, rook-file pawn, missing pawn/extra piece,
clock99 terminal, zero budget, strict inputs, illegal actual/history mismatch,
no-history versus full history, blocked initial cutoff and enabled E134 parent
preservation checked. Exact1738 passes,1737 exhausts atomically.

Initial42focused/18pilot passed; prospective amendment registered the near-king
negative before evaluation. Extended focused run failed one assertion expecting
...Kxc7 as the FIRST refutation, while deterministic ordering chose ...Rxc4.
Corrected the test to require a valid counterchoice and the retained ...Kxc7 pawn-
loss branch, not an arbitrary first move. Detector, checker, goals and budgets
unchanged. Final45focused pass23.3s; 3 representative E134 parent checks pass0.4s.
15 witness mutations plus event-label mutation rejected. Source/diff checks pass.

Guarded D001-test final20case pilot:4 positives,2 expected exhaustions,8 retained
positive/negative witnesses. Independent saved semantic replay passes all8 and
146 normalized source/fixture/dependency hashes. Checker imports neither detector
nor solver: reconstruct full history, initial cutoff, ray/support/identities,
all legal defender branches, own choices, tracked promotion, material/queen probes
and exact labels. Original18case run retained at runs/E135/final; added negative
run at final20; final-checked rerun binds corrected test source without changing
solver behavior. No full cumulative suite or inherited historical recollection.

Evidence copied from research/runs/E135/final-checked to evidence/results.json.gz
and evidence/run.json. Revision7324d05 plus actual source hashes, environment/argv,
null engine/seed and guarded receipt retained. Plain698503bytes,gzip53330.
Packed SHA256bf2c53475cea88064f9a8fbeba66ea934f068fbc14b3d8705a169235f01c8cc1;
plain dbba8dc5dce6d351c92135f2cf9b9791414b2ad3f11f9bb3197e5d79aad7da1d.
Replay: node research/experiments/E135-lucena-rook-bridges/code/replay-saved.mjs

Accepted E082 unchanged378/1085(34.8%). Build320provisional original entries,
56ready/0stale batches;698 accepted-or-candidate(64.3%),387 without ready code.
Deferred combined regression, exhaustive interaction/absence/priority/history/
budget/original-occurrence audit, exact main/repeat/initially clean reproductions,
real-game precision/usefulness, general Lucena conversion/initial bridge preparation
and full-game win/mate. Full C0668/C0669 catalog ambition remains unresolved beyond
this witnessed bridge-completion scope; finite promotion is not ultimate victory.

Next unused E136: compatible long/short-side, Philidor/Vancura or other endgame
policy work. Preserve sustainable perpetual-attack and tablebase/full-outcome
prerequisites. Continue focused batches/cheap pilots, with cumulative gates deferred.
