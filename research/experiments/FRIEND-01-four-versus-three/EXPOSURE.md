# FRIEND-01 development exposure (all failures retained)

2026-10-08, before the frozen decisive runs. Synthetic authored fixtures only.

1. First development run: 62 cases, 4 failures. All four were the history fixtures
   (`pawn-capture-with-history`, its Black reflection, `budget-one-less-with-history`,
   `budget-exact-with-history`) rejected with `Invalid history: final FEN does not
   match input`. Cause: authoring error. Two history plies advance the counters to
   `2 2`, but the root FEN kept `0 1`. The parent validator was right; the detector
   was not changed. Correction: root FEN counters `2 2`. Original compact output hash
   (SHA-256 of the 213,262-byte results.json) c1c69b0bbd0c40986ca7b5994344bbd519d46a967822cc394bd81703723d6e7a.
2. Second development run: 62 cases, 0 failures (run before adding the
   `quiet-kings-no-urgent-warning` positive and queenside fixtures; final case
   count differs).
3. Replay audit: my first tamper tests found two real replay gaps. The saved witness
   was not tied to the fixture (a different fixture's result with the same status
   passed), and one tamper mutation was a no-op string replace. Replay now requires
   the saved played FEN, before/after FENs, move and history to equal a fresh
   derivation from the fixture; the tamper mutation was rewritten. Detector unchanged.
4. Parent warnings (mate threats, "Rook ending") outrank this label: its priority is
   4.2, below all parent explanations. The new event is retained in `events` but is
   rarely the selected comment. Not a defect of this study; a presentation limit.
