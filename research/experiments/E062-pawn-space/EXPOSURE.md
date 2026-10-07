# Authored development exposures

2026-10-07. No acquired games/boards; source metadata only. First target107/107
passes. New pawn controls deny one/two king destinations; legal causal removal
restores them. Prior control by another piece, territory outside enemy half,
remote king, illegal/terminal counterfactuals and actual terminal moves abstain.
Absolute pinned mover removal is illegal, so that valid pawn-control geometry
does not receive this label; no illegal causal board is accepted.

Actual replies may capture the pawn. Urgent hanging-pawn warnings preserve
selection rather than hiding behind Space. Added an actual enemy mating reply,
retained with terminal flag, and castling destination denial with full rights.
Expanded target115/117 passes: both ordinary color versions of the kingside
case pass; generic horizontal reflection clears rights and relocates the king
to d-file, so the supposed mirrored positive is invalid as castling evidence.
Use an explicitly authored standard queenside counterpart Ke8/Ra8/Pd6-d7,
preserving legality and testing denied c8; color reflection also passes.
This is an augmentation correction, not a detector/priority relaxation.

Corrected expanded target117/117 passes. No detector/predicate/priority changes
after target inspection. All actual/counterfactual move sets and exact text
remain independently replayable. Source freeze/full reproductions still pending.

Final cumulative E020–E062 2,939/2,939 passes. Maintained source verification
and diff checks pass before source freeze. Every source/exposure input is
hash-bound in the upcoming main/repeat/clean manifests.
