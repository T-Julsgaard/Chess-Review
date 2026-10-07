# Definitions and scope

Read 2026-10-07, definition metadata only. No source boards, games, FENs,
sequences, puzzles or engine evaluations copied into evaluated fixtures.

- [ChessPivot: Greco's mate](https://www.chesspivot.com/en/glossary/grecos-mate)
  separates edge-file rook/queen check, bishop-controlled neighboring escape
  and own pawn blocker. [ChessWorld Greco definition](https://www.chessworld.net/grecos-mate.asp)
  agrees on the distinct checking and bishop-containment roles. This profile
  retains the corner/file form only, without asserting castling.
- [ChessWorld: Blackburne's mate](https://www.chessworld.net/blackburnes-mate.asp)
  describes bishop pair plus knight coverage near an edge, with enemy rook or
  board edge restriction. Both bishops and knight must have actual roles;
  no queen sacrifice or actual castling is inferred from terminal geometry.
- [ChessWorld: Kill box](https://www.chessworld.net/kill-box-mate.asp)
  describes contact rook mate, diagonal queen support with one empty square
  between them, and a 3-by-3 box. This profile verifies that exact terminal shape.

Authored fixtures use these definitions; resemblance alone never proves mate.
All labels require actual legal terminal mate and explicit helper roles.
