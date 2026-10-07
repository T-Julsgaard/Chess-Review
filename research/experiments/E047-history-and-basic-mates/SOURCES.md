# Definitions and scope

Read 2026-10-07, definition metadata only. No source game, board, FEN, move
sequence, puzzle or evaluation copied into fixtures.

- [ChessWorld: Legal's mate](https://www.chessworld.net/legals-mate.asp)
  distinguishes the knight/queen relative-pin illusion, actual queen capture
  and bishop/two-knight mate from an automatically sound offer. The detector
  verifies a recent played branch and terminal roles; it never asserts that
  accepting was forced or that all alternative defenses fail.
- [ChessWorld: Corner mate](https://www.chessworld.net/corner-mate.asp)
  describes a knight finishing against a corner king with heavy-piece escape
  coverage. The implemented clean profile requires actual adjacent-file rook/
  queen control of two vacant flights and an enemy pawn blocker.
- [ChessWorld: Rook/Box mate](https://www.chessworld.net/rook-mate.asp)
  identifies Box mate with basic king-and-rook checkmate against a bare king.
  Only the terminal exact three-piece mating army and own king flight control
  are claimed; a preceding shrinking-box strategy is not inferred.

All evaluated positions/histories are authored. Geometry removes only the
mated king explicitly for flight inspection; actual legal mate checked first.
The original terms retain these restricted, verifiable scopes in the tracker.
