# Authored development exposure

2026-10-07. D001 test preflight and guarded fixture imports. No acquired games,
engine evaluations, numerical fitting or extension changes.

First target exposed one authored negative root: Bc1 already checked the
nonmoving king on e3. Relocate that extra bishop to d1, preserving the intended
extra-minor exclusion and all checking geometry. No algorithm, label, priority
or preregistered decision rule changed.

Authorship review shows pawn-promotion interposition cannot lie on the eligible
rear/side checking ray with the advanced passer beyond its own king. Exercise
legal promotion blocking in a negative outside-context case; do not claim a
positive label with such a reply. Similarly a moved rook resets EP rights.
Multiple passers are exercised with doubled pawns beyond the king; exact
complete eligibility and deterministic selected-pawn identity are retained.

Final target passes 102 tests (96 authored/reflected cases plus six proof and
guard groups); cumulative E020–E057 passes 2,335 tests. Maintained source
verification and diff check pass before the source commit.

Initial three full runs at61f405b match all mechanics/reproducibility gates.
Actual selected-text review then exposes side comments hidden by rook-lift
geometry. Preserve those full outputs as an exposed selection pilot; SELECTION.md
preregisters the narrow priority correction and additional selection checks.

The added selection test initially assumed BOTH capture negatives had the
frozen hanging-piece warning. The rook was already attacked on a7 by Ra8,
so frozen parent creates neither the new allows-capture nor hanging event.
An initial revised assertion still assumed allows-capture; saved-output
inspection confirms neither exists. Assert exact preserved urgent selection
on the pawn example; on the rook example require the independently replayed
capture witness and absence of the safe-distance label. Direction remains a
neutral geometric fact. No new warning detector or assurance of safety is
introduced. These are incorrect added test expectations, not proof failures.

Corrected target passes103 and cumulative passes2,336 with the new selection
group; maintained source verification and diff check pass. Final decisive runs
must use the corrected committed source and hashed selection supplement.
