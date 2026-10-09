# E092 exposure

Synthetic authored mechanics only. Record failures without relaxing scope.

Initial focused expectations refuted: c7 pawn behind d6 can recapture Rxd6,
so neighbor-behind is now a negative certified-target example too. b2b3 does
not change the declared isolated/doubled/island/passer count vector; retained
as a negative unchanged-shape example. Added actual b2xa3 undoubling with a
separately certified d6 target for changed structural asymmetry. No candidate
scope relaxation or hash-bound prior evidence changed.

Added nonchecking rook-on-e8 promotion refutation so route negatives exercise
the actual failed all-defense query, separately from the retained checking
unsafe-transformation input guard. Candidate unchanged. Independent replay
reuses E089's frozen focused negative solver and E037 positive tree replay.

2026-10-09 source-review repair: repeated-target history had to guard the prior
actor move's checking position too. Otherwise constructing its actor-turn
capture certificate can reject a legal current history. Added legal Rd7+ Kh8
Rd6 both-color negatives and explicitly skip prior checking snapshots as PLAN
requires. Broader repeated checking attacks remain unavailable, not inferred.
Retained pre-repair pilot/hash manifests in research/runs/E092/pre-history-guard;
final source/pilot bindings regenerated. No live/frozen or accepted input edited.

Source review also removed an unnecessary exclusion of unrelated last enemy
captures from repeated-target history. Registered scope requires the target
pawn and tracked attacker remain unchanged, not a globally quiet enemy reply.
Added Ra2 Rh2xP Ra3 history where both conditional Rxa7 contacts check and are
independently profitable. Actual full histories and both certificates remain
required; no target/attacker identity or gain gate weakened.
