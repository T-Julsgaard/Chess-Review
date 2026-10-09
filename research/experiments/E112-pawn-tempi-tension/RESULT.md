# E112 pawn-ending turn resources and retained exchange tension

2026-10-09 provisional build-first research batch. Preregistration 1d5f706,
parent E111 e0b0106. User explicitly authorized current checkout/main because
both recorded isolated paths are absent. Research-only; no push or production
changes. Long cumulative acceptance deferred under BUILD-FIRST.md.

Three original candidate scopes: C0650 spare pawn move, C0764 passing move,
C0183 maintaining tension. Callable default-disabled pawnTempoTags wraps E111;
pawnTempoPlies 0..6 default4, maxPawnTempoNodes 0..50000 default50000, one atomic
budget. Restrict to quiet pawn/king moves in live 4..6-unit pawn endings with
at least two own pawns and no rights/check. Full actual histories and sorted
objective-pawn trials; reuse unchanged E106 complete mate-OR-surviving-queen
solver and independent checker. All alternatives use the same pre-move material
baseline and horizon. No global winning, intent or best-move claim.

Spare/passing requires a distinct objective pawn, full actual and legal fresh
before-placement/enemy-turn conversion, both moved-pawn-removal controls with
stripped pre-move baselines, and a failing legal king alternative. Illegal
artificial frames abstain; pass/removal comparisons are not legal null moves.
Tension requires an available ordinary pawn-capture pair surviving the actual
quiet move, actual conversion, and failure of EVERY available root pawn capture
for that same objective/horizon. EP captures are included among alternatives
but cannot alone establish a retained pawn pair. Comments <=24 words and
qualityClaim:false. Budget exhaustion discards every new event and witness.

Development observations retained:
- Initial six hypotheses: zero new facts. Quiet pawn advances near e6 failed
  conversion; remote h8 defender allowed every king alternative to convert.
- Nineteen legal authored near-d7 reserve roots: thirteen positive, zero budget
  exhaustions. Illegal hypotheses excluded as such, not treated as successes.
- White Kc6/Pd7/Pa2 versus Kb8, a3/a4: four-ply conversion remains with the
  tempo pawn removed, but a legal king alternative fails. Both colors replay.
- White Kc6/Pd7/Pa2 versus Kf8/Pb3, Kc7: two-ply conversion succeeds while
  axb3 fails and a2/b3 tension remains. At four plies axb3 also succeeds:
  detector correctly withholds tension. Failure means finite-goal failure,
  not a claim that the exchange loses the game.
- The d6/e7 hypotheses fail because e7xd6 removes the tracked objective;
  king protection permits recapture but does not preserve pawn identity.
  No gates relaxed to make those hypotheses pass.

46 final focused checks pass in 20.0 seconds, including both colors, known
history, failed/positive comparisons, serialization, strict controls, disabled
equality, atomic exact budget, clock draw and independent frame/inventory/proof/
label mutation rejection. E106 policy 12 checks pass in 0.29 seconds; unchanged
E111 disabled/strict/history representatives 3 checks pass in 0.63 seconds.
Source verification and diff checks pass. No full cumulative suite was run.

Final guarded synthetic pilot: 30 cases, 16 witnesses, 8 positive cases,
4 expected budget exhaustions. Independent replay verifies all 30 cases and
116 normalized source/fixture/dependency hashes, without importing E112 detector
or search implementation. Retained evidence/run.json binds preregistration
revision plus actual working source hashes, runtime/argv, engine:null, seed:null
and D001 eligibility receipt. No acquired games or clean frozen reproduction.
529,991 plain bytes, 47,842 gzip bytes. Packed SHA256
b1bebb98a143b967d80bcd95ebc6c0ddc5c9b5077bdfbfea37b09be124fb8fd9;
plain SHA256 368d6ed40d8d80dfc349da17055406f90fd109ab5f5df149a670ceba08335b1e.
Replay: node research/experiments/E112-pawn-tempi-tension/code/replay-saved.mjs

Accepted E082 unchanged: 378/1085 occurrences (34.8%), 328 names. Build status:
263 provisional entries, 33 ready batches, zero stale; 641 accepted-or-candidate
entries (59.1%), 444 without ready code. Broad original meanings remain in scope.
Deferred cumulative integration, comprehensive semantic/absence/interaction/
priority/history/budget checks, exact frozen changed main/repeat/initially-clean
reproductions, original-occurrence audit and real-game precision/usefulness.

Resume current user-authorized checkout/main, preserve all existing evidence.
Next unused E113: inspect approved rank-filtered backlog for the next compatible
finite pawn-ending/move-order family, reuse existing policies, preregister before
evaluation. Do not repeat unchanged historical searches. Numerical goal unchanged.
