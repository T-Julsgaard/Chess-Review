# E070 exposure

Authored synthetic development mechanics, not independent real-game evaluation.
D001 test preflight passed. Previous turn made progress: E068/E069 fully verified,
committed and integrated locally. Cutoff/shutdown remains cancelled by the human.

Initial authored probe (34 base fixtures): remote h7 pawn correctly refuted by
capture to g6 attacking f5; use c7 as the positive and retain h7 as a separate
negative. An f6 supporter was incorrectly placed on e6 instead of e5, a
rank-seven knight jump was diagonal/illegal, a bishop negative already checked
the nonmoving king and a supposed check evasion failed to block its ray.
Corrected authored pieces/coordinates; no detector gate or priority relaxation.

Focused corrected suite: 146 passed in 4.9s. Added independent complete
refutation-DAG replay and an explicitly legal a7xb6, quiet king move, b6xc5
sequence attacking the alleged d4 outpost. Expanded focused suite: 151 passed
in 5.3s. Capture chains refute a current no-pawn-attack appearance.
Estimated full corpus 3,748 cases, ~250–280s/run and full DAG proof overhead
within prospective 20MB gate; all positive/refutation graphs retained.

Added a legal pawn supporter to the shallow-rank negative so its depth gate
is isolated, plus an actual knight-mate negative with support and an explicit
terminal-priority check. Expanded focused suite: 156 passed in 5.3s. Repeat
full regression/source gates after these new fixtures; the previous cumulative
pass is not substituted for the changed source's final gates.

Final 156 focused and 4,044 cumulative coach tests passed; full final suite
91.0s. Maintained source verification and diff checks passed. Source freeze
follows; full proof/reproduction gates still required.
