# E128 — provisional causal locked structure and unique king guards

2026-10-10. Preregistration8712c4b, parent E127 c1bd2a5. Authorized current main,
local research commits/no push. Accepted tracker, production/numerical unchanged.
C0229/C0912/C0914/C0780 share the exact first-capture graph; broader structure,
weakness/fixation and penetration strategy remain open.

Default-false lockedStructureTags, strict maxLockedStructureNodes integer0..500000
default500000. Disabled exactly E127, no implicit parent flags. Atomic extra
exhaustion discards E128 only; enabled inherited correspondence remains intact.
Exactly king+pawn each, same file, no rights/EP, live validated history.

Fixation: actual single quiet pawn step creates a blocked pair. The opponent's
target pawn is forced into FIRST capture under the complete E127 graph. In a
legal live fresh BEFORE frame granting opponent the turn, its single advance
into the old gap must have led to a graph-safe locked pair. Both graph certificates
and exact frame, escape move/inventory and resulting position retained. Thus an
actual immobility change has a verified functional escape-loss consequence.
The comparison is a hypothetical opponent turn, not an actual alternative move
available to the actor, and proves neither optimal advice nor full game outcome.

Static/structural labels additionally require a legal live fresh opposite-turn
AFTER frame whose same target is also first-capture losing. Both rank paths fit
the clock. Pawn immobility persists until first capture, and all legal king
continuations are quantified without an artificial depth cutoff. Actual pawn
advance resets the clock and irreversibly creates a new pawn layout; earlier
history repeats cannot cause threefold along its strictly descending rank path.
A turn-dependent fixation correctly gets neither static nor structural label.
Full game loss, net material after subsequent captures and complex formations
are not established by the first-capture model.

Unique guard: with a pre-existing locked pair and quiet king move, actor is graph
defender. Enumerate EVERY legal root alternative. Actual must be safe; every
other move must be first-capture losing, with at least one alternative. Capturing
the opposing pawn first is safe and refutes uniqueness; actual draws are safe.
Losing needs complete unique actual history and clock+rank<=100, otherwise
unknown. Safety stops at first capture/draw and is not preservation after the
other pawn was removed. No generic best-move/penetration advice.

Authored Ka5 Pd3 versus Ka3 Pd5: d4 removes the graph-safe hypothetical ...d4
escape. New target Pd5 is first-capture losing at rank6 with Black to move and
rank5 with White to move. Near Kc5/Kc3 yields rank2/1. Kd8 versus Kd6 has rank8
actual but SAFE opposite turn, so fixation only. Ke1/Kg1 d4 has a safe actual
target, hence no fixation; Kc6/Kh1 keeps the prior escape losing, hence no causal
fixation label. For Ke1 Pd4 versus Kg1 Pd5, ...Kg2 uniquely guards Black's pawn;
...Kh1/...Kh2 have rank9 loss. Root halfmove90 fits the exact capture bound,
halfmove91 leaves unknown alternatives. Multiple safe replies and capturing
alternatives refute uniqueness. Both colors, irreversible history reset, repeated
guard history, profile, terminal and exact budgets retained.

Prospective development discovery used two fixed pawn-pair graphs. Pd4/Pd5:
6564states,38280edges,3053winning/3511safe,maxRank19. Pd3/Pd4: same state/edge
counts,3493winning/3071safe,maxRank18. Initial enumeration found four static
examples; expanded enumeration within the same registered family retained the
turn-dependent example too. Nodes130621 across two graphs. Guarded receipt and
discovery saved to research/runs/E128/discovery.json; script/family provide the
development rebuild recipe. No external game/study fixture or holdout claim.

All58 focused checks pass in32.6seconds; three representative E127 disabled/
strict/history checks pass in0.7seconds. Source verification and diff checks pass.
No cumulative inherited suite or engine/historical collection. Guarded D001-test
pilot36cases:12positives,6expected extra exhaustions. Independent saved semantic
replay passes24witnesses and all137 normalized source/fixture/parent hashes.
Checker imports neither candidate nor graph solver; E127 neutral graph checker
reconstructs all legal states/edges and proves rank/safety closure, then E128
reconstructs frames, targets, escapes, EVERY alternative, actual history/clock
and exact labels. Mutation checks reject changed certificates, frames and rows.

Evidence copied from research/runs/E128/final to evidence/results.json.gz and
evidence/run.json. Revision, actual source/input hashes, environment/argv, null
engine/seed and guarded receipt retained. Plain912136bytes, gzip79669bytes.
Packed SHA256 6af9c94af3150378aa7e4f2ebcf37ba4015c3ce122f728d7c0879b22159f1ffd;
plaina10339712fa96d813d3b7452057115b27873c87b17c5e36761057f13ca447039.
Replay: node research/experiments/E128-locked-structure-guards/code/replay-saved.mjs

Accepted E082 unchanged378/1085(34.8%). Build307provisional original entries,
49ready/0stale batches;685accepted-or-candidate(63.1%),400without ready code.
Deferred combined full regression, exhaustive semantic/absence/priority/history/
budget/integration/original-occurrence audit, exact main/repeat/clean and real-
game precision/usefulness. Opposite/escape illegal-frame matrices, all files/ranks,
multi-pawn structures and post-capture outcome remain gaps. Research-only wording
must keep hypothetical comparisons explicit when later presented to players.

Next unused E129: continue remaining coherent families, including knight tempo
invariants or finite rook interpositions with outcome prerequisites explicit.
Do not turn first-capture proofs into full-game labels or run long cumulative
tests before the approved combined stage.
