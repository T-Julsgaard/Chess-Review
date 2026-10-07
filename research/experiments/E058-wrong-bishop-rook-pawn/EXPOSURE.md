# Authored development exposure

2026-10-07. Guarded D001 test preflight/imports; no acquired games or engines.

First target exposes wrong authored geometry: Kb6 does not control a8. A legal
king immediately adjacent to a corner cannot coexist safely with another king
controlling that corner in these pure material examples. Use Kc8 versus Kb6
to test no immediate corner move and an illegal approach Kb7; do not invent a
legal adjacent corner denial. Two bishop-root diagonals already checked enemy
kings: distant Kh8 moved to g8, capture target Ka5 moved to a4. A no-pawn K+B
root was already dead; add an enemy rook to exercise nonterminal missing-pawn
exclusion, and cover an actual capture producing dead material separately.
Promotion root king similarly moved from h8 to g8. No algorithm, scope or
comment priority changed; wrong assumptions are exposed before decisive runs.

Corrected initial target passes98 tests. Added actual pawn-capture dead material,
wrong-bishop stalemate and right-colored-bishop actual mate terminal negatives
before final evaluation. Selected comments are asserted for uncomplicated
corner-access and distant-defender examples, preserving promotion priority.

Final target passes110 tests (104 cases plus six proof/selection/guard groups);
cumulative E020–E058 passes2,446 tests. Maintained source and diff checks pass
before source commit. No new draw theorem or strategy claim is evaluated.
