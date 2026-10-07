# E068 exposure

Authored synthetic development evidence, not independent real-game evaluation.
Preflight initially rejected an unknown purpose string; corrected to registered
`test` purpose and passed before any fixture execution. No data used on rejection.

First focused pilot: 100 tests, 95 passed, five failed. Four reflected
wrong-rook negatives accidentally crossed the lifted rook and were illegal;
move the other rook to rank four to test identity independently. One selection
assertion treated a pre-existing bishop attack as newly hanging material;
retain that capturable-rook positive and add a separately newly attacked rook
fixture for the existing urgent-warning gate. No detector or priority changes.
Second focused pilot: all 104 passed. Add direct-check-only negative and a
checking swing that simultaneously interposes against a bishop check.

Final focused suite: 112 tests passed. Full cumulative coach suite passed
(exit 0); maintained source verification and diff checks passed. Cheap focused
runs took 6–8 seconds. Three full inherited-corpus runs estimated at ~270
seconds each; prospective 12MB evidence gate unchanged. Freeze follows.
