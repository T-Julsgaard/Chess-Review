# FRIEND-03 development exposure (all failures retained)

2026-10-08, before the frozen decisive runs. Synthetic authored fixtures only.

1. First development run: 54 cases, 18 failures (results.json.gz hash
   d48be62f20601c5a6bf1ca7df31124bc972e3b4487c8ba862c0eb6afdf30a695, 7,633 B).
   Cause 1 (replay defect, not detector): an unbraced `else` in the independent
   `attackMap` bound to the king-step `if`, so a king piece also received queen
   rays. This made the independent replay disagree with the detector on 14 rows.
   The disagreement was resolved by inspection of the actual king move lists
   against chess.js, which matched the detector, so the fix was in replay.mjs only.
   The detector was not changed.
   Cause 2 (authoring): two budget-gate fixtures indexed the wrong negative
   (`negatives[11]` was the pawn-mate case, not the counterfactual-illegal case),
   giving `not-live` instead of the intended stage. Fixtures now select by id.
2. Second development run: 54 cases, 2 failures (cause 2 only). After the fixture
   fix, all 80 tests pass, including a test that cross-checks the independent king
   enumeration against chess.js on every live actual position.
3. Parent warnings outrank this label (priority 4.3), so the event is retained in
   `events` but is seldom the selected comment.
