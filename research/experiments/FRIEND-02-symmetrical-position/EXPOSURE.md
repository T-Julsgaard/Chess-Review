# FRIEND-02 development exposure (all failures retained)

2026-10-08, before the frozen decisive runs. Synthetic authored fixtures only.

1. First development run: 48 cases, 2 failures: `no-pawns` and `no-pawns-black`
   threw `Cannot explain a move from a terminal position`. Authoring error: a bare
   king-versus-king position is dead (insufficient material), so the parent refused it.
   Detector unchanged; corrected fixture adds one rook per side. Original run output
   hash (gzip results.json.gz, 12,769 B):
   a2a8f3a56915285a63113d43fae8edcc15ba5188cffcc19f017c6952d37b5cb7.
2. First test pass: 68/69. One tamper test ("moved a pawn in the after FEN") was a
   no-op string replace, so replay correctly did not throw. Test mutation rewritten;
   replay unchanged (it already ties saved FENs to the fixture, per the FRIEND-01 audit).
3. Parent warnings and explanations outrank this label (priority 4.1), so it is
   retained in `events` but is seldom the selected comment.
