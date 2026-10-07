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

Registered-case pilot: four failures. The intended dead-position capture began
with K versus K+N, already an insufficient-material terminal root, so both colors
correctly returned unavailable. Retain that observation; add own Nb3 so the
initial two-minor position is live and Ka1xa2 leaves K+N versus K. The intended
Qg6g5 stalemate left h7 available; use Qg6f5, controlling h7 while Kf7 controls
g7/g8. A tamper test selected the first parent event instead of the new movement
certificate; select the explicit piece-movement ID. All legality/terminal and
priority gates remain unchanged. These corrections change authored probes,
not registered claim definitions.

The next selected-comment audit failed: the initial foundation priority 100.8
overrode check (75) and the parent rook-lift annotation (76) on c3g3. That violated
the registered low-priority descriptor requirement. Lower all accepted foundation
priorities to 4.3–4.8, below even the parent's nominal material annotation (5).
Keep the rejected-input refusal separate: no actual move exists there. Test
selected output against the parent for check, mate and stalemate overlaps, and
retain the check event without assuming it outranks another parent insight.
This is an implementation correction to the original precedence gate, not a
gate relaxation. Inventory wording also avoids singular/plural count errors.
