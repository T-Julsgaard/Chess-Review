# E071 terminal-defense fallback correction

2026-10-07. Initial frozen source 53425ae completed three exact full runs and
independent octopus/rejection replay. Additional selected-comment audit found a
failure: terminal-defense-repetition correctly refused the octopus tag, but an
inherited royal-fork comment still promised a capture after every defense. Its
older FEN-only proof missed the third occurrence. Initial full evidence retained
as initial-evidence; this is a selection soundness failure, not study completion.

Before final source freeze, add a mandatory bounded full-history one-ply guard
when octopusTags is enabled AND supplied legal history exists. Reconstruct actual
history/played move and EVERY legal enemy reply; retain full records/terminal
flags. If any defense is game-over, suppress inherited AND-capture claims
(fork, broad-fork, triple-attack, discovered-double-attack), which cannot promise
a later capture after that terminal response. Other inherited observations remain.
Guard independent of outpost/queen-search budgets: valid history <=1000 plies and
one finite legal response set; expose separate guard node count and suppressed IDs.
Default-disabled exact E070 unchanged. On own-budget exhaustion, preserve this
corrected parent result, not an already disproven force-capture claim. This
explicitly supersedes PLAN's exhaustion-preserves-parent wording only for this
terminal-defense correction; own new octopus proofs still drop on exhaustion.
No tactical eligibility or material/terminal acceptance gate is relaxed.

Independent replay validates saved guard history/actual/all response records,
terminal condition and exact eligible suppression; test full-history vs fresh
FEN, zero own budgets and zero outpost budget, disabled exact parent, and tampered
guard records/legal sets/IDs. Final runner invokes guard replay for every enabled
history input. Final verifier audits selected repetition comment lacks any
all-defense capture promise. Repeat focused/full/source/diff gates, freeze new
source and repeat all three exact full reproductions at distinct output paths.
Retain ALL initial proofs/demos/trackers/main-repeat-clean manifests; 20MB evidence
budget unchanged, includes both initial and final full bundles.
