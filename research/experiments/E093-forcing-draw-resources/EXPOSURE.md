# E093 exposure

Authored synthetic examples only; retain failures and open amendments.

Focused replay tamper failure: removing history can leave a negative tree valid
under a different history premise. Candidate tree unchanged. Bound checker to
retained original fixture FEN/move/history as well as independent key counts,
so history substitution cannot masquerade as the same observed input. This is
an input-authentication repair, not a change to draw goals or horizon.

Source review: offer identity now uses the en-passant victim square as well as
ordinary landing squares, matching registered nonking unit scope. Added legal
c4/bxc3ep conditional stalemate with available declined defense; it remains a
negative forced-resource example. No assumption that a legal offer is accepted.
