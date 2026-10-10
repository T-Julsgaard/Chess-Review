# E125 — provisional finite ending fork and tempo evidence

2026-10-10. Preregistration6647f2a, parent E124 d1b84aa. Authorized current main,
local research commits/no push. Accepted tracker, production and numerical work
unchanged. C0703/C0620 remain broader than these bounded candidate scopes.

Default-false endingEvidenceTags, strict maxEndingEvidenceNodes integer0..50000
default50000, endingPlies integer0..6 default4. Disabled exactly E124. Enabled
implicitly enables bothWingTags; explicit conflicts rejected. Independent extra
budget exhaustion atomically discards only E125 findings, preserving E124.

C0703 reuses complete E124 capture panels with no additional material searches.
Quiet knight entry, no queens, each side <=2 nonpawn/nonking units and <=2 pawns.
At least two original enemy nonpawn units on a-c/f-h become newly attacked by
the moved knight. Every legal opponent reply must allow that same knight to
capture an original target, with E022's saved one-response certificate and
positive nominal gain relative to BEFORE actual move. No lasting winning ending,
central-file fork coverage, intent or engine optimality claim.

Ka1 Pa2 Pb2 Nb1 Nf1 versus Kh8 Rc4 Rg4: Ne3 proves the fork. Rc4/Rc2 also proves
the same-knight all-defense fork, while E124 correctly rejects both-wing
necessity. Removing Nb1 admits countercheck/mate; one target, old knight pressure,
queen profile, excess pawns and root-relative material loss produce no fork.
Parent exhaustion leaves fork evidence unavailable rather than fabricated.

C0620 pure king plus one own pawn versus king and <=1 pawn, quiet king/pawn
move. E106 full mate-OR-surviving-queen policies are queried at the maximum
bound and binary-searched monotonically. Every queried tree is retained, with
success at minimum M and failure at M-1 unless M0. Bound counts further search
plies from AFTER actual move; the surviving-queen goal also probes the next
opponent response beyond that bound. This is neither DTM/DTZ nor a general
winning/optimal-play claim. Baseline material precedes the actual move.

Kc6 Pd7 versus Kh8, Kc7: queries4/2 succeed and1 fails, giving minimum2. Bound0/1
fail, bound2 succeeds; Pd6-d7 with Kc6 also succeeds at2. Promotion initiators,
missing own pawn, multiple own pawns and fifty-move terminal actual are rejected.
Both colors and full known history are exercised. General tempo strategy and
king-response correspondence need stronger evidence and remain unresolved.

Initial51 focused checks had four failures: same-wing predictions were wrongly
negative in both colors despite valid all-defense captures, and king-versus-king
fixtures correctly threw the inherited terminal-position error. Retained same-wing
as positive without changing the registered rule; replaced terminal fixture with
live king versus enemy pawn and added pawn-move/promotion checks. No solver rule
was weakened. Final55 focused checks pass in18.6seconds. Three representative
E124 disabled/strict/history checks pass in1.8seconds; source and diff checks pass.

Guarded D001-test authored synthetic pilot:42cases,12positives,4expected extra
exhaustions. Independent saved replay passes34witnesses and all132 normalized
source hashes. Checker imports neither candidate nor search solver; it replays
E124 source panels, all capture responses, new target contacts, selected same-
knight captures, every E106 tree and exact binary query sequence/minimal pair.
No acquired games, labels, engine, fresh holdout or frozen clean reproductions.

Evidence copied from research/runs/E125/final to evidence/results.json.gz and
evidence/run.json. Preregistration revision plus actual normalized source/input
hashes, environment/argv, null engine/seed and guarded receipt retained. Plain
661943bytes, gzip55433bytes. Packed SHA256:
66a5a58992226443436e1a8eef3f4d2ef9995a18963da3f5f713bde5954ad8d4;
plain dd86f2935c7455ac1359be544f3a7de2434b887a7a59e4aee4e3eb1e24d757bb.
Replay: node research/experiments/E125-finite-ending-evidence/code/replay-saved.mjs

Accepted E082 unchanged378/1085(34.8%). Build297provisional original entries,
46ready/0stale batches;675accepted-or-candidate(62.2%),410without ready code.
Deferred combined regression, full semantic/absence/priority/history/budget/
interaction/occurrence audit, exact frozen main/repeat/clean and real-game
precision/usefulness. Exhaustive six-ply, reciprocal history, central-target and
complex material matrices are combined gaps; broad definitions remain open.

Next unused E126: inspect remaining phase4 king/pawn and rook-ending families for
compatible finite evidence; record corresponding-squares/lasting-structure
prerequisites before deviations. Continue focused batches and small guarded
pilots, no long cumulative/historical recollection runs.
