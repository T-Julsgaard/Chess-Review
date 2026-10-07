# E071 exposure

Authored synthetic exposed mechanics. D001 test preflight passed. Previous turn
made progress: E070 completed all proof/reproduction gates and local integration.
Human cancellation of cutoff/shutdown still governs; no monitoring revived.

First base-fixture probe: central e6 entry failed to evade a pre-existing
queen check on a1; put the own king on b1. The intended rook capture defense
had its rook on e8 rather than the knight file d8; move it to d8 to test
actual capture. Disabled result has no octopus analysis by exact-parent design;
probe access corrected, no detector/priority changes.

First focused 110 tests passed in 18.8s. Added a queen capture that yields
K+N versus K after the enemy king takes the supporting pawn: positive arithmetic
gain is a draw, so it refutes. Expanded 115 passed in 19.1s. Copy material
values into returned proofs so later calls cannot be changed by consumer mutation;
final focused 116 pass (see retained final gate below). Estimate full corpus
3,860 cases, ~260–290s/run, complete proof/candidate/refutation evidence <=20MB.
No pruning or priority/gate relaxation.

Final focused 116 passed in 19.9s. Full cumulative 4,160 coach tests passed
in 118.2s; maintained source verification and diff checks passed. Freeze
follows; exact reproduction and saved-proof gates remain mandatory.

Initial 53425ae full main/repeat/clean runs matched and own saved proofs replayed,
but selected-comment audit failed: full-history terminal repetition still selected
an inherited royal fork. All initial full artifacts and manifests retained under
initial-evidence, including audit.json. AMENDMENT prospectively strengthens fallback
selection and budget behavior before final source/evaluation. No gate relaxation.

Corrective guard retains all actual history/replies and suppresses false
force-capture fallback even with zero own/outpost budgets. Explicit independent
guard replay and tamper rejection added. Final focused 118 tests pass; repeat
all final gates and exact reproductions under AMENDMENT. Initial proof corpus
6.37MB retained; combined initial/final storage estimate ~13MB within unchanged
20MB. New reproductions use repeat-final and clean-final distinct directories.

Corrected final focused 118 passed in 22.5s; cumulative 4,162 tests passed
(exit 0), maintained source and diff checks passed. Freeze corrected source
before three entirely new reproductions; initial unsuccessful selected-comment
source and artifacts remain retained without overwrite.
