# E106 combined ending-conversion policies

2026-10-09 provisional research-only batch, preregistration2788d54.
endingConversionTags defaultfalse wraps unchanged E105; horizon0..6 default4,
shared atomic node budget0..50000 default50000. Four scopes: C0602 actual capture
removes last non-pawn piece, enters live pawn ending and complete finite mate-OR-
surviving-tracked-queen policy; C0977 same plus failed same-goal legal alternative;
C0738/C0739 exact K+R+P versus K+B/N actual rook removes minor and proves full
conversion. Broader simplification quality, tablebase outcomes, optimal endgame
transition and general rook/minor technique remain pending. No accepted advance.

One OR-goal minimax includes mate by ANY actor unit, all legal choices including
underpromotions, continuations after tracked pawn loss/nonqueen promotion and
failed queen-survival probe. Full actual history, draws and clocks preserved.
Canonical UCI ordering; no caches. Independent checker imports legal machinery
only, replays every required strategy/counterpolicy edge and full inventories.
Query goal queen must retain positive nominal gain and survive every immediate
enemy reply without terminal draw or enemy mate. Common BEFORE-move nominal
balance for actual and alternatives, including root promotions; dated amendment
and initial illegal fixture failures openly retained in EXPOSURE. Default helper
baseline its root FEN. All assertions finite, not unbounded wins or best moves.

32 focused tests passed2.7s; E029 affected mate checks passed4.2s;3 representative
E105 disabled/strict/history checks passed. Full JSON independent replay and
changed legal inventory, goal, reply, baseline/alternative rejection checked.
16 guarded authored D001 pilot cases retained;10witnesses,6successful fullpolicies,
2exhaustions. Two colors, pawn transition positive, bishop/knight conversion,
short/zero bounds, extra material/no-capture negatives. Independent saved replay
passed all16 and111 normalized complete source/fixture/dependency hashes.
Source verification and diff checks passed. No engines, acquisitions, game
contents, full cumulative suite or regeneration of unchanged historical evidence.

Evidence research/runs/E106/pilot and this folder/evidence. Gzip26,661bytes SHA256
9996fe03b1dbaba4705694658267fa9d03516573cffd33ad56e88e5dcc536ece.
Plain226,877bytes SHA256
b2a94d0f8d99ffd607e73f343da8e7fa146610cb64f52ad3377100ad23e465c2.
Run binds2788d54 plus actual working source hashes, not claimed pristine checkout.
Replay node research/experiments/E106-ending-conversion-policies/code/replay-saved.mjs
Deferred combined regression, full semantic/interaction/priority/absence/history/
budget matrix (including mixed mate/queen branches and pawn-loss-to-mate cases),
exact frozen main/repeat/initially-clean reproductions, original occurrence audit
and real-game usefulness. Pilot proves only its saved synthetic cases.

Accepted E082 remains378/1085,328verifiednames,76partial,631unimplemented,
707remaining,63completed studies. Provisional212entries,27readybatches,0stale;
590/1085accepted-or-candidate54.4%,495withoutcandidate,668workingbacklogitems.
Resume same isolated research/runs/E020/clean on codex/coach-concepts-e058-evidence.
Shared main2d3fc0b currently includes E105; import only completed E106 result
using existing transfer branch and clean main fast-forwards. No jobs live.
Next coherent batch: broader tactical liquidation/conversion with shared OR-goal
policies, or compatible pending material/exchange scopes; inspect current tracker
and prerequisites before preregistration. Keep all1085original entries in scope.
Latest primary93%used/7%remaining,secondary92%used. Full objective incomplete.
At about95%primary usage, stop, commit resume state and authorized PC shutdown.
