# E064: newly completed pawn walls and finite legal mobility

2026-10-07. Preregister before implementation/evaluation. Research only.
Original C0974 Blocked position; no extension, numerical research or shutdown.
Reuse frozen E063 and all 2,800 ordered baseline results. D001 gate before
fixtures; locally authored positions only. Do not change prior evidence.

Opt-in blockedPositionTags, maxBlockedPositionNodes integer 0..50000 shared
budget. Default exact E063; exhaustion removes all new events. Actual move
must be a noncapturing, nonpromoting straight pawn advance. Afterward ALL board
pawns form one matched ram per contiguous file, at least four files including
d/e. Each own pawn's forward square holds its matched enemy pawn. No extra
pawns of either side; exact full lists retained. Actual moved pawn closes a
previous gap; its legal advance is in the complete BEFORE own pawn move set.

Actual after enemy pawn move set must be empty. Explicit hypothetical own turn
afterward clears EP, preserves all other state and must be legal/live; its
complete pawn move set must also be empty. This is a counterfactual, not history.
For EVERY actual legal enemy reply: child live, same complete pawn lists and
matched wall retained, complete own legal pawn move set empty. Any capture of
a wall pawn, offered piece allowing pawn capture, terminal reply or pawn move
refutes. At least one reply. No permanent blockade, fortress, draw, best move,
positional advantage, restriction of nonpawn pieces or teaching-benefit claim.

Retain canonical full history/actual move, full before pawn move records,
all pawn identities/matched rams, actual complete enemy move records (not only
pawns), hypothetical own turn FEN/pawn moves, ALL reply records/terminal flags/
full pawn lists/own pawn move sets. Independent replay imports no detector
helpers and recomputes history, legality, material, geometry and every legal
set. Comment <=24 words, qualityClaim false, priority101.025 below urgent and
recent pawn tags but above generic ending/transition. Selected text and urgent
warning preservation checked; current counterfactual excluded if illegal.

Authored four/six/eight-file walls, both colors/horizontal reflection, straight
and double steps; gap/wrong unit/capture/promotion/no closure/noncentral or
noncontiguous/fewer rams/extra mobile or blocked pawn refutations; adjacent
captures, enemy king/rook taking wall pawn, enemy piece offered for pawn
capture, enemy checks, terminal reply/actual terminal; legal EP/history/clock
cases, corruption of material/sets/records/text, default/zero/midway exhaustion.
Target then cumulative E020–E064/source/diff. Log fixture or predicate changes
in immutable EXPOSURE before source freeze; keep prior failed outcomes.

Source commit before main/repeat/initially clean clone. Keep source revision
fixed until all three exit. Exact revision/input/physical output/metrics and
ordered E063 fingerprints plus original-list hash; independently replay saved
JSON. Estimate ~200s/run overlapping3, full evidence <=5MB including manifests
and compact frozen E053 display based on E0633.38MB. Retain and report cost
misses rather than dropping proofs or increasing the declared limit afterward.
Synthetic development evidence does not establish real-game precision or
extension readiness. Only narrowly stated Blocked position scope can be checked.
