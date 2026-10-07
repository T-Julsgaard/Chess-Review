# E075 development exposure

2026-10-08 first focused pilot: 23 tests, two failures (synthetic cases 5 and 7),
both `Invalid position: non-moving king is in check`. Initial bishop FEN
`7k/7p/8/8/8/2B5/P7/K7 w - - 0 1` and queen FEN
`7k/7p/8/8/8/2Q5/P7/K7 w - - 0 1` put a white slider on c3 against black Kh8
on an unobstructed diagonal before white's move. The intended c3d4 movement
probe had an illegal root. Move black king to g8 in both authored inputs,
retaining the move and every legality gate. No detector/replayer relaxation.

These are exposed pilot fixtures, not decisive or independent precision data.
The first pilot does not cover every registered gate. Separate fixtures for
all remaining colors, captures, terminal/history behavior, exact army comparison
and overlapping tactical warnings remain required before source freeze.
