# E161 rook-knight blocked-pawn objective amendment

2026-10-10 after third smoke, before fourth. Nc1 fixes direct target recapture
but enables ...Ra1b1/Qxa3/...a1=Q and ...b3b2/Qxa3/...b1=Q. Both promotions
correctly refute material retention. Other five families pass. Retain all six
paired trees/sources in failure-vacated-promotion.json.gz; no threshold changed.

For rook-knight family restore Nb1, keep Pb3 and add black Pa4/Pa5, targeta3->a5.
Full army White Kh8 Qf6 vs Black Kh1 Ra1 Nb1 Pa2 Pa3 Pa4 Pa5 Pb3. Actual Qa6,
alternative Qf7 unchanged. a-file pawn stack blocks all a-pawn forward promotion;
b3 advance cannot promote through stated horizon unless Nb1 vacates, in which
case only one remaining pawn move occurs. Stationary Nb1 does not attack a5;
after legal knight move, its next move returns to original square color, while
a5 has opposite color, so should not capture Qa5. All actual legal inventories,
promotions, target advances, material and queen-survival checks remain mandatory.

This explicitly different blocked-pawn position adds representative rook-knight
coverage instead of replacing it with the easier bishop case. Rook-bishop remains
a separate planned focused probe using opposite-color targeta3. Neither success
claims generic activity or army superiority. Repeat only tiny smoke; preserve all
three failed fixture sets and broad unresolved scopes.
