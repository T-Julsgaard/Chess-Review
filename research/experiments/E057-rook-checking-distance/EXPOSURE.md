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
