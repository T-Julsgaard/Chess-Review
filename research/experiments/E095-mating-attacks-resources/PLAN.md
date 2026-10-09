# E095 complete mating attacks and defensive resources

Registered2026-10-09. Default-disabled matingAttackTags wraps E094. Reuse unchanged
E029 query and independent replayQuery, E024 legal history/castling records,
E020 legal/material helpers. attackPlies integer0..5(default2), maxAttackNodes
integer0..50000(default50000), compareMateDefenses boolean(defaultfalse).
One atomic shared budget for actual and all queried alternative continuations.
All-defense policy, quiet moves included; complete legal moves, positive mate
leaves, repetition/50-move/stalemate/insufficient draw stops per unchanged E029.
No failed finite mate search proves safety. No claim of optimal mate distance.

C0408 actual move forces own mate within specified further plies; complete
opponent defense policy. C0129 same forcing mating sequence, no reasonable-move
filter. C0412 additionally requires recorded legal castles on opposite wings,
current surviving own/enemy kings still on their recorded castle squares.
C0417/C0095 actual pawn capture removes geometrical king cover, nonking mover
has positive nominal cost difference and legal capture acceptances, yet ALL
legal replies (including declining) allow forced mate. C0096 actual Bxh7+ or
Bxh2+ against home g-file king, positive sacrifice cost/acceptance and complete
mating proof. No intent or opening provenance inferred from shape.
C0469 actual forced actor mate or actual terminal draw, with at least one other
legal root move allowing certified enemy mate at SAME further-ply horizon.
C0471 same resource with actual capture/check tactical trigger. Also report
only-certified-resource when ALL other root moves have positive enemy mate
proofs. C0470/C0458 broader only-defense/evacuation remain outside build coverage
until representative positive evidence; do not count untested scope.

Both colors, checking and quiet policies, accepted/declined sacrifice replies,
legal history/opposite castles, no-history negatives, horizon/countermate/draw
refutations, strict controls/default equality, atomic budgets, independent tree
and conditional-label replay/tampering; focused E095/E094/E029/E030 checks,
cheap guarded authored D001 pilot, source verification and staged diff checks.
No actual game contents or new data acquisition. Retain eligible E029 historical
evidence unchanged; a new pilot is only for changed wrapper semantics/labels.
Defer combined full suite, complete saved semantic/absence replay, interaction/
priority/history/budget matrix, exact3 reproduction, occurrence audit, usefulness
and optional-claim interface review. This bounded mating subset does not solve
all king attacks, defensive choices or strategic sacrifices; catalog preserved.
Shared/isolated clean b993e83; no live input mutation. Safe local completed-only
FF to existing shared research branch and clean main, never push. Last five-hour
usage76%used, stop/save/shut down under user authorization at about95%used.
