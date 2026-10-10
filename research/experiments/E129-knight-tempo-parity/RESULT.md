# E129 — provisional knight-only odd-tempo impossibility

2026-10-10. Preregistration58f442c, parent E128 3de664a. Authorized current main,
local research commits/no push. Accepted tracker, production/numerical unchanged.
C0708 has a global knight-placement invariant and actual-history explanation;
other-piece waiting resources and overall move quality remain unresolved.

Default-false knightTempoTags; strict maxKnightTempoNodes integer0..50000
default50000, knightTempoMoves odd integer3..9 default3. Disabled exactly E128.
Atomic extra exhaustion preserves inherited events, including enabled fixation.
No army-count cap: material at the segment boundaries contains only kings,
pawns and knights, actor has a knight, rights/EP absent. Actual quiet knight move
must leave a live board. Missing or too-short legal history abstains.

Use last2N-1 legal plies including actual move: all N actor moves quiet knights,
all N-1 opponent moves quiet nonpawns; opponent's entire army placement returns
exactly and actor's other pieces stay fixed. Retain strict full history, segment
index/records, before/after armies, rule fields, counters and every actor transition.
This binds a relevant tempo attempt instead of labeling any isolated knight move.

Complete64-square geometric knight graph has336 directed edges,32dark/32light
squares. Every edge changes square color. A quiet legal knight move changes
the dark-square count by +1/-1, toggling its parity. Therefore ANY knight-only
restoration of collective knight placement needs an EVEN number of own moves,
including multiple identical knights and identity permutations. The graph is a
superset of legal quiet moves, not an assertion that every jump is legal in the
actual position. No finite search cutoff, draw/zugzwang/optimality or assertion
that even moves suffice. Kings/pawns and other tempo resources are not excluded
by this theorem. E065's actual king triangle remains separate accepted evidence.

Authored Ka1 Pa2 Ng1 versus Kh8: Nf3 ...Kh7 Nh4 ...Kh8 Nf5 restores the opponent
but changes own knight-placement parity. Five-move route through f3/h4/f5/h6/f7
also passes (final move checks without ending the game). Two-knight example
Nb1-c3, Ng1-f3, Nc3-b1 returns the first knight while full placement changes from
b1/g1 to b1/f3, so a single tracked identity cannot fool the proof. Enemy knight
b8-c6-b8 return also passes. Both colors, mixed own king/pawn moves, captures,
nonreturning enemy, extra bishop, missing/short/window-mismatched history and
fifty-move terminal actual are retained. Strict controls and exact node boundary
pass; first positive uses409nodes. Larger N7/N9 matrices remain combined work.

First focused attempt failed while loading fixtures: extra Bb1 controlled the
proposed ...Kh7 square. Diagnostic spec output located that illegal authored
route. Moved the extra bishop to c1, preserving the profile-negative purpose;
no proof rule changed. Initial45 focused checks passed in1.8seconds. Added
history/actual capture negatives and enabled-parent budget preservation; final
50 pass in2.1seconds. Three representative E128 disabled/strict/history checks
pass in2.2seconds. Source verification and diff checks pass. No cumulative suite,
engine search, long historical recollection, acquired games/labels or holdout.

Guarded D001-test authored pilot32cases:8positives,4expected exhaustions.
Independent saved semantic replay passes8witnesses and all138 normalized source/
fixture/parent hashes. Checker imports neither candidate nor graph generator;
independently enumerates jump offsets, proves full bipartition, reconstructs
actual legal history, every count/parity transition, collective placement,
opponent return and labels. Mutations to edges/colors/segment/history/restoration/
counts/counters are rejected. No metadata-only substitute for semantic proof.

Evidence copied from research/runs/E129/final to evidence/results.json.gz and
evidence/run.json. Revision, actual normalized source/input hashes, environment/
argv, null engine/seed and guarded receipt retained. Plain125398bytes,gzip17521.
Packed SHA256 1d583a0ad1d69b1bf287384fc1e20f09372bc5a0284c3d7cacc665f0f919b507;
plain060878fd5e7d19d62fad6566e1ec1eabf190573ba3aee51b476febf2045b26c3.
Replay: node research/experiments/E129-knight-tempo-parity/code/replay-saved.mjs

Accepted E082 unchanged378/1085(34.8%). Build308provisional original entries,
50ready/0stale batches;686accepted-or-candidate(63.2%),399without ready code.
Deferred combined full regression, exhaustive semantic/absence/priority/history/
budget/integration/original-occurrence audit, exact main/repeat/clean and real-
game precision/usefulness. Larger windows and complex histories/material are
combined gaps; no broad inability to spend a tempo with the rest of the army.

Next unused E130: inspect remaining phase3 position/opening forms and phase4
finite rook/defense scopes. Preserve prerequisites for perpetual attack, named
rook outcomes and tablebases rather than give unsupported shape-only labels.
Continue coherent focused batches/small pilots; no long cumulative tests.
