# E072 exposure ledger

2026-10-07. All fixtures are authored synthetic exposed development mechanics;
none are real-game precision or teaching confirmation. D001 test guard passed.

First pilot failed while importing the reversed exchange fixture: a knight was
asked to move c8-c5. Replaced the authored recapturing piece by a rook before
evaluation, keeping the preregistered nonpawn-recapture requirement unchanged.
Second pilot found an invalid root with an already checked nonmoving king e5;
relocated the authored king to g5 to isolate a newly checking f-pawn move and
the illegal counterframe gate. Also found an eight-ply king cycle had already
ended by third repetition; shortened to six legal plies, before terminal history.
No detector gate loosened. Pawn moves reset the fifty-move clock and irreversibly
change placement: these cases verify clock/repetition handling, not manufacture
terminal defenses after an irreversible new formation.

Corrected 152-case smoke passed with 20 Stonewall and16 Maroczy certificates
before adding three further cases (terminal promotions and delayed recapture).
Focused 170-test development suite passed5.8s before adding an original-pawn
en-passant exchange case. Both colors and fixed-file
horizontal negatives; support/control, en-passant, promotion and
terminal reply proofs checked independently. Completion remains unproven until
full cumulative/source/diff gates and frozen exact main/repeat/clean evidence.

Final focused174 tests passed8.2s; full cumulative4,336 tests passed143.7s.
Maintained source and diff checks passed. The original-pawn en-passant case is
positive in both colors and a fixed-file horizontal negative. No evidence gate,
comment word limit or prospective storage budget changed after pilot exposure.
