# E161 promotion-counter fixture amendment

2026-10-10 after original six-family smoke, before corrected reevaluation. All
six complete actual/alternative trees independently checked; no runtime error.
Queen-ending/general positive fails after ...Kc2/Qxa3/...b1=Q: promotion costs8
against captured pawn1. ...Kc1 works because moving Pb2 exposes Qa3/c1 check,
but one favorable branch is insufficient. Rook/minor roots also free b1 for
promotion. Original alternative-also negative passes only because both queen
policies fail, not the intended two successful policies. Rook defender negative
passes. failure-promotion-counter.json.gz retains all12 raw panels, complete
reports, original sources and dependency hashes. No branch discarded.

Change queen-ending base own Kh8->Kd3, legally covering c2, leaving ...Kc1 and
the genuine pawn pin after Qxa3. Keep actual Qa6, alternative Qf7 and targeta3.
General-only and alternative-also families use same corrected root. Move added
defender rook b3->b8 so it does not check starting Kd3; its ...Rb3+ should refute
the target capture while preserving legal current actual. Army imbalance roots
retain own Kh8 and enemyKh1, change Pb2->Pb3: b-file rook remains blocked after
one step, and pawn cannot promote through declared reply/capture/counter horizon.
Every actual pawn advance/promotion and complete inventory still collected.

Hypothesize corrected base/general/RR/RN positives; Qd6 alternative should now
also cover the objective and withhold comparison. These are explicit differently
authored local positions, not isolated piece-value interventions or broad queen
superiority. No material threshold, queen-survival, claim, live, node or scientific
gate changed. Repeat only tiny six-family smoke because fixtures changed.
