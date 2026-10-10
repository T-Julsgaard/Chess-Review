# E127 — provisional locked-pawn corresponding-square response systems

2026-10-10. Preregistration5df6860, parent E126 99df94c. Current main authorized,
local research commits/no push. Accepted tracker, production/numerical unchanged.
Four original occurrence scopes C0275/C0392/C0612/C0653 share an implemented
king-response system; general corresponding squares and game outcomes remain open.

Default-false correspondenceTags; maxCorrespondenceNodes integer0..250000
default250000. Disabled exactly E126, extra atomic exhaustion preserves every
parent event, including enabled E126 trebuchet. Exactly king+pawn each, same-file
adjacent blocked white/black pawns, no rights/EP, live validated quiet king entry.

Complete first-capture graph over8192 slots: exclude overlaps, adjacent kings
and nonmoving king in pawn check; include every legal king move/capture. Capture
of defender pawn is attacker goal; capture of attacker pawn ends safely for
defender. Noncapture terminals/infinite cycles are safe for this declared
objective. Safety ends at first capture, not indefinite pawn preservation after
the other pawn disappears. No engine/tablebase/game win/draw assertion.

Attacker-OR/defender-AND retrograde ranks prove forced first capture, with strict
rank descent; complementary safety closure provides the opposing strategy.
Certificate retains all8192 ranks and graph counts, not duplicated edge tables.
Neutral checker reconstructs ALL legal vertices/moves with chess.js and proves
both rank equations and safe-region closure. Certificate cache keys hash the
whole supplied graph; mutated rank/count certificates invalidate the cache.

At actual defender turn, list EVERY legal reply. Require exactly one safe quiet
king reply and at least one losing reply. Follow it, enumerate EVERY next actor
choice and all defender replies, and require another unique safe quiet reply
with DIFFERENT actor/defender destinations. This is a linked system, not a single
king contact. Unknown replies withhold uniqueness. Losing uses actual full
history without repetitions so far and clock+rank<=100, covering every quiet
ply before final resetting capture. Strict rank descent prevents new path loops;
previous unique positions cannot become threefold. Actual terminal draws are
safe. Repeated histories and future branches that repeat history are unavailable
or unknown, rather than fabricated pawn-loss proofs.

Prospectively authored discovery family Pd4/Pd5:6564 legal states,38280 edges,
3053 attacker-winning versus3511 safe states, maximum rank19. Development
enumeration located: Kd1-e1 versus Kg1 requires ...Kg2; next Ke2 requires ...Kg3.
Kd1-e2 and Kc1-c2 versus Ka2 yield separate linked systems. Both colors and
distinct known two-ply history pass. A far defending king has multiple safe
replies, hence no correspondence label. Insufficient clock makes ...Kh1/...Kh2
unknown; draw-bound replies all become safe. Unblocked/missing/extra pawns,
extra piece, repeated history, pawn-capture initiator and illegal inputs are
rejected. No external diagram or game was admitted.

First discovery was evaluated only after registration; it produced three
representatives. Repeated discovery after changing only receipt retention/logging
gave identical candidates/counts, retaining research/runs/E127/discovery.json.
The script and fixed family provide its development rebuild recipe; final
source-bound pilot is the retained claim evidence. No holdout confirmation.

Initial semantic smoke independently replayed one full graph. Optimized the
neutral checker to derive successor IDs from chess.js-validated moves rather
than replay each edge with redundant move generation; legal enumeration and
proof obligations unchanged. Initial51 focused checks passed in13.4seconds.
Added prospective-history and capture-initiator safeguards; final53 pass in
9.1seconds. Three representative E126 disabled/strict/history checks pass in
0.9seconds. Source verification/diff checks pass; no cumulative inherited suite.

Guarded D001-test authored pilot32cases:8positives,6expected extra exhaustions.
Independent saved semantic replay passes14witnesses and all136 normalized
source/fixture/parent hashes. Replayer imports neither candidate nor graph solver;
reconstructs complete graph and actual response/follow inventories, history,
clock, terminal, exact linked pair and labels. No acquired games/labels/engine,
fresh holdout, production promotion or pristine frozen reproductions.

Evidence copied from research/runs/E127/final to evidence/results.json.gz and
evidence/run.json. Revision plus actual source/input hashes, environment/argv,
null engine/seed and guarded receipt retained. Plain434803bytes, gzip43651.
Packed SHA256 2196dc57eed4b428ef6eeb8d58193224808a2ad6db88f524353373b4f2d7d514;
plaincdbc3d198d5d34804ab44c608ae6ad0d148ea8c7d0e978211c5031045c3e6c23.
Replay: node research/experiments/E127-locked-pawn-correspondence/code/replay-saved.mjs

Accepted E082 unchanged378/1085(34.8%). Build303provisional original entries,
48ready/0stale batches;681accepted-or-candidate(62.8%),404without ready code.
Deferred combined full regression, exhaustive semantic/absence/priority/history/
budget/integration/original-occurrence audit, exact main/repeat/clean and real-
game precision/usefulness. All-file/rank, reserve-pawn, multiple blocked chains,
post-capture conversion and general full-outcome corresponding systems unresolved.

Next unused E128: inspect finite rook bridge/interposition and knight tempo
invariants, with stronger rook-outcome prerequisites kept explicit. Reuse graph
machinery where the actual objective matches, never substitute first-capture
results for tablebase wins. Continue focused batches/small pilots, no long tests.
