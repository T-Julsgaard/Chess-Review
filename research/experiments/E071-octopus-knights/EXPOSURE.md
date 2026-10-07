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
