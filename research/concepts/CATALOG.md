# Cleaned working catalog

Review snapshot: E074, 2026-10-08. These are 1019 working rows, retaining all 1085 original occurrence IDs and their exact definitions, categories and evidence scopes. This is not a replacement evidence tracker. A verified occurrence does not automatically verify another context.

Machine-readable source: [catalog.json](catalog.json). Proposed scheduling: [ORDER.md](ORDER.md).

## C0001 — Board coordinates

Original entry: Board coordinates — files (a–h), ranks (1–8), and square names.

- **C0001** · 1. Board, rules, and fundamental concepts · **unimplemented**
  Not implemented.

Proposed queue rank 1, phase 1. Outstanding IDs: C0001.

## C0002 — Piece movement

Original entry: Piece movement — legal movement of kings, queens, rooks, bishops, knights, and pawns.

- **C0002** · 1. Board, rules, and fundamental concepts · **unimplemented**
  Not implemented.

Proposed queue rank 2, phase 1. Outstanding IDs: C0002.

## C0003 — Capture

Original entry: Capture — removing an enemy piece by occupying its square.

- **C0003** · 1. Board, rules, and fundamental concepts · **verified**
  Mechanics verified: actual removed piece and square, including en passant.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0004 — Check

Original entry: Check — an attack on the enemy king.

- **C0004** · 1. Board, rules, and fundamental concepts · **verified**
  Mechanics verified: check; factual king attack only.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0005 — Checkmate

Original entry: Checkmate — a check from which there is no legal escape.

- **C0005** · 1. Board, rules, and fundamental concepts · **verified**
  Mechanics verified: checkmate; played move ends in mate.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0006 — Stalemate

Original entry: Stalemate — a player has no legal move but is not in check.

- **C0006** · 1. Board, rules, and fundamental concepts · **verified**
  Mechanics verified: stalemate; played move ends in stalemate.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0007 — Draw by repetition

Original entry: Draw by repetition — the same position occurs three times under the required conditions.

- **C0007** · 1. Board, rules, and fundamental concepts · **verified**
  Mechanics verified: verified legal history reaches three equal position keys including turn, castling rights and legal en passant; reports claim opportunity, not awarded draw.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0008 — Fifty-move rule

Original entry: Fifty-move rule — a draw may be claimed after the required number of moves without a pawn move or capture.

- **C0008** · 1. Board, rules, and fundamental concepts · **verified**
  Mechanics verified: verified history covers 100 consecutive plies without pawn move/capture and consistent counters; FEN-only thresholds remain partial facts and cannot trigger this claim label.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0009 — Insufficient mating material

Original entry: Insufficient mating material — neither side can possibly checkmate.

- **C0009** · 1. Board, rules, and fundamental concepts · **verified**
  Mechanics verified: chess.js insufficient-material classification after legal move.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0010 — Castling

Original entry: Castling — special king-rook move for king safety and rook development.

- **C0010** · 1. Board, rules, and fundamental concepts · **verified**
  Mechanics verified: castling; factual move, no safety judgment.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0011 — Kingside castling

Original entry: Kingside castling — castling with the h-rook.

- **C0011** · 1. Board, rules, and fundamental concepts · **verified**
  Mechanics verified: castling; kingside.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0012 — Queenside castling

Original entry: Queenside castling — castling with the a-rook.

- **C0012** · 1. Board, rules, and fundamental concepts · **verified**
  Mechanics verified: castling; queenside.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0013 — En passant

Original entry: En passant — special pawn capture after an opposing pawn advances two squares.

- **C0013** · 1. Board, rules, and fundamental concepts · **verified**
  Mechanics verified: en-passant; right, removed pawn and discovered-check case.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0014 — Promotion

Original entry: Promotion — converting a pawn reaching the last rank into another piece.

- **C0014** · 1. Board, rules, and fundamental concepts · **verified**
  Mechanics verified: promotion; factual piece change.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0015 — Underpromotion

Original entry: Underpromotion — promoting to a rook, bishop, or knight instead of a queen.

- **C0015** · 1. Board, rules, and fundamental concepts · **verified**
  Mechanics verified: promotion; non-queen piece change, no optimality claim.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0016 — Legal move

Original entry: Legal move — a move that does not leave your king in check.

- **C0016** · 1. Board, rules, and fundamental concepts · **unimplemented**
  Not implemented.

Proposed queue rank 3, phase 1. Outstanding IDs: C0016.

## C0017 — Illegal move

Original entry: Illegal move — a move forbidden by the rules.

- **C0017** · 1. Board, rules, and fundamental concepts · **unimplemented**
  Not implemented.

Proposed queue rank 4, phase 1. Outstanding IDs: C0017.

## C0018 — Touch-move rule

Original entry: Touch-move rule — tournament rule requiring a touched piece to be moved when legally possible.

- **C0018** · 1. Board, rules, and fundamental concepts · **unimplemented**
  Not implemented.

Proposed queue rank 567, phase 6. Outstanding IDs: C0018.

## C0019 — Checkmate versus resignation

Original entry: Checkmate versus resignation — distinction between the formal end of a game and voluntary concession.

- **C0019** · 1. Board, rules, and fundamental concepts · **unimplemented**
  Not implemented.

Proposed queue rank 568, phase 6. Outstanding IDs: C0019.

## C0020 — Material

Original entry: Material — the pieces and pawns possessed by each player.

- **C0020** · 1. Board, rules, and fundamental concepts · **unimplemented**
  Not implemented.

Proposed queue rank 5, phase 1. Outstanding IDs: C0020.

## C0021 — Tempo

Original entry: Tempo — one unit of time represented by a move.

- **C0021** · 1. Board, rules, and fundamental concepts · **unimplemented**
  Not implemented.

Proposed queue rank 274, phase 5. Outstanding IDs: C0021.

## C0022 — Initiative

Original entry: Initiative — the ability to make threats that force the opponent to respond.

- **C0022** · 1. Board, rules, and fundamental concepts · **unimplemented**
  Not implemented.

Proposed queue rank 275, phase 5. Outstanding IDs: C0022.

## C0023 — Space

Original entry: Space — control of territory restricting the opponent.

- **C0023** · 1. Board, rules, and fundamental concepts · **verified**
  Mechanics verified: actual new pawn attack squares in enemy half remove immediate enemy king destinations; complete legal before/after/removed-pawn causal sets and every actual reply; no general advantage or permanent restriction claim.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0024 — Development

Original entry: Development — bringing pieces from their starting squares into useful positions.

- **C0024** · 1. Board, rules, and fundamental concepts · **verified**
  Mechanics verified: first surviving original minor home departure off back rank during first ten own turns; verified initial-position history.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0025 — King safety

Original entry: King safety — how vulnerable a king is to attack.

- **C0025** · 1. Board, rules, and fundamental concepts · **unimplemented**
  Not implemented.

Proposed queue rank 276, phase 5. Outstanding IDs: C0025.

## C0026 — Piece activity

Original entry: Piece activity — how many useful things a piece can do.

- **C0026** · 1. Board, rules, and fundamental concepts · **unimplemented**
  Not implemented.

Proposed queue rank 277, phase 5. Outstanding IDs: C0026.

## C0027 — Mobility

Original entry: Mobility — number and quality of squares available to a piece.

- **C0027** · 1. Board, rules, and fundamental concepts · **verified**
  Mechanics verified: static legal destination count drops by at least two to at most two; explicit hypothetical before-opponent turn, no quality or future-position claim.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0028 — Coordination

Original entry: Coordination — how effectively pieces work together.

- **C0028** · 1. Board, rules, and fundamental concepts · **unimplemented**
  Not implemented.

Proposed queue rank 278, phase 5. Outstanding IDs: C0028.

## C0029 — Harmony

Original entry: Harmony — the overall cooperation of the pieces.

- **C0029** · 1. Board, rules, and fundamental concepts · **unimplemented**
  Not implemented.

Proposed queue rank 279, phase 5. Outstanding IDs: C0029.

## C0030 — Material balance

Original entry: Material balance — comparison of both sides' material.

- **C0030** · 1. Board, rules, and fundamental concepts · **partial**
  Partial: nominal 1/3/3/5/9 arithmetic and listed exact army subsets; positional value deferred.

Proposed queue rank 6, phase 1. Outstanding IDs: C0030.

## C0031 — Material imbalance

Original entry: Material imbalance — positions involving different combinations of pieces, such as rook versus bishop and knight.

- **C0031** · 1. Board, rules, and fundamental concepts · **partial**
  Partial: nominal 1/3/3/5/9 arithmetic and listed exact army subsets; positional value deferred.

Proposed queue rank 7, phase 1. Outstanding IDs: C0031.

## C0032 — Relative piece value

Original entry: Relative piece value — approximate values such as pawn 1, knight 3, bishop 3, rook 5, queen 9.

- **C0032** · 2. Piece values and exchanges · **unimplemented**
  Not implemented.

Proposed queue rank 280, phase 5. Outstanding IDs: C0032.

## C0033 — Absolute versus relative value

Original entry: Absolute versus relative value — a piece's textbook value versus its actual usefulness in a position.

- **C0033** · 2. Piece values and exchanges · **unimplemented**
  Not implemented.

Proposed queue rank 281, phase 5. Outstanding IDs: C0033.

## C0034 — Exchange

Original entry: Exchange — trading one piece for another.

- **C0034** · 2. Piece values and exchanges · **verified**
  Mechanics verified: verified legal immediate recapture history; fixed captured-piece nominal values only; promotions excluded.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0035 — The exchange

Original entry: The exchange — specifically the material difference between a rook and a minor piece.

- **C0035** · 2. Piece values and exchanges · **verified**
  Mechanics verified: verified legal immediate recapture history; fixed captured-piece nominal values only; promotions excluded.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0036 — Winning the exchange

Original entry: Winning the exchange — obtaining a rook for a bishop or knight.

- **C0036** · 2. Piece values and exchanges · **partial**
  Partial: played minor-for-rook capture retains positive nominal gain through every immediate reply only.

Proposed queue rank 88, phase 2. Outstanding IDs: C0036.

## C0037 — Exchange sacrifice

Original entry: Exchange sacrifice — deliberately giving a rook for a minor piece.

- **C0037** · 2. Piece values and exchanges · **verified**
  Mechanics verified: rook captures a minor and is legally offered at a nominal loss of two points, with all-defense forced-mate proof.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0038 — Quality of pieces

Original entry: Quality of pieces — evaluating pieces by activity rather than nominal value.

- **C0038** · 2. Piece values and exchanges · **unimplemented**
  Not implemented.

Proposed queue rank 282, phase 5. Outstanding IDs: C0038.

## C0039 — Good trade

Original entry: Good trade — an exchange that improves your position.

- **C0039** · 2. Piece values and exchanges · **unimplemented**
  Not implemented.

Proposed queue rank 283, phase 5. Outstanding IDs: C0039.

## C0040 — Bad trade

Original entry: Bad trade — an exchange that benefits the opponent.

- **C0040** · 2. Piece values and exchanges · **unimplemented**
  Not implemented.

Proposed queue rank 284, phase 5. Outstanding IDs: C0040.

## C0041 — Equal trade

Original entry: Equal trade — exchanging pieces of roughly equal value.

- **C0041** · 2. Piece values and exchanges · **verified**
  Mechanics verified: verified legal immediate recapture history; fixed captured-piece nominal values only; promotions excluded.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0042 — Unequal trade

Original entry: Unequal trade — exchanging pieces of differing nominal values.

- **C0042** · 2. Piece values and exchanges · **verified**
  Mechanics verified: verified legal immediate recapture history; fixed captured-piece nominal values only; promotions excluded.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0043 — Piece simplification

Original entry: Piece simplification — reducing the number of pieces.

- **C0043** · 2. Piece values and exchanges · **verified**
  Mechanics verified: non-pawn piece count decreases by one; no quality judgment.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0044 — Mass exchanges

Original entry: Mass exchanges — several exchanges occurring in succession.

- **C0044** · 2. Piece values and exchanges · **unimplemented**
  Not implemented.

Proposed queue rank 285, phase 5. Outstanding IDs: C0044.

## C0045 — Trading when ahead

Original entry: Trading when ahead — simplifying material when possessing a material advantage.

- **C0045** · 2. Piece values and exchanges · **unimplemented**
  Not implemented.

Proposed queue rank 286, phase 5. Outstanding IDs: C0045.

## C0046 — Keeping pieces when behind

Original entry: Keeping pieces when behind — maintaining complications to preserve winning chances.

- **C0046** · 2. Piece values and exchanges · **unimplemented**
  Not implemented.

Proposed queue rank 287, phase 5. Outstanding IDs: C0046.

## C0047 — Queen trade

Original entry: Queen trade — often reduces attacking possibilities and king danger.

- **C0047** · 2. Piece values and exchanges · **verified**
  Mechanics verified: verified legal immediate recapture history; fixed captured-piece nominal values only; promotions excluded.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0048 — Minor-piece trade

Original entry: Minor-piece trade — exchanging bishops and/or knights.

- **C0048** · 2. Piece values and exchanges · **verified**
  Mechanics verified: verified legal immediate recapture history; fixed captured-piece nominal values only; promotions excluded.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0049 — Rook trade

Original entry: Rook trade — exchanging major pieces, often affecting endgame transitions.

- **C0049** · 2. Piece values and exchanges · **verified**
  Mechanics verified: verified legal immediate recapture history; fixed captured-piece nominal values only; promotions excluded.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0050 — Favorable transformation

Original entry: Favorable transformation — trading into a position that is easier or better than the current one.

- **C0050** · 2. Piece values and exchanges · **unimplemented**
  Not implemented.

Proposed queue rank 288, phase 5. Outstanding IDs: C0050.

## C0051 — Tactic

Original entry: Tactic — a forcing sequence producing a concrete advantage.

- **C0051** · 3. Tactical concepts · **verified**
  Mechanics verified: positive all-defense material-offer mating sequence with named final pattern or independently certified decoy/clearance idea.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0052 — Combination

Original entry: Combination — a tactical sequence involving several coordinated ideas.

- **C0052** · 3. Tactical concepts · **verified**
  Mechanics verified: same certified material offer plus complementary named-mate/decoy/clearance idea; full all-defense mate.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0053 — Fork

Original entry: Fork — one piece attacks two or more targets simultaneously.

- **C0053** · 3. Tactical concepts · **verified**
  Mechanics verified: new all-piece target pairs, including pawns; every defense has a positive finite capture witness.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0054 — Knight fork

Original entry: Knight fork — a fork delivered by a knight.

- **C0054** · 3. Tactical concepts · **verified**
  Mechanics verified: fork; new knight fork with exhaustive finite material witnesses.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0055 — Pawn fork

Original entry: Pawn fork — a pawn attacks two pieces simultaneously.

- **C0055** · 3. Tactical concepts · **verified**
  Mechanics verified: fork; new pawn fork with exhaustive finite material witnesses.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0056 — Royal fork

Original entry: Royal fork — a fork attacking king and queen.

- **C0056** · 3. Tactical concepts · **verified**
  Mechanics verified: king-and-queen target pair by any piece with a positive finite witness; king never captured.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0057 — Double attack

Original entry: Double attack — one move creates attacks against multiple targets.

- **C0057** · 3. Tactical concepts · **partial**
  Partial: certified moved-piece forks and discovered two-attacker target threats only.

Proposed queue rank 38, phase 2. Outstanding IDs: C0057.

## C0058 — Triple attack

Original entry: Triple attack — one move attacks three targets.

- **C0058** · 3. Tactical concepts · **verified**
  Mechanics verified: three or more moved-piece targets with one finite capture witness per defense; not all targets won.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0059 — Pin

Original entry: Pin — a piece cannot or should not move because something more valuable is behind it.

- **C0059** · 3. Tactical concepts · **partial**
  Partial: absolute king pins and certified queen-relative/cross pins verified; other non-king pin targets unverified.

Proposed queue rank 190, phase 4. Outstanding IDs: C0059.

## C0060 — Absolute pin

Original entry: Absolute pin — the pinned piece legally cannot move because the king would be exposed.

- **C0060** · 3. Tactical concepts · **verified**
  Mechanics verified: absolute-pin; new single-blocker slider-to-king alignment.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0061 — Relative pin

Original entry: Relative pin — the pinned piece can legally move but doing so loses material.

- **C0061** · 3. Tactical concepts · **verified**
  Mechanics verified: new queen alignment; every legal blocker move off that line permits queen capture with positive immediate net material versus the post-move position; other defenses remain.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0062 — Cross-pin

Original entry: Cross-pin — a piece is pinned in more than one direction or interacts with multiple pins.

- **C0062** · 3. Tactical concepts · **verified**
  Mechanics verified: mixed king/queen pin on distinct slider lines; nonempty legal off-queen-line reply set passes the relative-pin proof; other cross-pin forms excluded.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0063 — Skewer

Original entry: Skewer — a valuable piece is attacked and, after moving, exposes another piece.

- **C0063** · 3. Tactical concepts · **partial**
  Partial: certified absolute king-first subset only.

Proposed queue rank 191, phase 4. Outstanding IDs: C0063.

## C0064 — Absolute skewer

Original entry: Absolute skewer — usually a king is attacked first.

- **C0064** · 3. Tactical concepts · **verified**
  Mechanics verified: king-first moved-slider skewer; every defense allows target capture with positive immediate net material.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0065 — Discovered attack

Original entry: Discovered attack — moving one piece reveals an attack by another.

- **C0065** · 3. Tactical concepts · **verified**
  Mechanics verified: stationary slider’s newly opened attack with legal same-side capture witness; opponent can respond.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0066 — Discovered check

Original entry: Discovered check — a discovered attack against the king.

- **C0066** · 3. Tactical concepts · **verified**
  Mechanics verified: discovered-check; includes en passant, excludes moving castling rook.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0067 — Double check

Original entry: Double check — two pieces simultaneously give check.

- **C0067** · 3. Tactical concepts · **verified**
  Mechanics verified: double-check; two king attackers, terminal mate takes priority.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0068 — X-ray attack

Original entry: X-ray attack — a piece attacks through another piece.

- **C0068** · 3. Tactical concepts · **partial**
  Partial: new slider/blocker/enemy-target alignment only; blocker prevents direct attack.

Proposed queue rank 39, phase 2. Outstanding IDs: C0068.

## C0069 — X-ray defense

Original entry: X-ray defense — a long-range piece indirectly protects something through an intervening piece.

- **C0069** · 3. Tactical concepts · **verified**
  Mechanics verified: actual conditional capture/blocker-recapture/opponent-recapture/slider-recapture sequence through exactly one own ray blocker; all four moves legal, no forced acceptance or favorable trade claim.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0070 — Deflection

Original entry: Deflection — forcing a defender away from an important duty.

- **C0070** · 3. Tactical concepts · **verified**
  Mechanics verified: positive all-defense mate sacrifice; accepting enemy unit abandons a before-proven legal capture of the same eventual mating unit; acceptance/mate explicit.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0071 — Decoy

Original entry: Decoy — attracting an enemy piece to a vulnerable square.

- **C0071** · 3. Tactical concepts · **verified**
  Mechanics verified: all-defense mate offer; accepted non-king unit blocks a geometrically verified king escape, or accepted king enables a before-legal nonmating move to mate; conditional line.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0072 — Attraction

Original entry: Attraction — forcing a piece, commonly the king, onto a specific square.

- **C0072** · 3. Tactical concepts · **verified**
  Mechanics verified: king-specific all-defense mating offer: accepting king changes square and same before-legal nonmating move actually mates; conditional acceptance.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0073 — Distraction

Original entry: Distraction — making a defending piece abandon its task.

- **C0073** · 3. Tactical concepts · **verified**
  Mechanics verified: same legal defender-duty deflection certificate; no psychological intent inferred.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0074 — Removal of the defender

Original entry: Removal of the defender — eliminating a piece protecting an important target.

- **C0074** · 3. Tactical concepts · **verified**
  Mechanics verified: captured geometric defender; every legal reply permits original target capture with positive immediate net material versus the post-capture position; later play unproven.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0075 — Overloading

Original entry: Overloading — a piece has too many defensive responsibilities.

- **C0075** · 3. Tactical concepts · **verified**
  Mechanics verified: conditional enemy N/B/R/Q recapture abandons another target after two before-proven legal recapture duties; same own attacker captures that target with positive before-move nominal gain through EVERY immediate enemy reply; all defender acceptances checked, no forced acceptance/long-term gain claim.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0076 — Interference

Original entry: Interference — inserting a piece between an enemy piece and its target.

- **C0076** · 3. Tactical concepts · **verified**
  Mechanics verified: frozen enemy-slider attack-line interruption geometry; additionally enemy slider had a legally proven before-duty recapture; actual move interposes on its clear ray; EVERY enemy reply allows the original target capture with positive before-move nominal gain through EVERY next enemy response; removing only the blocker restores a legal counterfactual defender recapture.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0077 — Clearance

Original entry: Clearance — moving a piece away to free a square, file, rank, or diagonal.

- **C0077** · 3. Tactical concepts · **partial**
  Partial: discovered attacks and certified mating clearance sacrifices verified; broader quiet uses/intent unverified.

Proposed queue rank 40, phase 2. Outstanding IDs: C0077.

## C0078 — Line clearance

Original entry: Line clearance — opening a line for a rook, bishop, or queen.

- **C0078** · 3. Tactical concepts · **partial**
  Partial: discovered attacks and certified mating clearance sacrifices verified; broader quiet uses/intent unverified.

Proposed queue rank 41, phase 2. Outstanding IDs: C0078.

## C0079 — Square clearance

Original entry: Square clearance — vacating a square another piece needs.

- **C0079** · 3. Tactical concepts · **verified**
  Mechanics verified: actual move vacates own occupied square; EVERY legal enemy reply permits a different original own unit to legally checkmate on that same square; no uniqueness/intent claim.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0080 — Blocking

Original entry: Blocking — placing a piece so an opposing piece's line is obstructed.

- **C0080** · 3. Tactical concepts · **verified**
  Mechanics verified: played move interrupts a previously clear enemy slider attack line; no wider safety or evaluation claim.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0081 — Interposition

Original entry: Interposition — blocking a check or line attack.

- **C0081** · 3. Tactical concepts · **verified**
  Mechanics verified: legal check evasion blocks a specified checking slider between attacker and king.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0082 — Trapping a piece

Original entry: Trapping a piece — restricting a piece until it cannot escape.

- **C0082** · 3. Tactical concepts · **verified**
  Mechanics verified: currently attacked N/B/R/Q has complete all-defense tracked capture proof and positive gain through every immediate counterreply; nonchecking finite subset.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0083 — Trapped queen

Original entry: Trapped queen — restricting the queen until it is lost.

- **C0083** · 3. Tactical concepts · **verified**
  Mechanics verified: currently attacked N/B/R/Q has complete all-defense tracked capture proof and positive gain through every immediate counterreply; nonchecking finite subset.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0084 — Domination

Original entry: Domination — controlling all or nearly all useful squares of an enemy piece.

- **C0084** · 3. Tactical concepts · **verified**
  Mechanics verified: every legal move by the named unit permits tracked capture with positive gain through every immediate counterreply; other defenses not promised.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0085 — Desperado

Original entry: Desperado — a doomed piece causes maximum damage before being captured.

- **C0085** · 3. Tactical concepts · **verified**
  Mechanics verified: geometrically threatened N/B/R/Q takes its maximum available nominal capture; EVERY legal quiet alternative admits a legal unit-loss capture through ALL own responses (or enemy mate); EVERY actual unit recapture retains the conditional captured-value benefit through ALL own responses; finite three-ply comparison, no best-move or lasting-gain claim.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0086 — Zwischenzug

Original entry: Zwischenzug — an intermediate move played before the apparently obvious continuation.

- **C0086** · 3. Tactical concepts · **verified**
  Mechanics verified: verified previous capture and legal recapture; played intermediate check/capture retains recapture through all legal replies and immediate counters, or actually mates.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0087 — Intermediate check

Original entry: Intermediate check — a zwischenzug delivered with check.

- **C0087** · 3. Tactical concepts · **verified**
  Mechanics verified: actual check delays a verified available recapture; every legal reply permits tracked recapture with finite positive gain or actual mate.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0088 — zwischenmatt / intermediate mate

Original entry: ** zwischenmatt / intermediate mate** — an unexpected mating move inserted into a tactical sequence.

- **C0088** · 3. Tactical concepts · **verified**
  Mechanics verified: verified previous capture has legal recapture alternative, but actual played move legally checkmates instead.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0089 — Sacrifice

Original entry: Sacrifice — intentionally giving material for another advantage.

- **C0089** · 3. Tactical concepts · **verified**
  Mechanics verified: actual material offer retains all-defense mate within two/three moves, including every legal acceptance and decline; no necessity or intention inferred.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0090 — Temporary sacrifice

Original entry: Temporary sacrifice — material is regained soon afterward.

- **C0090** · 3. Tactical concepts · **verified**
  Mechanics verified: every legal capture of a positive nominal offer creates actual material loss; an own capture restores the before-move balance through EVERY immediate enemy reply; acceptance conditional, finite horizon only.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0091 — Permanent sacrifice

Original entry: Permanent sacrifice — material is not immediately recovered.

- **C0091** · 3. Tactical concepts · **unimplemented**
  Not implemented.

Proposed queue rank 192, phase 4. Outstanding IDs: C0091.

## C0092 — Positional sacrifice

Original entry: Positional sacrifice — material given for long-term positional compensation.

- **C0092** · 3. Tactical concepts · **unimplemented**
  Not implemented.

Proposed queue rank 289, phase 5. Outstanding IDs: C0092.

## C0093 — Clearance sacrifice

Original entry: Clearance sacrifice — material sacrificed to clear a line or square.

- **C0093** · 3. Tactical concepts · **verified**
  Mechanics verified: material offer vacates the sole blocker on a stationary slider-to-king ray, opening check and retaining bounded mate through every defense.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0094 — Deflection sacrifice

Original entry: Deflection sacrifice — material sacrificed to lure away a defender.

- **C0094** · 3. Tactical concepts · **verified**
  Mechanics verified: same positive nominal-offer/all-defense mate and before-duty/after-mate deflection proof.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0095 — Destroying the pawn shield

Original entry: Destroying the pawn shield — sacrificing to expose the enemy king.

- **C0095** · 3. Tactical concepts · **partial**
  Partial: capture removes one geometric cover pawn; sacrifice intent or complete destruction not inferred.

Proposed queue rank 193, phase 4. Outstanding IDs: C0095.

## C0096 — Greek Gift sacrifice

Original entry: Greek Gift sacrifice — Bxh7+ or Bxh2+ attacking motif.

- **C0096** · 3. Tactical concepts · **unimplemented**
  Not implemented.

Proposed queue rank 194, phase 4. Outstanding IDs: C0096.

## C0097 — Rook sacrifice on h7/h2

Original entry: Rook sacrifice on h7/h2 — attacking sacrifice against the castled king.

- **C0097** · 3. Tactical concepts · **verified**
  Mechanics verified: checking rook offer on relative h7, verified opponent kingside castle history and current g/h home-rank king, complete bounded all-defense mate.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0098 — Rook sacrifice on g7/g2

Original entry: Rook sacrifice on g7/g2 — another common king-opening motif.

- **C0098** · 3. Tactical concepts · **verified**
  Mechanics verified: same checking/actual kingside-castle/current home-rank king and all-defense mate gates on relative g7.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0099 — Exchange sacrifice on c3/c6

Original entry: Exchange sacrifice on c3/c6 — thematic sacrifice in numerous Sicilian-type structures.

- **C0099** · 3. Tactical concepts · **verified**
  Mechanics verified: actual rook-for-minor offer on relative c3 and complete bounded mate; no Sicilian/opening or generic strategic judgment.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0100 — Queen sacrifice

Original entry: Queen sacrifice — sacrificing the queen for mate or substantial compensation.

- **C0100** · 3. Tactical concepts · **verified**
  Mechanics verified: legally capturable moved queen costs more than the played capture, while every defense retains bounded forced mate.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0101 — Smothered mate combination

Original entry: Smothered mate combination — restricting the king with its own pieces before mating with a knight.

- **C0101** · 3. Tactical concepts · **verified**
  Mechanics verified: EVERY legal reply admits actual sole-knight mate with every valid adjacent king square occupied by its own units.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0102 — Back-rank tactic

Original entry: Back-rank tactic — exploiting a king trapped behind its own pawns.

- **C0102** · 3. Tactical concepts · **verified**
  Mechanics verified: EVERY legal reply admits actual rook/queen home-rank mate behind at least two adjacent own pawns.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0103 — Loose piece

Original entry: Loose piece — an undefended piece.

- **C0103** · 3. Tactical concepts · **verified**
  Mechanics verified: new absence of geometric defenders; pinned defenders still counted.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0104 — Hanging piece

Original entry: Hanging piece — a piece that can be captured profitably.

- **C0104** · 3. Tactical concepts · **partial**
  Partial: newly available opponent capture survives every immediate response with positive nominal gain; long-term profit unresolved.

Proposed queue rank 195, phase 4. Outstanding IDs: C0104.

## C0105 — Loose pieces drop off

Original entry: Loose pieces drop off — principle that undefended pieces frequently create tactical opportunities.

- **C0105** · 3. Tactical concepts · **unimplemented**
  Not implemented.

Proposed queue rank 196, phase 4. Outstanding IDs: C0105.

## C0106 — Counting attackers and defenders

Original entry: Counting attackers and defenders — determining whether a capture sequence works.

- **C0106** · 3. Tactical concepts · **verified**
  Mechanics verified: complete distinct-piece legal capture counts and branch-specific immediate legal recapture sets, including en passant landing squares and promotion alternatives counted once; no safety/profit claim.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0107 — Removing protection

Original entry: Removing protection — attacking a piece after its defender disappears.

- **C0107** · 3. Tactical concepts · **verified**
  Mechanics verified: same finite all-defense target-capture proof; no claim all protection disappears.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0108 — En prise

Original entry: En prise — a piece that can be captured.

- **C0108** · 3. Tactical concepts · **verified**
  Mechanics verified: legal same-side capture if target remains available next turn; no profit claim.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0109 — Tactical vulnerability

Original entry: Tactical vulnerability — a structural or piece-placement feature enabling tactics.

- **C0109** · 3. Tactical concepts · **unimplemented**
  Not implemented.

Proposed queue rank 197, phase 4. Outstanding IDs: C0109.

## C0110 — Alignment

Original entry: Alignment — pieces positioned on the same file, rank, or diagonal, creating tactical opportunities.

- **C0110** · 3. Tactical concepts · **partial**
  Partial: new x-ray and battery geometry subsets; tactical value not implied.

Proposed queue rank 42, phase 2. Outstanding IDs: C0110.

## C0111 — King-piece alignment

Original entry: King-piece alignment — particularly relevant for pins and skewers.

- **C0111** · 3. Tactical concepts · **partial**
  Partial: absolute pins/skewers and descriptive x-rays only.

Proposed queue rank 43, phase 2. Outstanding IDs: C0111.

## C0112 — Queen-king alignment

Original entry: Queen-king alignment — often allows discovered attacks or skewers.

- **C0112** · 3. Tactical concepts · **partial**
  Partial: certified king-first queen-target skewers and x-ray geometry subsets.

Proposed queue rank 44, phase 2. Outstanding IDs: C0112.

## C0113 — Rook-queen alignment

Original entry: Rook-queen alignment — potential skewer or x-ray motif.

- **C0113** · 3. Tactical concepts · **partial**
  Partial: descriptive x-ray alignment; no general relative-skewer proof.

Proposed queue rank 45, phase 2. Outstanding IDs: C0113.

## C0114 — Candidate moves

Original entry: Candidate moves — plausible moves worth calculating.

- **C0114** · 4. Calculation and visualization · **unimplemented**
  Not implemented.

Proposed queue rank 290, phase 5. Outstanding IDs: C0114.

## C0115 — Forcing moves

Original entry: Forcing moves — checks, captures, and threats.

- **C0115** · 4. Calculation and visualization · **verified**
  Mechanics verified: nonchecking, noncapturing actual move; every legal reply permits checkmate on the next own move, independently replayed; no newly-created/only-best claim.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0116 — Checks-captures-threats method

Original entry: Checks-captures-threats method — systematic tactical search procedure.

- **C0116** · 4. Calculation and visualization · **unimplemented**
  Not implemented.

Proposed queue rank 291, phase 5. Outstanding IDs: C0116.

## C0117 — Calculation tree

Original entry: Calculation tree — branching sequence of possible variations.

- **C0117** · 4. Calculation and visualization · **partial**
  Partial: bounded mate tree/profile and verified continuation are implemented in research evidence; generic calculation/variation coaching label remains outside this candidate.

Proposed queue rank 292, phase 5. Outstanding IDs: C0117.

## C0118 — Principal variation

Original entry: Principal variation — the line considered best for both sides.

- **C0118** · 4. Calculation and visualization · **unimplemented**
  Not implemented.

Proposed queue rank 293, phase 5. Outstanding IDs: C0118.

## C0119 — Visualization

Original entry: Visualization — mentally seeing future positions.

- **C0119** · 4. Calculation and visualization · **unimplemented**
  Not implemented.

Proposed queue rank 569, phase 6. Outstanding IDs: C0119.

## C0120 — Board vision

Original entry: Board vision — accurately perceiving relationships between pieces.

- **C0120** · 4. Calculation and visualization · **unimplemented**
  Not implemented.

Proposed queue rank 570, phase 6. Outstanding IDs: C0120.

## C0121 — Tactical vision

Original entry: Tactical vision — recognizing tactical opportunities.

- **C0121** · 4. Calculation and visualization · **unimplemented**
  Not implemented.

Proposed queue rank 571, phase 6. Outstanding IDs: C0121.

## C0122 — Pattern recognition

Original entry: Pattern recognition — identifying familiar structures and motifs.

- **C0122** · 4. Calculation and visualization · **unimplemented**
  Not implemented.

Proposed queue rank 572, phase 6. Outstanding IDs: C0122.

## C0123 — Move ordering

Original entry: Move ordering — calculating forcing moves in the most efficient sequence.

- **C0123** · 4. Calculation and visualization · **unimplemented**
  Not implemented.

Proposed queue rank 294, phase 5. Outstanding IDs: C0123.

## C0124 — Calculation depth

Original entry: Calculation depth — number of moves examined ahead.

- **C0124** · 4. Calculation and visualization · **partial**
  Partial: bounded mate tree/profile and verified continuation are implemented in research evidence; generic calculation/variation coaching label remains outside this candidate.

Proposed queue rank 295, phase 5. Outstanding IDs: C0124.

## C0125 — Calculation breadth

Original entry: Calculation breadth — number of candidate variations considered.

- **C0125** · 4. Calculation and visualization · **unimplemented**
  Not implemented.

Proposed queue rank 296, phase 5. Outstanding IDs: C0125.

## C0126 — Quiet move

Original entry: Quiet move — a non-forcing move within a tactical sequence.

- **C0126** · 4. Calculation and visualization · **partial**
  Partial: a quiet tactical mate threat has no check or capture, but the original non-forcing characterization is not established.

Proposed queue rank 46, phase 2. Outstanding IDs: C0126.

## C0127 — Only move

Original entry: Only move — a move necessary to maintain the position.

- **C0127** · 4. Calculation and visualization · **verified**
  Mechanics verified: at least two legal choices; played move has complete no-enemy-mate-in-one proof and EVERY alternative admits immediate enemy mate; longer-term safety not claimed.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0128 — Forced move

Original entry: Forced move — a move essentially compelled by threats.

- **C0128** · 4. Calculation and visualization · **verified**
  Mechanics verified: at least two legal choices; played move has complete no-enemy-mate-in-one proof and EVERY alternative admits immediate enemy mate; longer-term safety not claimed.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0129 — Forcing sequence

Original entry: Forcing sequence — a sequence in which the opponent has few reasonable responses.

- **C0129** · 4. Calculation and visualization · **unimplemented**
  Not implemented.

Proposed queue rank 198, phase 4. Outstanding IDs: C0129.

## C0130 — Critical position

Original entry: Critical position — a position where a major decision is required.

- **C0130** · 4. Calculation and visualization · **unimplemented**
  Not implemented.

Proposed queue rank 297, phase 5. Outstanding IDs: C0130.

## C0131 — Critical moment

Original entry: Critical moment — a point where the nature of the game may change substantially.

- **C0131** · 4. Calculation and visualization · **unimplemented**
  Not implemented.

Proposed queue rank 298, phase 5. Outstanding IDs: C0131.

## C0132 — Stopping point

Original entry: Stopping point — knowing when a calculated line has reached a sufficiently stable evaluation.

- **C0132** · 4. Calculation and visualization · **unimplemented**
  Not implemented.

Proposed queue rank 299, phase 5. Outstanding IDs: C0132.

## C0133 — Final-position evaluation

Original entry: Final-position evaluation — judging the position at the end of a variation.

- **C0133** · 4. Calculation and visualization · **unimplemented**
  Not implemented.

Proposed queue rank 300, phase 5. Outstanding IDs: C0133.

## C0134 — Blunder check

Original entry: Blunder check — checking whether a proposed move allows an immediate tactical refutation.

- **C0134** · 4. Calculation and visualization · **unimplemented**
  Not implemented.

Proposed queue rank 301, phase 5. Outstanding IDs: C0134.

## C0135 — Opponent's best response

Original entry: Opponent's best response — calculating against the strongest defense rather than hoped-for moves.

- **C0135** · 4. Calculation and visualization · **unimplemented**
  Not implemented.

Proposed queue rank 302, phase 5. Outstanding IDs: C0135.

## C0136 — Backward calculation

Original entry: Backward calculation — reasoning from a desired tactical outcome toward the moves needed to create it.

- **C0136** · 4. Calculation and visualization · **unimplemented**
  Not implemented.

Proposed queue rank 303, phase 5. Outstanding IDs: C0136.

## C0137 — Elimination method

Original entry: Elimination method — rejecting inferior candidates until the best remains.

- **C0137** · 4. Calculation and visualization · **unimplemented**
  Not implemented.

Proposed queue rank 304, phase 5. Outstanding IDs: C0137.

## C0138 — Comparison of candidates

Original entry: Comparison of candidates — evaluating several plausible moves against each other.

- **C0138** · 4. Calculation and visualization · **unimplemented**
  Not implemented.

Proposed queue rank 305, phase 5. Outstanding IDs: C0138.

## C0139 — Control the center

Original entry: Control the center — influence central squares such as e4, d4, e5, and d5.

- **C0139** · 5. Opening principles · **partial**
  Partial: new pawn attacks on d4/e4/d5/e5 only.

Proposed queue rank 108, phase 3. Outstanding IDs: C0139.

## C0140 — Develop minor pieces

Original entry: Develop minor pieces — activate knights and bishops early.

- **C0140** · 5. Opening principles · **verified**
  Mechanics verified: same first-development history gate, with all four surviving minors off back rank explicitly recognized.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0141 — Castle early

Original entry: Castle early — usually secure the king before launching operations.

- **C0141** · 5. Opening principles · **unimplemented**
  Not implemented.

Proposed queue rank 109, phase 3. Outstanding IDs: C0141.

## C0142 — Connect the rooks

Original entry: Connect the rooks — clear the back rank so the rooks defend one another.

- **C0142** · 5. Opening principles · **verified**
  Mechanics verified: unobstructed same-rank/file rook alignment; geometric support only.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0143 — Avoid unnecessary pawn moves

Original entry: Avoid unnecessary pawn moves — prevent loss of development time.

- **C0143** · 5. Opening principles · **unimplemented**
  Not implemented.

Proposed queue rank 110, phase 3. Outstanding IDs: C0143.

## C0144 — Avoid repeated piece moves

Original entry: Avoid repeated piece moves — unless tactically or strategically justified.

- **C0144** · 5. Opening principles · **partial**
  Partial: actual repeated minor move and unmoved count explained; necessity/avoidance recommendation not established.

Proposed queue rank 111, phase 3. Outstanding IDs: C0144.

## C0145 — Do not bring the queen out too early

Original entry: Do not bring the queen out too early — an exposed queen can become a target.

- **C0145** · 5. Opening principles · **partial**
  Partial: actual first early queen move and minor count explained; harm/avoidance recommendation not established.

Proposed queue rank 112, phase 3. Outstanding IDs: C0145.

## C0146 — Opening tempo

Original entry: Opening tempo — time used to improve development.

- **C0146** · 5. Opening principles · **verified**
  Mechanics verified: checking first-development subset only; no net time advantage.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0147 — Development advantage

Original entry: Development advantage — having more active developed pieces.

- **C0147** · 5. Opening principles · **unimplemented**
  Not implemented.

Proposed queue rank 113, phase 3. Outstanding IDs: C0147.

## C0148 — Lead in development

Original entry: Lead in development — temporary time advantage that may support an attack.

- **C0148** · 5. Opening principles · **unimplemented**
  Not implemented.

Proposed queue rank 114, phase 3. Outstanding IDs: C0148.

## C0149 — Opening initiative

Original entry: Opening initiative — early pressure forcing the opponent to react.

- **C0149** · 5. Opening principles · **unimplemented**
  Not implemented.

Proposed queue rank 306, phase 5. Outstanding IDs: C0149.

## C0150 — Opening theory

Original entry: Opening theory — established analysis of opening variations.

- **C0150** · 5. Opening principles · **unimplemented**
  Not implemented.

Proposed queue rank 573, phase 6. Outstanding IDs: C0150.

## C0151 — Main line

Original entry: Main line — heavily studied theoretical continuation.

- **C0151** · 5. Opening principles · **unimplemented**
  Not implemented.

Proposed queue rank 574, phase 6. Outstanding IDs: C0151.

## C0152 — Sideline

Original entry: Sideline — less common opening continuation.

- **C0152** · 5. Opening principles · **unimplemented**
  Not implemented.

Proposed queue rank 575, phase 6. Outstanding IDs: C0152.

## C0153 — Novelty

Original entry: Novelty — a new move in a theoretically known position.

- **C0153** · 5. Opening principles · **unimplemented**
  Not implemented.

Proposed queue rank 576, phase 6. Outstanding IDs: C0153.

## C0154 — Preparation

Original entry: Preparation — studying likely opening positions before a game.

- **C0154** · 5. Opening principles · **unimplemented**
  Not implemented.

Proposed queue rank 577, phase 6. Outstanding IDs: C0154.

## C0155 — Move order

Original entry: Move order — sequence used to reach a particular position.

- **C0155** · 5. Opening principles · **unimplemented**
  Not implemented.

Proposed queue rank 115, phase 3. Outstanding IDs: C0155.

## C0156 — Transposition

Original entry: Transposition — reaching the same position through a different move order.

- **C0156** · 5. Opening principles · **unimplemented**
  Not implemented.

Proposed queue rank 116, phase 3. Outstanding IDs: C0156.

## C0157 — Opening repertoire

Original entry: Opening repertoire — set of openings a player regularly uses.

- **C0157** · 5. Opening principles · **unimplemented**
  Not implemented.

Proposed queue rank 578, phase 6. Outstanding IDs: C0157.

## C0158 — Repertoire depth

Original entry: Repertoire depth — how thoroughly opening variations are known.

- **C0158** · 5. Opening principles · **unimplemented**
  Not implemented.

Proposed queue rank 579, phase 6. Outstanding IDs: C0158.

## C0159 — Opening trap

Original entry: Opening trap — tactical pitfall occurring early in the game.

- **C0159** · 5. Opening principles · **unimplemented**
  Not implemented.

Proposed queue rank 199, phase 4. Outstanding IDs: C0159.

## C0160 — Gambit

Original entry: Gambit — offering material, commonly a pawn, for compensation.

- **C0160** · 5. Opening principles · **unimplemented**
  Not implemented.

Proposed queue rank 117, phase 3. Outstanding IDs: C0160.

## C0161 — Accepted gambit

Original entry: Accepted gambit — opponent takes the offered material.

- **C0161** · 5. Opening principles · **unimplemented**
  Not implemented.

Proposed queue rank 118, phase 3. Outstanding IDs: C0161.

## C0162 — Declined gambit

Original entry: Declined gambit — opponent refuses the offered material.

- **C0162** · 5. Opening principles · **unimplemented**
  Not implemented.

Proposed queue rank 119, phase 3. Outstanding IDs: C0162.

## C0163 — Countergambit

Original entry: Countergambit — responding to a gambit with another material offer.

- **C0163** · 5. Opening principles · **unimplemented**
  Not implemented.

Proposed queue rank 120, phase 3. Outstanding IDs: C0163.

## C0164 — Open game

Original entry: Open game — typically 1.e4 e5 structures with freer piece activity.

- **C0164** · 5. Opening principles · **unimplemented**
  Not implemented.

Proposed queue rank 121, phase 3. Outstanding IDs: C0164.

## C0165 — Semi-open game

Original entry: Semi-open game — 1.e4 followed by a Black response other than ...e5.

- **C0165** · 5. Opening principles · **unimplemented**
  Not implemented.

Proposed queue rank 122, phase 3. Outstanding IDs: C0165.

## C0166 — Closed game

Original entry: Closed game — often 1.d4 d5 structures with blocked centers.

- **C0166** · 5. Opening principles · **unimplemented**
  Not implemented.

Proposed queue rank 123, phase 3. Outstanding IDs: C0166.

## C0167 — Semi-closed game

Original entry: Semi-closed game — commonly 1.d4 followed by a Black response other than ...d5.

- **C0167** · 5. Opening principles · **unimplemented**
  Not implemented.

Proposed queue rank 124, phase 3. Outstanding IDs: C0167.

## C0168 — Hypermodern opening

Original entry: Hypermodern opening — allows the opponent some central occupation before attacking it.

- **C0168** · 5. Opening principles · **unimplemented**
  Not implemented.

Proposed queue rank 125, phase 3. Outstanding IDs: C0168.

## C0169 — Classical opening

Original entry: Classical opening — tends toward direct central occupation with pawns.

- **C0169** · 5. Opening principles · **unimplemented**
  Not implemented.

Proposed queue rank 126, phase 3. Outstanding IDs: C0169.

## C0170 — Opening equalization

Original entry: Opening equalization — Black successfully neutralizes White's first-move advantage.

- **C0170** · 5. Opening principles · **unimplemented**
  Not implemented.

Proposed queue rank 307, phase 5. Outstanding IDs: C0170.

## C0171 — Opening advantage

Original entry: Opening advantage — a favorable position obtained from the opening.

- **C0171** · 5. Opening principles · **unimplemented**
  Not implemented.

Proposed queue rank 308, phase 5. Outstanding IDs: C0171.

## C0172 — Pawn center

Original entry: Pawn center — central pawns occupying important squares.

- **C0172** · 6. The center · **partial**
  Partial: at least two pawns occupy d4/e4/d5/e5; formation facts only.

Proposed queue rank 71, phase 2. Outstanding IDs: C0172.

## C0173 — Piece center

Original entry: Piece center — central control primarily through pieces.

- **C0173** · 6. The center · **unimplemented**
  Not implemented.

Proposed queue rank 72, phase 2. Outstanding IDs: C0173.

## C0174 — Classical center

Original entry: Classical center — pawns directly occupying central squares.

- **C0174** · 6. The center · **partial**
  Partial: at least two pawns occupy d4/e4/d5/e5; formation facts only.

Proposed queue rank 73, phase 2. Outstanding IDs: C0174.

## C0175 — Hypermodern center

Original entry: Hypermodern center — central influence from a distance.

- **C0175** · 6. The center · **unimplemented**
  Not implemented.

Proposed queue rank 74, phase 2. Outstanding IDs: C0175.

## C0176 — Open center

Original entry: Open center — few or no central pawns blocking files and diagonals.

- **C0176** · 6. The center · **partial**
  Partial: d/e files become pawn-free; broader central activity not established.

Proposed queue rank 75, phase 2. Outstanding IDs: C0176.

## C0177 — Closed center

Original entry: Closed center — locked central pawn chains.

- **C0177** · 6. The center · **verified**
  Mechanics verified: matched locked chains with at least two mover pawns on central squares; no plan claim.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0178 — Fixed center

Original entry: Fixed center — central pawns cannot easily advance or capture.

- **C0178** · 6. The center · **partial**
  Partial: central pawn straight advances blocked and no geometric captures now; future transformation/ease not established.

Proposed queue rank 76, phase 2. Outstanding IDs: C0178.

## C0179 — Mobile center

Original entry: Mobile center — central pawns can advance and gain space.

- **C0179** · 6. The center · **unimplemented**
  Not implemented.

Proposed queue rank 127, phase 3. Outstanding IDs: C0179.

## C0180 — Dynamic center

Original entry: Dynamic center — central tension can rapidly change.

- **C0180** · 6. The center · **unimplemented**
  Not implemented.

Proposed queue rank 309, phase 5. Outstanding IDs: C0180.

## C0181 — Fluid center

Original entry: Fluid center — central pawn structure is unresolved.

- **C0181** · 6. The center · **unimplemented**
  Not implemented.

Proposed queue rank 128, phase 3. Outstanding IDs: C0181.

## C0182 — Pawn tension

Original entry: Pawn tension — opposing pawns can capture one another.

- **C0182** · 6. The center · **verified**
  Mechanics verified: opposing pawn attacks; resolving capture.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0183 — Maintaining tension

Original entry: Maintaining tension — delaying pawn exchanges.

- **C0183** · 6. The center · **unimplemented**
  Not implemented.

Proposed queue rank 77, phase 2. Outstanding IDs: C0183.

## C0184 — Releasing tension

Original entry: Releasing tension — resolving the pawn confrontation.

- **C0184** · 6. The center · **verified**
  Mechanics verified: opposing pawn attacks; resolving capture.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0185 — Central break

Original entry: Central break — pawn move challenging the opponent's center.

- **C0185** · 6. The center · **verified**
  Mechanics verified: new legal pawn-lever target occupies d4/e4/d5/e5; plan or advantage not inferred.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0186 — Undermining the center

Original entry: Undermining the center — attacking the base or support of central pawns.

- **C0186** · 6. The center · **verified**
  Mechanics verified: new legal pawn attack on base of enemy chain containing a central pawn; collapse not implied.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0187 — Overextended center

Original entry: Overextended center — central pawns have advanced farther than they can safely support.

- **C0187** · 6. The center · **unimplemented**
  Not implemented.

Proposed queue rank 310, phase 5. Outstanding IDs: C0187.

## C0188 — Center collapse

Original entry: Center collapse — central pawn structure becomes tactically or strategically unsustainable.

- **C0188** · 6. The center · **unimplemented**
  Not implemented.

Proposed queue rank 311, phase 5. Outstanding IDs: C0188.

## C0189 — Pawn structure

Original entry: Pawn structure — overall arrangement of pawns.

- **C0189** · 7. Pawn structure · **unimplemented**
  Not implemented.

Proposed queue rank 15, phase 1. Outstanding IDs: C0189.

## C0190 — Pawn skeleton

Original entry: Pawn skeleton — another term for the basic pawn structure.

- **C0190** · 7. Pawn structure · **unimplemented**
  Not implemented.

Proposed queue rank 16, phase 1. Outstanding IDs: C0190.

## C0191 — Pawn chain

Original entry: Pawn chain — diagonally connected pawns.

- **C0191** · 7. Pawn structure · **verified**
  Mechanics verified: directed pawn-support component; rear bases and most advanced heads.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0192 — Base of the pawn chain

Original entry: Base of the pawn chain — rear pawn supporting the rest of the chain.

- **C0192** · 7. Pawn structure · **verified**
  Mechanics verified: directed pawn-support component; rear bases and most advanced heads.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0193 — Head of the pawn chain

Original entry: Head of the pawn chain — most advanced pawn in the chain.

- **C0193** · 7. Pawn structure · **verified**
  Mechanics verified: directed pawn-support component; rear bases and most advanced heads.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0194 — Pawn island

Original entry: Pawn island — group of connected pawns separated from other pawns.

- **C0194** · 7. Pawn structure · **verified**
  Mechanics verified: contiguous occupied-file groups.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0195 — Pawn majority

Original entry: Pawn majority — more pawns than the opponent on one section of the board.

- **C0195** · 7. Pawn structure · **verified**
  Mechanics verified: counts on fixed a–d/e–h wings; no plan or advantage claim.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0196 — Queenside majority

Original entry: Queenside majority — pawn numerical superiority on the queenside.

- **C0196** · 7. Pawn structure · **verified**
  Mechanics verified: counts on fixed a–d/e–h wings; no plan or advantage claim.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0197 — Kingside majority

Original entry: Kingside majority — pawn numerical superiority on the kingside.

- **C0197** · 7. Pawn structure · **verified**
  Mechanics verified: counts on fixed a–d/e–h wings; no plan or advantage claim.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0198 — Minority attack

Original entry: Minority attack — advancing a smaller pawn group against a larger opposing pawn group.

- **C0198** · 7. Pawn structure · **unimplemented**
  Not implemented.

Proposed queue rank 312, phase 5. Outstanding IDs: C0198.

## C0199 — Passed pawn

Original entry: Passed pawn — pawn with no opposing pawn able to stop it on adjacent files.

- **C0199** · 7. Pawn structure · **verified**
  Mechanics verified: passed-pawn geometry, including legal en-passant exception; creation or advance.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0200 — Protected passed pawn

Original entry: Protected passed pawn — passed pawn defended by another pawn.

- **C0200** · 7. Pawn structure · **verified**
  Mechanics verified: passer attacked by a friendly pawn; legal recapture or safe advance not promised.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0201 — Connected passed pawns

Original entry: Connected passed pawns — neighboring passed pawns protecting each other.

- **C0201** · 7. Pawn structure · **partial**
  Partial: adjacent-file passers at most one rank apart; reciprocal protection in supplied wording not established.

Proposed queue rank 17, phase 1. Outstanding IDs: C0201.

## C0202 — Outside passed pawn

Original entry: Outside passed pawn — passed pawn far from the main action.

- **C0202** · 7. Pawn structure · **verified**
  Mechanics verified: actual flank passer advance with every other pawn at least three files away, at least two other pawns including both colors; no king diversion or win claim.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0203 — Distant passed pawn

Original entry: Distant passed pawn — passed pawn capable of distracting the enemy king.

- **C0203** · 7. Pawn structure · **verified**
  Mechanics verified: actual flank passer advance with every other pawn at least three files away, at least two other pawns including both colors; no king diversion or win claim.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0204 — Candidate passed pawn

Original entry: Candidate passed pawn — pawn likely to become passed.

- **C0204** · 7. Pawn structure · **unimplemented**
  Not implemented.

Proposed queue rank 129, phase 3. Outstanding IDs: C0204.

## C0205 — Backward pawn

Original entry: Backward pawn — pawn unable to advance safely and lacking neighboring pawn support.

- **C0205** · 7. Pawn structure · **unimplemented**
  Not implemented.

Proposed queue rank 130, phase 3. Outstanding IDs: C0205.

## C0206 — Isolated pawn

Original entry: Isolated pawn — pawn with no friendly pawn on neighboring files.

- **C0206** · 7. Pawn structure · **verified**
  Mechanics verified: no friendly pawn on either neighboring file; IQP restricted to d-file.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0207 — Isolated queen's pawn / IQP

Original entry: Isolated queen's pawn / IQP — isolated pawn on the d-file, usually d4 or d5.

- **C0207** · 7. Pawn structure · **verified**
  Mechanics verified: no friendly pawn on either neighboring file; IQP restricted to d-file.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0208 — Hanging pawns

Original entry: Hanging pawns — adjacent pawns, typically on c- and d-files, without neighboring support.

- **C0208** · 7. Pawn structure · **verified**
  Mechanics verified: new same-rank c/d pair at relative fourth/fifth rank, no other c/d or b/e pawns; no weakness claim.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0209 — Doubled pawns

Original entry: Doubled pawns — two friendly pawns on the same file.

- **C0209** · 7. Pawn structure · **verified**
  Mechanics verified: same-file friendly pawn counts.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0210 — Tripled pawns

Original entry: Tripled pawns — three friendly pawns on the same file.

- **C0210** · 7. Pawn structure · **verified**
  Mechanics verified: same-file friendly pawn counts.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0211 — Pawn weakness

Original entry: Pawn weakness — pawn that is difficult to defend.

- **C0211** · 7. Pawn structure · **unimplemented**
  Not implemented.

Proposed queue rank 131, phase 3. Outstanding IDs: C0211.

## C0212 — Weak square

Original entry: Weak square — square that cannot conveniently be protected by a pawn.

- **C0212** · 7. Pawn structure · **unimplemented**
  Not implemented.

Proposed queue rank 132, phase 3. Outstanding IDs: C0212.

## C0213 — Pawn hole

Original entry: Pawn hole — permanently weak square created by pawn movement.

- **C0213** · 7. Pawn structure · **unimplemented**
  Not implemented.

Proposed queue rank 89, phase 2. Outstanding IDs: C0213.

## C0214 — Pawn lever

Original entry: Pawn lever — pawn advance that attacks an opposing pawn.

- **C0214** · 7. Pawn structure · **verified**
  Mechanics verified: new pawn attack with a legal hypothetical same-side capture; opponent can respond.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0215 — Pawn break

Original entry: Pawn break — pawn move designed to alter the structure.

- **C0215** · 7. Pawn structure · **verified**
  Mechanics verified: actual new pawn challenge to an enemy ram with every reply vacating blocker or permitting its legal capture; actual capture release/escape requires straight advance after every reply; complete legal history and move subsets, no advantage/permanence claim.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0216 — Breakthrough

Original entry: Breakthrough — pawn sequence creating a passed pawn or penetration.

- **C0216** · 7. Pawn structure · **unimplemented**
  Not implemented.

Proposed queue rank 200, phase 4. Outstanding IDs: C0216.

## C0217 — Pawn storm

Original entry: Pawn storm — coordinated pawn advance, usually toward the enemy king.

- **C0217** · 7. Pawn structure · **verified**
  Mechanics verified: distinct adjacent advanced pawns progress on consecutive own turns after a history-verified enemy castle, on its unchanged king flank; full history, identities and every reply retained; no intent, safety or successful-attack claim.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0218 — Pawn race

Original entry: Pawn race — both sides rush pawns toward promotion.

- **C0218** · 7. Pawn structure · **verified**
  Mechanics verified: pure king-and-one-advanced-passed-pawn per side; full legal all-defense bounded route proves own pawn queens first using straight advances, with all post-promotion replies retained; no automatic win or queen-safety claim.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0219 — Pawn wedge

Original entry: Pawn wedge — advanced pawn restricting the enemy position.

- **C0219** · 7. Pawn structure · **unimplemented**
  Not implemented.

Proposed queue rank 18, phase 1. Outstanding IDs: C0219.

## C0220 — Cramping pawn

Original entry: Cramping pawn — pawn that seriously limits enemy pieces.

- **C0220** · 7. Pawn structure · **unimplemented**
  Not implemented.

Proposed queue rank 133, phase 3. Outstanding IDs: C0220.

## C0221 — Pawn duo

Original entry: Pawn duo — neighboring pawns side by side.

- **C0221** · 7. Pawn structure · **verified**
  Mechanics verified: adjacent same-rank pawns; phalanx requires at least three.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0222 — Pawn phalanx

Original entry: Pawn phalanx — multiple pawns advancing side by side.

- **C0222** · 7. Pawn structure · **verified**
  Mechanics verified: adjacent same-rank pawns; phalanx requires at least three.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0223 — Ram

Original entry: Ram — two opposing pawns directly blocking each other.

- **C0223** · 7. Pawn structure · **verified**
  Mechanics verified: opposing pawns block straight advancement.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0224 — Pawn fixation

Original entry: Pawn fixation — forcing an enemy pawn to remain on a vulnerable square.

- **C0224** · 7. Pawn structure · **verified**
  Mechanics verified: actual pawn advance/capture creates enemy pawn ram; EVERY legal enemy reply remains live, preserves both ram pawns and leaves ZERO legal tracked pawn moves next own turn; bounded fixation only.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0225 — Pawn target

Original entry: Pawn target — pawn that can be attacked repeatedly.

- **C0225** · 7. Pawn structure · **unimplemented**
  Not implemented.

Proposed queue rank 134, phase 3. Outstanding IDs: C0225.

## C0226 — Pawn shield

Original entry: Pawn shield — pawns protecting the king.

- **C0226** · 7. Pawn structure · **partial**
  Partial: pawn squares within two forward ranks on three files around c/e/g home-rank king; safety not measured.

Proposed queue rank 19, phase 1. Outstanding IDs: C0226.

## C0227 — Pawn cover

Original entry: Pawn cover — structure shielding the king from attacks.

- **C0227** · 7. Pawn structure · **partial**
  Partial: pawn squares within two forward ranks on three files around c/e/g home-rank king; safety not measured.

Proposed queue rank 135, phase 3. Outstanding IDs: C0227.

## C0228 — Pawn sacrifice

Original entry: Pawn sacrifice — pawn intentionally given for activity, development, or structure.

- **C0228** · 7. Pawn structure · **verified**
  Mechanics verified: actual moved pawn may be legally captured, including en passant, yet every defense retains bounded forced mate; activity-for-mate subset.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0229 — Structural weakness

Original entry: Structural weakness — long-term defect in the pawn formation.

- **C0229** · 7. Pawn structure · **unimplemented**
  Not implemented.

Proposed queue rank 136, phase 3. Outstanding IDs: C0229.

## C0230 — Structural advantage

Original entry: Structural advantage — healthier or more useful pawn arrangement.

- **C0230** · 7. Pawn structure · **unimplemented**
  Not implemented.

Proposed queue rank 313, phase 5. Outstanding IDs: C0230.

## C0231 — Color-complex weakness

Original entry: Color-complex weakness — weaknesses concentrated on squares of one color.

- **C0231** · 7. Pawn structure · **unimplemented**
  Not implemented.

Proposed queue rank 137, phase 3. Outstanding IDs: C0231.

## C0232 — Dark-square weakness

Original entry: Dark-square weakness — vulnerability on dark squares.

- **C0232** · 7. Pawn structure · **unimplemented**
  Not implemented.

Proposed queue rank 138, phase 3. Outstanding IDs: C0232.

## C0233 — Light-square weakness

Original entry: Light-square weakness — vulnerability on light squares.

- **C0233** · 7. Pawn structure · **unimplemented**
  Not implemented.

Proposed queue rank 139, phase 3. Outstanding IDs: C0233.

## C0234 — Carlsbad structure

Original entry: Carlsbad structure

- **C0234** · 8. Common pawn structures · **verified**
  Mechanics verified: new current fixed d4/e3 against c6/d5 core with exactly one pawn on each stated file, legal own/enemy support, queenside own2/enemy3 and kingside own4/enemy3; no opening or historical pawn-origin inference, strategic success or permanent weakness.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0235 — Isolated queen's pawn structure

Original entry: Isolated queen's pawn structure

- **C0235** · 8. Common pawn structures · **verified**
  Mechanics verified: no friendly pawn on either neighboring file; IQP restricted to d-file.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0236 — Hanging-pawn structure

Original entry: Hanging-pawn structure

- **C0236** · 8. Common pawn structures · **verified**
  Mechanics verified: new same-rank c/d pair at relative fourth/fifth rank, no other c/d or b/e pawns; no weakness claim.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0237 — Maroczy Bind

Original entry: Maroczy Bind

- **C0237** · 8. Common pawn structures · **verified**
  Mechanics verified: newly completed fixed c4/e4 (explicit reversed c5/e5 for black), recorded original d-start/c-start pawn exchange and immediate nonpawn recapture, both legal common-target pawn captures, no own d-file/enemy c-file pawn; no FEN-only provenance or strategic restriction inference.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0238 — Hedgehog structure

Original entry: Hedgehog structure

- **C0238** · 8. Common pawn structures · **verified**
  Mechanics verified: new a6/b6/d6/e6 core (explicit reversed own a3/b3/d3/e3), opposing c4/e4 context, missing own c-file/enemy d-file pawn, all six empty forward targets with every named legal pawn-control edge and extra captures; current control only, no successful breaks/counterplay inference.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0239 — Stonewall structure

Original entry: Stonewall structure

- **C0239** · 8. Common pawn structures · **verified**
  Mechanics verified: newly completed fixed c3/d4/e3/f4 formation (color reverse c6/d5/e6/f5), all three named pawn-support links certified by legal countercaptures; full-history responses include lost pawns and terminals; no strength/permanence inference.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0240 — French pawn chain

Original entry: French pawn chain

- **C0240** · 8. Common pawn structures · **verified**
  Mechanics verified: French-type current advanced/base actor chains on fixed d/e files, both legal support links, two opposing pawn rams and complete named-pawn legal move sets with no forward push; explicit reversed roles; no opening or permanent closure inference.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0241 — Caro-Kann structure

Original entry: Caro-Kann structure

- **C0241** · 8. Common pawn structures · **unimplemented**
  Not implemented.

Proposed queue rank 140, phase 3. Outstanding IDs: C0241.

## C0242 — Slav structure

Original entry: Slav structure

- **C0242** · 8. Common pawn structures · **unimplemented**
  Not implemented.

Proposed queue rank 141, phase 3. Outstanding IDs: C0242.

## C0243 — Queen's Gambit structure

Original entry: Queen's Gambit structure

- **C0243** · 8. Common pawn structures · **unimplemented**
  Not implemented.

Proposed queue rank 142, phase 3. Outstanding IDs: C0243.

## C0244 — Benoni structure

Original entry: Benoni structure

- **C0244** · 8. Common pawn structures · **unimplemented**
  Not implemented.

Proposed queue rank 143, phase 3. Outstanding IDs: C0244.

## C0245 — Benko structure

Original entry: Benko structure

- **C0245** · 8. Common pawn structures · **unimplemented**
  Not implemented.

Proposed queue rank 144, phase 3. Outstanding IDs: C0245.

## C0246 — King's Indian structure

Original entry: King's Indian structure

- **C0246** · 8. Common pawn structures · **unimplemented**
  Not implemented.

Proposed queue rank 145, phase 3. Outstanding IDs: C0246.

## C0247 — Grünfeld center

Original entry: Grünfeld center

- **C0247** · 8. Common pawn structures · **unimplemented**
  Not implemented.

Proposed queue rank 146, phase 3. Outstanding IDs: C0247.

## C0248 — Sicilian Scheveningen structure

Original entry: Sicilian Scheveningen structure

- **C0248** · 8. Common pawn structures · **verified**
  Mechanics verified: new compact d6/e6 center (explicit reversed d3/e3), opposing e4/e5 context, recorded original own c-start/enemy d-start exchange and immediate nonpawn recapture, no own c-file/enemy d-file pawn; all four empty forward targets with complete legal captures; no safe center or strategic strength inference.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0249 — Najdorf structure

Original entry: Najdorf structure

- **C0249** · 8. Common pawn structures · **unimplemented**
  Not implemented.

Proposed queue rank 147, phase 3. Outstanding IDs: C0249.

## C0250 — Dragon structure

Original entry: Dragon structure

- **C0250** · 8. Common pawn structures · **unimplemented**
  Not implemented.

Proposed queue rank 148, phase 3. Outstanding IDs: C0250.

## C0251 — Closed Sicilian structure

Original entry: Closed Sicilian structure

- **C0251** · 8. Common pawn structures · **unimplemented**
  Not implemented.

Proposed queue rank 149, phase 3. Outstanding IDs: C0251.

## C0252 — Botvinnik structure

Original entry: Botvinnik structure

- **C0252** · 8. Common pawn structures · **unimplemented**
  Not implemented.

Proposed queue rank 150, phase 3. Outstanding IDs: C0252.

## C0253 — Panov structure

Original entry: Panov structure

- **C0253** · 8. Common pawn structures · **unimplemented**
  Not implemented.

Proposed queue rank 151, phase 3. Outstanding IDs: C0253.

## C0254 — Symmetrical pawn structure

Original entry: Symmetrical pawn structure

- **C0254** · 8. Common pawn structures · **verified**
  Mechanics verified: exact same-file rank-reflection of at least two pawns each; full position/evaluation symmetry not implied.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0255 — Four-versus-three kingside structure

Original entry: Four-versus-three kingside structure

- **C0255** · 8. Common pawn structures · **verified**
  Mechanics verified: counts on fixed a–d/e–h wings; no plan or advantage claim.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0256 — Three-versus-two queenside majority

Original entry: Three-versus-two queenside majority

- **C0256** · 8. Common pawn structures · **verified**
  Mechanics verified: counts on fixed a–d/e–h wings; no plan or advantage claim.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0257 — Opposite-wing pawn majorities

Original entry: Opposite-wing pawn majorities

- **C0257** · 8. Common pawn structures · **verified**
  Mechanics verified: counts on fixed a–d/e–h wings; no plan or advantage claim.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0258 — Locked pawn chains

Original entry: Locked pawn chains

- **C0258** · 8. Common pawn structures · **verified**
  Mechanics verified: two matched support components whose members all ram opposing pawns.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0259 — Open-file pawn structure

Original entry: Open-file pawn structure

- **C0259** · 8. Common pawn structures · **unimplemented**
  Not implemented.

Proposed queue rank 20, phase 1. Outstanding IDs: C0259.

## C0260 — Open file

Original entry: Open file — file containing no pawns.

- **C0260** · 9. Squares, files, ranks, and diagonals · **verified**
  Mechanics verified: pawn-free file geometry and new rook/queen occupation.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0261 — Semi-open file

Original entry: Semi-open file — file where one player has no pawn.

- **C0261** · 9. Squares, files, ranks, and diagonals · **verified**
  Mechanics verified: pawn-free file geometry and new rook/queen occupation.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0262 — Closed file

Original entry: Closed file — file blocked by pawns.

- **C0262** · 9. Squares, files, ranks, and diagonals · **verified**
  Mechanics verified: actual moved rook/queen on file with pawns of BOTH colors, complete pawn lists and vertical rays; every legal enemy reply and tracked slider legal file move retained; no advantage, permanence or closed-position claim.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0263 — Open rank

Original entry: Open rank — rank available for horizontal rook or queen activity.

- **C0263** · 9. Squares, files, ranks, and diagonals · **unimplemented**
  Not implemented.

Proposed queue rank 21, phase 1. Outstanding IDs: C0263.

## C0264 — Open diagonal

Original entry: Open diagonal — diagonal unobstructed for bishop or queen.

- **C0264** · 9. Squares, files, ranks, and diagonals · **verified**
  Mechanics verified: new full edge-to-edge bishop line of length at least five has no other piece; length eight identifies a long diagonal; geometric control only.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0265 — Long diagonal

Original entry: Long diagonal — a1–h8 or h1–a8 diagonal.

- **C0265** · 9. Squares, files, ranks, and diagonals · **verified**
  Mechanics verified: new full edge-to-edge bishop line of length at least five has no other piece; length eight identifies a long diagonal; geometric control only.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0266 — Weak square

Original entry: Weak square — square difficult for one player to defend.

- **C0266** · 9. Squares, files, ranks, and diagonals · **unimplemented**
  Not implemented.

Proposed queue rank 90, phase 2. Outstanding IDs: C0266.

## C0267 — Strong square

Original entry: Strong square — useful square that is difficult for the opponent to challenge.

- **C0267** · 9. Squares, files, ranks, and diagonals · **unimplemented**
  Not implemented.

Proposed queue rank 91, phase 2. Outstanding IDs: C0267.

## C0268 — Outpost

Original entry: Outpost — secure square, usually for a knight, that cannot be attacked by enemy pawns.

- **C0268** · 9. Squares, files, ranks, and diagonals · **verified**
  Mechanics verified: pawn-supported knight on relative rank 4–6; complete occupancy-independent forward/capture-file DAGs prove no current enemy pawn can reach an attacking square before promotion; legal support counterframe and every legal reply retained; no safety against other/promoted pieces.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0269 — Advanced outpost

Original entry: Advanced outpost — outpost deep in enemy territory.

- **C0269** · 9. Squares, files, ranks, and diagonals · **verified**
  Mechanics verified: the outpost proof plus relative rank six; no general best-square or positional-strength claim.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0270 — Entry square

Original entry: Entry square — square allowing penetration into the opponent's position.

- **C0270** · 9. Squares, files, ranks, and diagonals · **unimplemented**
  Not implemented.

Proposed queue rank 201, phase 4. Outstanding IDs: C0270.

## C0271 — Penetration square

Original entry: Penetration square — strategically valuable invading square.

- **C0271** · 9. Squares, files, ranks, and diagonals · **unimplemented**
  Not implemented.

Proposed queue rank 202, phase 4. Outstanding IDs: C0271.

## C0272 — Key square

Original entry: Key square — strategically or tactically decisive square.

- **C0272** · 9. Squares, files, ranks, and diagonals · **unimplemented**
  Not implemented.

Proposed queue rank 203, phase 4. Outstanding IDs: C0272.

## C0273 — Critical square

Original entry: Critical square — square important to the evaluation of the position.

- **C0273** · 9. Squares, files, ranks, and diagonals · **unimplemented**
  Not implemented.

Proposed queue rank 204, phase 4. Outstanding IDs: C0273.

## C0274 — Blockade square

Original entry: Blockade square — ideal square from which a passed pawn can be restrained.

- **C0274** · 9. Squares, files, ranks, and diagonals · **verified**
  Mechanics verified: actual moved nonpawn piece occupies the square immediately ahead of an unchanged enemy pawn; complete legal enemy replies show no straight advance; pawn captures and blocker removals retained; no permanent/best-move claim.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0275 — Corresponding squares

Original entry: Corresponding squares — endgame squares whose occupation determines king maneuvering.

- **C0275** · 9. Squares, files, ranks, and diagonals · **unimplemented**
  Not implemented.

Proposed queue rank 205, phase 4. Outstanding IDs: C0275.

## C0276 — Positional advantage

Original entry: Positional advantage — long-term advantage not based on immediate tactics.

- **C0276** · 10. Positional chess · **unimplemented**
  Not implemented.

Proposed queue rank 314, phase 5. Outstanding IDs: C0276.

## C0277 — Static advantage

Original entry: Static advantage — durable feature unlikely to disappear quickly.

- **C0277** · 10. Positional chess · **unimplemented**
  Not implemented.

Proposed queue rank 315, phase 5. Outstanding IDs: C0277.

## C0278 — Dynamic advantage

Original entry: Dynamic advantage — temporary advantage based on activity or initiative.

- **C0278** · 10. Positional chess · **unimplemented**
  Not implemented.

Proposed queue rank 316, phase 5. Outstanding IDs: C0278.

## C0279 — Compensation

Original entry: Compensation — benefits received in return for a disadvantage such as sacrificed material.

- **C0279** · 10. Positional chess · **unimplemented**
  Not implemented.

Proposed queue rank 317, phase 5. Outstanding IDs: C0279.

## C0280 — Long-term compensation

Original entry: Long-term compensation — strategic advantages that persist.

- **C0280** · 10. Positional chess · **unimplemented**
  Not implemented.

Proposed queue rank 318, phase 5. Outstanding IDs: C0280.

## C0281 — Temporary compensation

Original entry: Temporary compensation — advantages that must be exploited quickly.

- **C0281** · 10. Positional chess · **unimplemented**
  Not implemented.

Proposed queue rank 319, phase 5. Outstanding IDs: C0281.

## C0282 — Improving the worst-placed piece

Original entry: Improving the worst-placed piece — classic positional principle.

- **C0282** · 10. Positional chess · **unimplemented**
  Not implemented.

Proposed queue rank 320, phase 5. Outstanding IDs: C0282.

## C0283 — Restriction

Original entry: Restriction — limiting the opponent's pieces and pawn breaks.

- **C0283** · 10. Positional chess · **verified**
  Mechanics verified: static legal destination count drops by at least two to at most two; explicit hypothetical before-opponent turn, no quality or future-position claim.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0284 — Prophylaxis

Original entry: Prophylaxis — preventing the opponent's intended plan.

- **C0284** · 10. Positional chess · **unimplemented**
  Not implemented.

Proposed queue rank 321, phase 5. Outstanding IDs: C0284.

## C0285 — Preventive move

Original entry: Preventive move — move designed primarily to stop an enemy idea.

- **C0285** · 10. Positional chess · **unimplemented**
  Not implemented.

Proposed queue rank 322, phase 5. Outstanding IDs: C0285.

## C0286 — Accumulation of advantages

Original entry: Accumulation of advantages — gradually collecting small positional benefits.

- **C0286** · 10. Positional chess · **unimplemented**
  Not implemented.

Proposed queue rank 323, phase 5. Outstanding IDs: C0286.

## C0287 — Two weaknesses principle

Original entry: Two weaknesses principle — creating a second target to overload the defense.

- **C0287** · 10. Positional chess · **unimplemented**
  Not implemented.

Proposed queue rank 324, phase 5. Outstanding IDs: C0287.

## C0288 — Multiple weaknesses

Original entry: Multiple weaknesses — attacking several weaknesses across the board.

- **C0288** · 10. Positional chess · **unimplemented**
  Not implemented.

Proposed queue rank 325, phase 5. Outstanding IDs: C0288.

## C0289 — Space advantage

Original entry: Space advantage — controlling more territory.

- **C0289** · 10. Positional chess · **unimplemented**
  Not implemented.

Proposed queue rank 326, phase 5. Outstanding IDs: C0289.

## C0290 — Space disadvantage

Original entry: Space disadvantage — having restricted maneuvering room.

- **C0290** · 10. Positional chess · **unimplemented**
  Not implemented.

Proposed queue rank 327, phase 5. Outstanding IDs: C0290.

## C0291 — Cramped position

Original entry: Cramped position — pieces lack useful squares.

- **C0291** · 10. Positional chess · **unimplemented**
  Not implemented.

Proposed queue rank 328, phase 5. Outstanding IDs: C0291.

## C0292 — Piece improvement

Original entry: Piece improvement — relocating a piece to a more useful square.

- **C0292** · 10. Positional chess · **unimplemented**
  Not implemented.

Proposed queue rank 329, phase 5. Outstanding IDs: C0292.

## C0293 — Piece optimization

Original entry: Piece optimization — placing pieces on squares maximizing their potential.

- **C0293** · 10. Positional chess · **unimplemented**
  Not implemented.

Proposed queue rank 330, phase 5. Outstanding IDs: C0293.

## C0294 — Maneuvering

Original entry: Maneuvering — repositioning pieces without immediate tactical action.

- **C0294** · 10. Positional chess · **unimplemented**
  Not implemented.

Proposed queue rank 331, phase 5. Outstanding IDs: C0294.

## C0295 — Regrouping

Original entry: Regrouping — reorganizing pieces for a new objective.

- **C0295** · 10. Positional chess · **unimplemented**
  Not implemented.

Proposed queue rank 332, phase 5. Outstanding IDs: C0295.

## C0296 — Re-routing

Original entry: Re-routing — transferring a piece through several squares to a better post.

- **C0296** · 10. Positional chess · **unimplemented**
  Not implemented.

Proposed queue rank 333, phase 5. Outstanding IDs: C0296.

## C0297 — Transformation of advantages

Original entry: Transformation of advantages — converting one advantage into another.

- **C0297** · 10. Positional chess · **unimplemented**
  Not implemented.

Proposed queue rank 334, phase 5. Outstanding IDs: C0297.

## C0298 — Conversion

Original entry: Conversion — turning an advantage into a win.

- **C0298** · 10. Positional chess · **unimplemented**
  Not implemented.

Proposed queue rank 335, phase 5. Outstanding IDs: C0298.

## C0299 — Consolidation

Original entry: Consolidation — stabilizing the position after winning material or gaining an advantage.

- **C0299** · 10. Positional chess · **unimplemented**
  Not implemented.

Proposed queue rank 336, phase 5. Outstanding IDs: C0299.

## C0300 — Strategic trade

Original entry: Strategic trade — exchange based on positional considerations.

- **C0300** · 10. Positional chess · **unimplemented**
  Not implemented.

Proposed queue rank 337, phase 5. Outstanding IDs: C0300.

## C0301 — Good piece versus bad piece

Original entry: Good piece versus bad piece — comparing effectiveness rather than nominal value.

- **C0301** · 10. Positional chess · **unimplemented**
  Not implemented.

Proposed queue rank 338, phase 5. Outstanding IDs: C0301.

## C0302 — Domination

Original entry: Domination — restricting an enemy piece or the entire position.

- **C0302** · 10. Positional chess · **verified**
  Mechanics verified: every legal move by the named unit permits tracked capture with positive gain through every immediate counterreply; other defenses not promised.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0303 — Bind

Original entry: Bind — structure that severely restricts pawn breaks and piece activity.

- **C0303** · 10. Positional chess · **unimplemented**
  Not implemented.

Proposed queue rank 339, phase 5. Outstanding IDs: C0303.

## C0304 — Restriction before attack

Original entry: Restriction before attack — reducing counterplay before beginning an offensive.

- **C0304** · 10. Positional chess · **partial**
  Partial: finite mobility/trap witnesses are implemented; separate preparatory history or larger combination intent remains unresolved.

Proposed queue rank 340, phase 5. Outstanding IDs: C0304.

## C0305 — Multi-purpose move

Original entry: Multi-purpose move — move achieving several strategic objectives.

- **C0305** · 10. Positional chess · **unimplemented**
  Not implemented.

Proposed queue rank 341, phase 5. Outstanding IDs: C0305.

## C0306 — Bishop pair

Original entry: Bishop pair — owning both bishops.

- **C0306** · 11. Bishops · **verified**
  Mechanics verified: both square-color complexes represented; excludes two same-color promoted bishops.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0307 — Two bishops advantage

Original entry: Two bishops advantage — bishops can become especially powerful in open positions.

- **C0307** · 11. Bishops · **unimplemented**
  Not implemented.

Proposed queue rank 342, phase 5. Outstanding IDs: C0307.

## C0308 — Good bishop

Original entry: Good bishop — bishop whose own pawns do not seriously restrict it.

- **C0308** · 11. Bishops · **verified**
  Mechanics verified: new good-bishop pattern has at least two own pawns, all opposite the bishop square color; pawn relation only, not overall strategic value.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0309 — Bad bishop

Original entry: Bad bishop — bishop restricted by its own pawns.

- **C0309** · 11. Bishops · **verified**
  Mechanics verified: new bad-bishop pattern has at least two fixed central same-color own pawns, a direct forward blocker and at most four geometric controlled squares; not overall strategic value.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0310 — Active bishop

Original entry: Active bishop — bishop with useful targets and diagonals.

- **C0310** · 11. Bishops · **unimplemented**
  Not implemented.

Proposed queue rank 343, phase 5. Outstanding IDs: C0310.

## C0311 — Passive bishop

Original entry: Passive bishop — bishop with limited activity.

- **C0311** · 11. Bishops · **unimplemented**
  Not implemented.

Proposed queue rank 344, phase 5. Outstanding IDs: C0311.

## C0312 — Outside the pawn chain

Original entry: Outside the pawn chain — placing the bishop beyond its own restrictive pawns.

- **C0312** · 11. Bishops · **unimplemented**
  Not implemented.

Proposed queue rank 22, phase 1. Outstanding IDs: C0312.

## C0313 — Fianchetto

Original entry: Fianchetto — developing a bishop to b2, g2, b7, or g7.

- **C0313** · 11. Bishops · **verified**
  Mechanics verified: new prepared formation requires actual home-to-b2/g2/b7/g7 bishop move and advanced own flank pawn; no first-ever development or suitability claim.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0314 — Long-diagonal bishop

Original entry: Long-diagonal bishop — bishop controlling a major diagonal.

- **C0314** · 11. Bishops · **verified**
  Mechanics verified: new full edge-to-edge bishop line of length at least five has no other piece; length eight identifies a long diagonal; geometric control only.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0315 — Bishop sacrifice

Original entry: Bishop sacrifice — often used to expose a king.

- **C0315** · 11. Bishops · **verified**
  Mechanics verified: legally capturable moved bishop retains bounded all-defense mate; tested clearance-check subset, not all bishop sacrifices.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0316 — Opposite-colored bishops

Original entry: Opposite-colored bishops — each player retains a bishop on different-colored squares.

- **C0316** · 11. Bishops · **verified**
  Mechanics verified: one bishop per side, only kings/pawns/bishops remain; square-color classification.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0317 — Same-colored bishops

Original entry: Same-colored bishops — both bishops operate on the same color complex.

- **C0317** · 11. Bishops · **verified**
  Mechanics verified: one bishop per side, only kings/pawns/bishops remain; square-color classification.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0318 — Bishop versus knight

Original entry: Bishop versus knight — strategic comparison based on structure and position.

- **C0318** · 11. Bishops · **partial**
  Partial: exact non-pawn army combinations only; strategic comparison deferred.

Proposed queue rank 345, phase 5. Outstanding IDs: C0318.

## C0319 — Bishop in open position

Original entry: Bishop in open position — bishops generally benefit from fewer pawns and open lines.

- **C0319** · 11. Bishops · **unimplemented**
  Not implemented.

Proposed queue rank 346, phase 5. Outstanding IDs: C0319.

## C0320 — Bishop behind pawn chain

Original entry: Bishop behind pawn chain — potentially restricted piece requiring liberation.

- **C0320** · 11. Bishops · **partial**
  Partial: friendly chain pawn directly blocks bishop’s forward diagonal; passivity/liberation not assessed.

Proposed queue rank 23, phase 1. Outstanding IDs: C0320.

## C0321 — Knight outpost

Original entry: Knight outpost

- **C0321** · 12. Knights · **partial**
  Partial: new pawn-supported knight on c–f relative ranks 4–6; no enemy pawn ahead on neighboring files; future exchanges/permanence deferred.
- **C0701** · 26. Knight endings · **partial**
  Partial: new pawn-supported knight on c–f relative ranks 4–6; no enemy pawn ahead on neighboring files; future exchanges/permanence deferred.

Proposed queue rank 347, phase 5. Outstanding IDs: C0321, C0701.

## C0322 — Centralized knight

Original entry: Centralized knight

- **C0322** · 12. Knights · **verified**
  Mechanics verified: knight arrives on d4/e4/d5/e5.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0323 — Rim knight

Original entry: Rim knight

- **C0323** · 12. Knights · **verified**
  Mechanics verified: new knight placement on board edge, inherited E021 mechanics.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0324 — Knight maneuver

Original entry: Knight maneuver

- **C0324** · 12. Knights · **unimplemented**
  Not implemented.

Proposed queue rank 152, phase 3. Outstanding IDs: C0324.

## C0325 — Knight fork

Original entry: Knight fork

- **C0325** · 12. Knights · **verified**
  Mechanics verified: fork; new knight fork with exhaustive finite material witnesses.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0326 — Knight blockade

Original entry: Knight blockade

- **C0326** · 12. Knights · **verified**
  Mechanics verified: actual moved knight occupies the square immediately ahead of an unchanged enemy pawn; complete legal enemy replies show no straight advance; pawn captures and blocker removals retained; no permanent/best-move claim.
- **C0700** · 26. Knight endings · **verified**
  Mechanics verified: actual moved knight occupies the square immediately ahead of an unchanged enemy pawn; complete legal enemy replies show no straight advance; pawn captures and blocker removals retained; no permanent/best-move claim.
- **C0720** · 27. Bishop versus knight endings · **verified**
  Mechanics verified: actual moved knight occupies the square immediately ahead of an unchanged enemy pawn; complete legal enemy replies show no straight advance; pawn captures and blocker removals retained; no permanent/best-move claim.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0327 — Knight versus bishop

Original entry: Knight versus bishop

- **C0327** · 12. Knights · **partial**
  Partial: exact non-pawn army combinations only; strategic comparison deferred.

Proposed queue rank 348, phase 5. Outstanding IDs: C0327.

## C0328 — Good knight

Original entry: Good knight

- **C0328** · 12. Knights · **unimplemented**
  Not implemented.

Proposed queue rank 349, phase 5. Outstanding IDs: C0328.

## C0329 — Bad knight

Original entry: Bad knight

- **C0329** · 12. Knights · **unimplemented**
  Not implemented.

Proposed queue rank 350, phase 5. Outstanding IDs: C0329.

## C0330 — Octopus knight

Original entry: Octopus knight — deeply placed knight controlling many important squares.

- **C0330** · 12. Knights · **verified**
  Mechanics verified: explicit tactical subset: central sixth-rank advanced outpost controls eight squares and checks king plus queen; every full-history defense permits same-knight original-queen capture with positive material gain through all immediate counterresponses, never draw/countermate; no general strength or longer-term win claim.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0331 — Knight on the sixth rank

Original entry: Knight on the sixth rank

- **C0331** · 12. Knights · **verified**
  Mechanics verified: new relative-rank knight placement, inherited E021 mechanics.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0332 — Knight on the fifth rank

Original entry: Knight on the fifth rank

- **C0332** · 12. Knights · **verified**
  Mechanics verified: new relative-rank knight placement, inherited E021 mechanics.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0333 — Knight domination

Original entry: Knight domination

- **C0333** · 12. Knights · **verified**
  Mechanics verified: every legal move by the named unit permits tracked capture with positive gain through every immediate counterreply; other defenses not promised.
- **C0702** · 26. Knight endings · **verified**
  Mechanics verified: every legal move by the named unit permits tracked capture with positive gain through every immediate counterreply; other defenses not promised.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0334 — Knight blockade of passed pawn

Original entry: Knight blockade of passed pawn

- **C0334** · 12. Knights · **verified**
  Mechanics verified: piece occupies enemy passer’s next forward square; no permanent restraint claim.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0335 — Knight rerouting

Original entry: Knight rerouting

- **C0335** · 12. Knights · **unimplemented**
  Not implemented.

Proposed queue rank 153, phase 3. Outstanding IDs: C0335.

## C0336 — Knight tour

Original entry: Knight tour

- **C0336** · 12. Knights · **unimplemented**
  Not implemented.

Proposed queue rank 154, phase 3. Outstanding IDs: C0336.

## C0337 — Knight on a protected outpost

Original entry: Knight on a protected outpost

- **C0337** · 12. Knights · **partial**
  Partial: new pawn-supported knight on c–f relative ranks 4–6; no enemy pawn ahead on neighboring files; future exchanges/permanence deferred.

Proposed queue rank 92, phase 2. Outstanding IDs: C0337.

## C0338 — Knight versus pawns on both wings

Original entry: Knight versus pawns on both wings — often less effective than a bishop.

- **C0338** · 12. Knights · **unimplemented**
  Not implemented.

Proposed queue rank 351, phase 5. Outstanding IDs: C0338.

## C0339 — Knight in closed position

Original entry: Knight in closed position — often strong because blocked pawn structures reduce bishop mobility.

- **C0339** · 12. Knights · **unimplemented**
  Not implemented.

Proposed queue rank 352, phase 5. Outstanding IDs: C0339.

## C0340 — Rook on an open file

Original entry: Rook on an open file

- **C0340** · 13. Rooks · **verified**
  Mechanics verified: pawn-free file geometry and new rook/queen occupation.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0341 — Rook on a semi-open file

Original entry: Rook on a semi-open file

- **C0341** · 13. Rooks · **verified**
  Mechanics verified: pawn-free file geometry and new rook/queen occupation.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0342 — Rook penetration

Original entry: Rook penetration

- **C0342** · 13. Rooks · **verified**
  Mechanics verified: checking subset: actual rook enters enemy back two ranks from own half along its file and directly checks horizontally; all full-history replies retained; no safety/advantage claim.
- **C0677** · 24. Rook endings · **verified**
  Mechanics verified: checking subset: actual rook enters enemy back two ranks from own half along its file and directly checks horizontally; all full-history replies retained; no safety/advantage claim.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0343 — Rook on the seventh rank

Original entry: Rook on the seventh rank

- **C0343** · 13. Rooks · **verified**
  Mechanics verified: relative seventh rank (White 7, Black 2); new placement.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0344 — Rook on the second rank

Original entry: Rook on the second rank

- **C0344** · 13. Rooks · **verified**
  Mechanics verified: relative seventh rank (White 7, Black 2); new placement.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0345 — Two rooks on the seventh

Original entry: Two rooks on the seventh

- **C0345** · 13. Rooks · **verified**
  Mechanics verified: relative seventh rank (White 7, Black 2); new placement.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0346 — Doubling rooks

Original entry: Doubling rooks

- **C0346** · 13. Rooks · **verified**
  Mechanics verified: unobstructed same-rank/file rook alignment; geometric support only.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0347 — Tripling on a file

Original entry: Tripling on a file — usually rooks plus queen.

- **C0347** · 13. Rooks · **verified**
  Mechanics verified: two rooks and queen on one file without other intervening pieces.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0348 — Connected rooks

Original entry: Connected rooks

- **C0348** · 13. Rooks · **verified**
  Mechanics verified: unobstructed same-rank/file rook alignment; geometric support only.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0349 — Rook lift

Original entry: Rook lift — transferring a rook horizontally, often through the third or fourth rank.

- **C0349** · 13. Rooks · **partial**
  Partial: arrival or horizontal movement on relative third/fourth rank; attack intent not inferred.

Proposed queue rank 93, phase 2. Outstanding IDs: C0349.

## C0350 — Rook swing

Original entry: Rook swing — moving a rook laterally toward the attack.

- **C0350** · 13. Rooks · **verified**
  Mechanics verified: full legal history records the same rook lifting from home ranks to rank 3/4, then transferring sideways at least two files with direct king-file check; all legal responses retained; no safety or winning attack claim.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0351 — Rook behind a passed pawn

Original entry: Rook behind a passed pawn

- **C0351** · 13. Rooks · **verified**
  Mechanics verified: unobstructed rook behind own or enemy passer; no best-placement claim.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0352 — Rook activity

Original entry: Rook activity

- **C0352** · 13. Rooks · **unimplemented**
  Not implemented.

Proposed queue rank 353, phase 5. Outstanding IDs: C0352.

## C0353 — Active rook principle

Original entry: Active rook principle — particularly important in rook endings.

- **C0353** · 13. Rooks · **unimplemented**
  Not implemented.

Proposed queue rank 354, phase 5. Outstanding IDs: C0353.

## C0354 — Cutting off the king

Original entry: Cutting off the king

- **C0354** · 13. Rooks · **unimplemented**
  Not implemented.

Proposed queue rank 206, phase 4. Outstanding IDs: C0354.

## C0355 — Rook checking distance

Original entry: Rook checking distance

- **C0355** · 13. Rooks · **verified**
  Mechanics verified: at least three clear squares between actual checking rook and king, EVERY immediate legal evasion leaves checker uncaptured; exact separation only, no long-term safety/draw claim.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0356 — Rook versus minor piece

Original entry: Rook versus minor piece

- **C0356** · 13. Rooks · **partial**
  Partial: exact non-pawn army combinations only; strategic comparison deferred.

Proposed queue rank 355, phase 5. Outstanding IDs: C0356.

## C0357 — Exchange sacrifice

Original entry: Exchange sacrifice

- **C0357** · 13. Rooks · **verified**
  Mechanics verified: rook captures a minor and is legally offered at a nominal loss of two points, with all-defense forced-mate proof.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0358 — Rook invasion

Original entry: Rook invasion

- **C0358** · 13. Rooks · **verified**
  Mechanics verified: same checking-entry subset as rook penetration; complete legal responses retain captures and terminals; no intent or winning attack claim.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0359 — Rook blockade

Original entry: Rook blockade

- **C0359** · 13. Rooks · **verified**
  Mechanics verified: piece occupies enemy passer’s next forward square; no permanent restraint claim.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0360 — Queen activity

Original entry: Queen activity

- **C0360** · 14. Queens · **unimplemented**
  Not implemented.
- **C0722** · 28. Queen endings · **unimplemented**
  Not implemented.

Proposed queue rank 356, phase 5. Outstanding IDs: C0360, C0722.

## C0361 — Queen centralization

Original entry: Queen centralization

- **C0361** · 14. Queens · **partial**
  Partial: queen arrives on d4/e4/d5/e5; safety/usefulness not inferred.
- **C0725** · 28. Queen endings · **partial**
  Partial: queen arrives on d4/e4/d5/e5; safety/usefulness not inferred.

Proposed queue rank 94, phase 2. Outstanding IDs: C0361, C0725.

## C0362 — Queen invasion

Original entry: Queen invasion

- **C0362** · 14. Queens · **verified**
  Mechanics verified: checking subset: actual queen enters enemy back two ranks from own half along its file and directly checks horizontally; all full-history responses retained; no safe/winning invasion claim.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0363 — Queen infiltration

Original entry: Queen infiltration

- **C0363** · 14. Queens · **unimplemented**
  Not implemented.

Proposed queue rank 155, phase 3. Outstanding IDs: C0363.

## C0364 — Queen check

Original entry: Queen check

- **C0364** · 14. Queens · **verified**
  Mechanics verified: moved/promoted queen is an actual checker.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0365 — Perpetual check

Original entry: Perpetual check

- **C0365** · 14. Queens · **partial**
  Partial: verified repetition facts are available; an observed cycle does not establish an all-defense perpetual-check strategy.
- **C0466** · 17. Defensive concepts · **partial**
  Partial: verified repetition facts are available; an observed cycle does not establish an all-defense perpetual-check strategy.
- **C0723** · 28. Queen endings · **partial**
  Partial: verified repetition facts are available; an observed cycle does not establish an all-defense perpetual-check strategy.

Proposed queue rank 357, phase 5. Outstanding IDs: C0365, C0466, C0723.

## C0366 — Queen battery

Original entry: Queen battery

- **C0366** · 14. Queens · **partial**
  Partial: queen–rook and queen–bishop types only.

Proposed queue rank 24, phase 1. Outstanding IDs: C0366.

## C0367 — Queen-bishop battery

Original entry: Queen-bishop battery

- **C0367** · 14. Queens · **verified**
  Mechanics verified: unobstructed queen–rook orthogonal or queen–bishop diagonal alignment.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0368 — Queen-rook battery

Original entry: Queen-rook battery

- **C0368** · 14. Queens · **verified**
  Mechanics verified: unobstructed queen–rook orthogonal or queen–bishop diagonal alignment.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0369 — Queen sacrifice

Original entry: Queen sacrifice

- **C0369** · 14. Queens · **verified**
  Mechanics verified: legally capturable moved queen costs more than the played capture, while every defense retains bounded forced mate.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0370 — Queen trade

Original entry: Queen trade

- **C0370** · 14. Queens · **verified**
  Mechanics verified: verified legal immediate recapture history; fixed captured-piece nominal values only; promotions excluded.
- **C0733** · 28. Queen endings · **verified**
  Mechanics verified: verified legal immediate recapture history; fixed captured-piece nominal values only; promotions excluded.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0371 — Queen versus two rooks

Original entry: Queen versus two rooks

- **C0371** · 14. Queens · **partial**
  Partial: exact non-pawn army combinations only; strategic comparison deferred.
- **C0884** · 35. Strategic imbalances · **partial**
  Partial: exact non-pawn army combinations only; strategic comparison deferred.

Proposed queue rank 358, phase 5. Outstanding IDs: C0371, C0884.

## C0372 — Queen versus rook and minor piece

Original entry: Queen versus rook and minor piece

- **C0372** · 14. Queens · **partial**
  Partial: exact non-pawn army combinations only; strategic comparison deferred.
- **C0885** · 35. Strategic imbalances · **partial**
  Partial: exact non-pawn army combinations only; strategic comparison deferred.

Proposed queue rank 359, phase 5. Outstanding IDs: C0372, C0885.

## C0373 — Queen and knight attack

Original entry: Queen and knight attack

- **C0373** · 14. Queens · **unimplemented**
  Not implemented.

Proposed queue rank 360, phase 5. Outstanding IDs: C0373.

## C0374 — Queen and bishop attack

Original entry: Queen and bishop attack

- **C0374** · 14. Queens · **unimplemented**
  Not implemented.

Proposed queue rank 361, phase 5. Outstanding IDs: C0374.

## C0375 — Exposed queen

Original entry: Exposed queen

- **C0375** · 14. Queens · **unimplemented**
  Not implemented.

Proposed queue rank 362, phase 5. Outstanding IDs: C0375.

## C0376 — Queen harassment

Original entry: Queen harassment

- **C0376** · 14. Queens · **unimplemented**
  Not implemented.

Proposed queue rank 156, phase 3. Outstanding IDs: C0376.

## C0377 — Queen trap

Original entry: Queen trap

- **C0377** · 14. Queens · **verified**
  Mechanics verified: currently attacked N/B/R/Q has complete all-defense tracked capture proof and positive gain through every immediate counterreply; nonchecking finite subset.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0378 — Early queen development

Original entry: Early queen development

- **C0378** · 14. Queens · **verified**
  Mechanics verified: first original queen move in first eight own turns with fewer than two surviving developed minors; count fact, not criticism.
- **C0859** · 34. Common mistakes · **verified**
  Mechanics verified: first original queen move in first eight own turns with fewer than two surviving developed minors; count fact, not criticism.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0379 — Queen domination of weak squares

Original entry: Queen domination of weak squares

- **C0379** · 14. Queens · **unimplemented**
  Not implemented.

Proposed queue rank 363, phase 5. Outstanding IDs: C0379.

## C0380 — King safety

Original entry: King safety

- **C0380** · 15. King concepts · **unimplemented**
  Not implemented.
- **C0548** · 20. Evaluation of a position · **unimplemented**
  Not implemented.

Proposed queue rank 364, phase 5. Outstanding IDs: C0380, C0548.

## C0381 — Castled king

Original entry: Castled king

- **C0381** · 15. King concepts · **verified**
  Mechanics verified: actual castling event from inherited E020 legal-move fixtures; no inferred prior history.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0382 — Uncastled king

Original entry: Uncastled king

- **C0382** · 15. King concepts · **unimplemented**
  Not implemented.

Proposed queue rank 95, phase 2. Outstanding IDs: C0382.

## C0383 — Exposed king

Original entry: Exposed king

- **C0383** · 15. King concepts · **unimplemented**
  Not implemented.

Proposed queue rank 365, phase 5. Outstanding IDs: C0383.

## C0384 — Central king

Original entry: Central king

- **C0384** · 15. King concepts · **partial**
  Partial: king arrives on d4/e4/d5/e5; safety and benefit not established.

Proposed queue rank 25, phase 1. Outstanding IDs: C0384.

## C0385 — King in the center

Original entry: King in the center

- **C0385** · 15. King concepts · **unimplemented**
  Not implemented.

Proposed queue rank 26, phase 1. Outstanding IDs: C0385.

## C0386 — King activation

Original entry: King activation

- **C0386** · 15. King concepts · **unimplemented**
  Not implemented.
- **C0603** · 22. Endgame fundamentals · **unimplemented**
  Not implemented.

Proposed queue rank 366, phase 5. Outstanding IDs: C0386, C0603.

## C0387 — King centralization

Original entry: King centralization

- **C0387** · 15. King concepts · **verified**
  Mechanics verified: same before/after promotion benefit plus new king arrival on d4/e4/d5/e5; king subset only, no geometry-only quality judgment.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0388 — Active king in the endgame

Original entry: Active king in the endgame

- **C0388** · 15. King concepts · **verified**
  Mechanics verified: bare K+P versus K: actual king move changes pawn-only safe-queen goal from independently refuted before to proven after; bound covers every remaining push.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0389 — King opposition

Original entry: King opposition

- **C0389** · 15. King concepts · **verified**
  Mechanics verified: same proven king-move promotion effect with exact vacant even-separation king alignment and opponent to move; direct/distant/diagonal gated separately; not universal win from geometry.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0390 — Distant opposition

Original entry: Distant opposition

- **C0390** · 15. King concepts · **verified**
  Mechanics verified: same proven king-move promotion effect with exact vacant even-separation king alignment and opponent to move; direct/distant/diagonal gated separately; not universal win from geometry.
- **C0610** · 22. Endgame fundamentals · **verified**
  Mechanics verified: same proven king-move promotion effect with exact vacant even-separation king alignment and opponent to move; direct/distant/diagonal gated separately; not universal win from geometry.
- **C0636** · 23. Pawn endings · **verified**
  Mechanics verified: same proven king-move promotion effect with exact vacant even-separation king alignment and opponent to move; direct/distant/diagonal gated separately; not universal win from geometry.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0391 — Diagonal opposition

Original entry: Diagonal opposition

- **C0391** · 15. King concepts · **verified**
  Mechanics verified: same proven king-move promotion effect with exact vacant even-separation king alignment and opponent to move; direct/distant/diagonal gated separately; not universal win from geometry.
- **C0637** · 23. Pawn endings · **verified**
  Mechanics verified: same proven king-move promotion effect with exact vacant even-separation king alignment and opponent to move; direct/distant/diagonal gated separately; not universal win from geometry.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0392 — Corresponding squares

Original entry: Corresponding squares

- **C0392** · 15. King concepts · **unimplemented**
  Not implemented.
- **C0612** · 22. Endgame fundamentals · **unimplemented**
  Not implemented.
- **C0653** · 23. Pawn endings · **unimplemented**
  Not implemented.

Proposed queue rank 207, phase 4. Outstanding IDs: C0392, C0612, C0653.

## C0393 — King penetration

Original entry: King penetration

- **C0393** · 15. King concepts · **verified**
  Mechanics verified: same before/after promotion benefit plus actual king advance deeper into relative rank at least five.
- **C0624** · 22. Endgame fundamentals · **verified**
  Mechanics verified: same before/after promotion benefit plus actual king advance deeper into relative rank at least five.
- **C0696** · 25. Bishop endings · **verified**
  Mechanics verified: same before/after promotion benefit plus actual king advance deeper into relative rank at least five.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0394 — King blockade

Original entry: King blockade

- **C0394** · 15. King concepts · **verified**
  Mechanics verified: actual moved king occupies the square immediately ahead of an unchanged enemy pawn; complete legal enemy replies show no straight advance; pawn captures and blocker removals retained; no permanent/best-move claim.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0395 — King escorting a passed pawn

Original entry: King escorting a passed pawn

- **C0395** · 15. King concepts · **verified**
  Mechanics verified: actual king move newly adjacent to own passer; current protection only, not promotion guarantee.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0396 — King cut-off

Original entry: King cut-off

- **C0396** · 15. King concepts · **unimplemented**
  Not implemented.

Proposed queue rank 208, phase 4. Outstanding IDs: C0396.

## C0397 — King hunt

Original entry: King hunt

- **C0397** · 15. King concepts · **unimplemented**
  Not implemented.
- **C0441** · 16. Attacking concepts · **unimplemented**
  Not implemented.

Proposed queue rank 367, phase 5. Outstanding IDs: C0397, C0441.

## C0398 — Mating net

Original entry: Mating net

- **C0398** · 15. King concepts · **verified**
  Mechanics verified: nonchecking, noncapturing actual move; every legal reply permits checkmate on the next own move, independently replayed; no newly-created/only-best claim.
- **C0440** · 16. Attacking concepts · **verified**
  Mechanics verified: nonchecking, noncapturing actual move; every legal reply permits checkmate on the next own move, independently replayed; no newly-created/only-best claim.
- **C0508** · 18. Checkmating patterns · **verified**
  Mechanics verified: nonchecking, noncapturing actual move; every legal reply permits checkmate on the next own move, independently replayed; no newly-created/only-best claim.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0399 — King shelter

Original entry: King shelter

- **C0399** · 15. King concepts · **unimplemented**
  Not implemented.
- **C0732** · 28. Queen endings · **unimplemented**
  Not implemented.

Proposed queue rank 368, phase 5. Outstanding IDs: C0399, C0732.

## C0400 — Pawn shield

Original entry: Pawn shield

- **C0400** · 15. King concepts · **partial**
  Partial: pawn squares within two forward ranks on three files around c/e/g home-rank king; safety not measured.

Proposed queue rank 27, phase 1. Outstanding IDs: C0400.

## C0401 — Air / luft

Original entry: Air / luft — escape square preventing back-rank mate.

- **C0401** · 15. King concepts · **verified**
  Mechanics verified: noncapturing pawn move opens legal adjacent king step, with old hypothetical back-rank mate witness and no actual opponent mate in one afterward.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0402 — King walk

Original entry: King walk — king travels unusually far, sometimes during an attack or defense.

- **C0402** · 15. King concepts · **unimplemented**
  Not implemented.

Proposed queue rank 157, phase 3. Outstanding IDs: C0402.

## C0403 — Attack

Original entry: Attack

- **C0403** · 16. Attacking concepts · **unimplemented**
  Not implemented.

Proposed queue rank 369, phase 5. Outstanding IDs: C0403.

## C0404 — Direct attack

Original entry: Direct attack

- **C0404** · 16. Attacking concepts · **unimplemented**
  Not implemented.

Proposed queue rank 28, phase 1. Outstanding IDs: C0404.

## C0405 — Kingside attack

Original entry: Kingside attack

- **C0405** · 16. Attacking concepts · **unimplemented**
  Not implemented.

Proposed queue rank 47, phase 2. Outstanding IDs: C0405.

## C0406 — Queenside attack

Original entry: Queenside attack

- **C0406** · 16. Attacking concepts · **unimplemented**
  Not implemented.

Proposed queue rank 48, phase 2. Outstanding IDs: C0406.

## C0407 — Central attack

Original entry: Central attack

- **C0407** · 16. Attacking concepts · **unimplemented**
  Not implemented.

Proposed queue rank 49, phase 2. Outstanding IDs: C0407.

## C0408 — Attack on the king

Original entry: Attack on the king

- **C0408** · 16. Attacking concepts · **unimplemented**
  Not implemented.

Proposed queue rank 50, phase 2. Outstanding IDs: C0408.

## C0409 — Attack on a weakness

Original entry: Attack on a weakness

- **C0409** · 16. Attacking concepts · **unimplemented**
  Not implemented.

Proposed queue rank 370, phase 5. Outstanding IDs: C0409.

## C0410 — Attack on a pawn

Original entry: Attack on a pawn

- **C0410** · 16. Attacking concepts · **unimplemented**
  Not implemented.

Proposed queue rank 29, phase 1. Outstanding IDs: C0410.

## C0411 — Attack on a piece

Original entry: Attack on a piece

- **C0411** · 16. Attacking concepts · **unimplemented**
  Not implemented.

Proposed queue rank 30, phase 1. Outstanding IDs: C0411.

## C0412 — Attack with opposite-side castling

Original entry: Attack with opposite-side castling

- **C0412** · 16. Attacking concepts · **unimplemented**
  Not implemented.

Proposed queue rank 51, phase 2. Outstanding IDs: C0412.

## C0413 — Pawn storm

Original entry: Pawn storm

- **C0413** · 16. Attacking concepts · **verified**
  Mechanics verified: distinct adjacent advanced pawns progress on consecutive own turns after a history-verified enemy castle, on its unchanged king flank; full history, identities and every reply retained; no intent, safety or successful-attack claim.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0414 — Piece storm

Original entry: Piece storm

- **C0414** · 16. Attacking concepts · **unimplemented**
  Not implemented.

Proposed queue rank 158, phase 3. Outstanding IDs: C0414.

## C0415 — Opening lines

Original entry: Opening lines

- **C0415** · 16. Attacking concepts · **unimplemented**
  Not implemented.

Proposed queue rank 52, phase 2. Outstanding IDs: C0415.

## C0416 — Opening diagonals

Original entry: Opening diagonals

- **C0416** · 16. Attacking concepts · **verified**
  Mechanics verified: actual move removes/vacates prior blocker from a stationary bishop line, leaving the entire length-at-least-five diagonal clear.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0417 — Destroying the pawn shield

Original entry: Destroying the pawn shield

- **C0417** · 16. Attacking concepts · **partial**
  Partial: capture removes one geometric cover pawn; sacrifice intent or complete destruction not inferred.

Proposed queue rank 53, phase 2. Outstanding IDs: C0417.

## C0418 — Sacrificial attack

Original entry: Sacrificial attack

- **C0418** · 16. Attacking concepts · **unimplemented**
  Not implemented.

Proposed queue rank 371, phase 5. Outstanding IDs: C0418.

## C0419 — Mating attack

Original entry: Mating attack

- **C0419** · 16. Attacking concepts · **verified**
  Mechanics verified: nonchecking, noncapturing actual move; every legal reply permits checkmate on the next own move, independently replayed; no newly-created/only-best claim.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0420 — Attack with material deficit

Original entry: Attack with material deficit

- **C0420** · 16. Attacking concepts · **unimplemented**
  Not implemented.

Proposed queue rank 372, phase 5. Outstanding IDs: C0420.

## C0421 — Attack with development advantage

Original entry: Attack with development advantage

- **C0421** · 16. Attacking concepts · **unimplemented**
  Not implemented.

Proposed queue rank 373, phase 5. Outstanding IDs: C0421.

## C0422 — Local superiority

Original entry: Local superiority — concentrating more attacking forces in one area.

- **C0422** · 16. Attacking concepts · **unimplemented**
  Not implemented.

Proposed queue rank 159, phase 3. Outstanding IDs: C0422.

## C0423 — Overwhelming defenders

Original entry: Overwhelming defenders

- **C0423** · 16. Attacking concepts · **unimplemented**
  Not implemented.

Proposed queue rank 374, phase 5. Outstanding IDs: C0423.

## C0424 — Bringing reinforcements

Original entry: Bringing reinforcements

- **C0424** · 16. Attacking concepts · **unimplemented**
  Not implemented.

Proposed queue rank 160, phase 3. Outstanding IDs: C0424.

## C0425 — Switching the attack

Original entry: Switching the attack

- **C0425** · 16. Attacking concepts · **unimplemented**
  Not implemented.

Proposed queue rank 161, phase 3. Outstanding IDs: C0425.

## C0426 — Attack on both wings

Original entry: Attack on both wings

- **C0426** · 16. Attacking concepts · **unimplemented**
  Not implemented.

Proposed queue rank 162, phase 3. Outstanding IDs: C0426.

## C0427 — Creating threats

Original entry: Creating threats

- **C0427** · 16. Attacking concepts · **unimplemented**
  Not implemented.

Proposed queue rank 375, phase 5. Outstanding IDs: C0427.

## C0428 — Threat multiplication

Original entry: Threat multiplication

- **C0428** · 16. Attacking concepts · **unimplemented**
  Not implemented.

Proposed queue rank 376, phase 5. Outstanding IDs: C0428.

## C0429 — Forcing weaknesses

Original entry: Forcing weaknesses

- **C0429** · 16. Attacking concepts · **unimplemented**
  Not implemented.

Proposed queue rank 377, phase 5. Outstanding IDs: C0429.

## C0430 — Dark-square attack

Original entry: Dark-square attack

- **C0430** · 16. Attacking concepts · **unimplemented**
  Not implemented.

Proposed queue rank 54, phase 2. Outstanding IDs: C0430.

## C0431 — Light-square attack

Original entry: Light-square attack

- **C0431** · 16. Attacking concepts · **unimplemented**
  Not implemented.

Proposed queue rank 55, phase 2. Outstanding IDs: C0431.

## C0432 — Attack against f7/f2

Original entry: Attack against f7/f2

- **C0432** · 16. Attacking concepts · **unimplemented**
  Not implemented.

Proposed queue rank 56, phase 2. Outstanding IDs: C0432.

## C0433 — Attack against h7/h2

Original entry: Attack against h7/h2

- **C0433** · 16. Attacking concepts · **unimplemented**
  Not implemented.

Proposed queue rank 57, phase 2. Outstanding IDs: C0433.

## C0434 — Attack against g7/g2

Original entry: Attack against g7/g2

- **C0434** · 16. Attacking concepts · **unimplemented**
  Not implemented.

Proposed queue rank 58, phase 2. Outstanding IDs: C0434.

## C0435 — Battery

Original entry: Battery

- **C0435** · 16. Attacking concepts · **partial**
  Partial: queen–rook and queen–bishop types only.

Proposed queue rank 31, phase 1. Outstanding IDs: C0435.

## C0436 — Line opening

Original entry: Line opening

- **C0436** · 16. Attacking concepts · **unimplemented**
  Not implemented.

Proposed queue rank 59, phase 2. Outstanding IDs: C0436.

## C0437 — File opening

Original entry: File opening

- **C0437** · 16. Attacking concepts · **unimplemented**
  Not implemented.

Proposed queue rank 60, phase 2. Outstanding IDs: C0437.

## C0438 — Diagonal opening

Original entry: Diagonal opening

- **C0438** · 16. Attacking concepts · **verified**
  Mechanics verified: actual move removes/vacates prior blocker from a stationary bishop line, leaving the entire length-at-least-five diagonal clear.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0439 — Sacrifice for open lines

Original entry: Sacrifice for open lines

- **C0439** · 16. Attacking concepts · **verified**
  Mechanics verified: same finite clearance-sacrifice subset: new checking ray, actual legal material acceptance and all-defense forced mate.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0442 — No escape squares

Original entry: No escape squares

- **C0442** · 16. Attacking concepts · **unimplemented**
  Not implemented.

Proposed queue rank 61, phase 2. Outstanding IDs: C0442.

## C0443 — Restricting the king

Original entry: Restricting the king

- **C0443** · 16. Attacking concepts · **unimplemented**
  Not implemented.

Proposed queue rank 62, phase 2. Outstanding IDs: C0443.

## C0444 — Defense

Original entry: Defense

- **C0444** · 17. Defensive concepts · **verified**
  Mechanics verified: one N/B/R/Q had a hypothetical immediate profitable-capture threat; every actual capture after the move permits a reply with no net nominal loss; other targets and later play excluded.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0445 — Active defense

Original entry: Active defense

- **C0445** · 17. Defensive concepts · **verified**
  Mechanics verified: earlier finite target-defense with capture/check, or checking unique immediate-mate defense; exact certificates, no enduring initiative claim.
- **C0632** · 22. Endgame fundamentals · **verified**
  Mechanics verified: earlier finite target-defense with capture/check, or checking unique immediate-mate defense; exact certificates, no enduring initiative claim.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0446 — Passive defense

Original entry: Passive defense

- **C0446** · 17. Defensive concepts · **unimplemented**
  Not implemented.
- **C0868** · 34. Common mistakes · **unimplemented**
  Not implemented.

Proposed queue rank 378, phase 5. Outstanding IDs: C0446, C0868.

## C0447 — Counterattack

Original entry: Counterattack

- **C0447** · 17. Defensive concepts · **verified**
  Mechanics verified: actual check plus complete unique immediate-mate defense; no exclusive causal/longer-term initiative claim.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0448 — Counterplay

Original entry: Counterplay

- **C0448** · 17. Defensive concepts · **unimplemented**
  Not implemented.

Proposed queue rank 379, phase 5. Outstanding IDs: C0448.

## C0449 — Counterthreat

Original entry: Counterthreat

- **C0449** · 17. Defensive concepts · **unimplemented**
  Not implemented.

Proposed queue rank 380, phase 5. Outstanding IDs: C0449.

## C0450 — Trading attackers

Original entry: Trading attackers

- **C0450** · 17. Defensive concepts · **unimplemented**
  Not implemented.

Proposed queue rank 63, phase 2. Outstanding IDs: C0450.

## C0451 — Trading queens

Original entry: Trading queens

- **C0451** · 17. Defensive concepts · **unimplemented**
  Not implemented.

Proposed queue rank 64, phase 2. Outstanding IDs: C0451.

## C0452 — Returning material

Original entry: Returning material

- **C0452** · 17. Defensive concepts · **unimplemented**
  Not implemented.

Proposed queue rank 65, phase 2. Outstanding IDs: C0452.

## C0453 — Giving back the exchange

Original entry: Giving back the exchange

- **C0453** · 17. Defensive concepts · **unimplemented**
  Not implemented.

Proposed queue rank 66, phase 2. Outstanding IDs: C0453.

## C0454 — Creating luft

Original entry: Creating luft

- **C0454** · 17. Defensive concepts · **verified**
  Mechanics verified: noncapturing pawn move opens legal adjacent king step, with old hypothetical back-rank mate witness and no actual opponent mate in one afterward.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0455 — Closing lines

Original entry: Closing lines

- **C0455** · 17. Defensive concepts · **verified**
  Mechanics verified: played move interrupts a previously clear enemy slider attack line; no wider safety or evaluation claim.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0456 — Blocking files

Original entry: Blocking files

- **C0456** · 17. Defensive concepts · **verified**
  Mechanics verified: played move blocks an actual clear enemy slider file attack on surviving own piece/king; geometry only.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0457 — Blocking diagonals

Original entry: Blocking diagonals

- **C0457** · 17. Defensive concepts · **verified**
  Mechanics verified: played move blocks an actual clear enemy slider diagonal attack on surviving own piece/king; geometry only.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0458 — King evacuation

Original entry: King evacuation

- **C0458** · 17. Defensive concepts · **unimplemented**
  Not implemented.

Proposed queue rank 209, phase 4. Outstanding IDs: C0458.

## C0459 — King escape

Original entry: King escape

- **C0459** · 17. Defensive concepts · **verified**
  Mechanics verified: actual king move legally evades check; no longer-term safety claim.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0460 — Defensive sacrifice

Original entry: Defensive sacrifice

- **C0460** · 17. Defensive concepts · **verified**
  Mechanics verified: checking unique immediate-mate defense offers actual unit to a legal capture with negative nominal gain through EVERY immediate counterreply; acceptance conditional, longer-term compensation unproved.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0461 — Eliminating attacking pieces

Original entry: Eliminating attacking pieces

- **C0461** · 17. Defensive concepts · **verified**
  Mechanics verified: played capture removes the original attacker of the certified old profitable-capture threat and passes actual target-defense proof.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0462 — Overprotection

Original entry: Overprotection

- **C0462** · 17. Defensive concepts · **unimplemented**
  Not implemented.
- **C0782** · 31. Prophylaxis and prevention · **unimplemented**
  Not implemented.
- **C0899** · 36. Deeper strategic concepts · **unimplemented**
  Not implemented.

Proposed queue rank 381, phase 5. Outstanding IDs: C0462, C0782, C0899.

## C0463 — Reinforcing a weakness

Original entry: Reinforcing a weakness

- **C0463** · 17. Defensive concepts · **unimplemented**
  Not implemented.

Proposed queue rank 382, phase 5. Outstanding IDs: C0463.

## C0464 — Simplification

Original entry: Simplification

- **C0464** · 17. Defensive concepts · **unimplemented**
  Not implemented.

Proposed queue rank 67, phase 2. Outstanding IDs: C0464.

## C0465 — Fortress

Original entry: Fortress

- **C0465** · 17. Defensive concepts · **unimplemented**
  Not implemented.
- **C0625** · 22. Endgame fundamentals · **unimplemented**
  Not implemented.

Proposed queue rank 210, phase 4. Outstanding IDs: C0465, C0625.

## C0467 — Perpetual attack

Original entry: Perpetual attack

- **C0467** · 17. Defensive concepts · **unimplemented**
  Not implemented.

Proposed queue rank 163, phase 3. Outstanding IDs: C0467.

## C0468 — Stalemate defense

Original entry: Stalemate defense

- **C0468** · 17. Defensive concepts · **verified**
  Mechanics verified: actual moved non-pawn/non-king piece has a named legal enemy capture that immediately stalemates the mover; conditional resource only, not forced draw or loss assessment.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0469 — Resource

Original entry: Resource

- **C0469** · 17. Defensive concepts · **unimplemented**
  Not implemented.

Proposed queue rank 211, phase 4. Outstanding IDs: C0469.

## C0470 — Only defense

Original entry: Only defense

- **C0470** · 17. Defensive concepts · **unimplemented**
  Not implemented.

Proposed queue rank 212, phase 4. Outstanding IDs: C0470.

## C0471 — Defensive tactical shot

Original entry: Defensive tactical shot

- **C0471** · 17. Defensive concepts · **unimplemented**
  Not implemented.

Proposed queue rank 213, phase 4. Outstanding IDs: C0471.

## C0472 — Counter-sacrifice

Original entry: Counter-sacrifice

- **C0472** · 17. Defensive concepts · **unimplemented**
  Not implemented.

Proposed queue rank 214, phase 4. Outstanding IDs: C0472.

## C0473 — Liquidation into an endgame

Original entry: Liquidation into an endgame

- **C0473** · 17. Defensive concepts · **unimplemented**
  Not implemented.

Proposed queue rank 68, phase 2. Outstanding IDs: C0473.

## C0474 — Neutralizing the initiative

Original entry: Neutralizing the initiative

- **C0474** · 17. Defensive concepts · **unimplemented**
  Not implemented.

Proposed queue rank 383, phase 5. Outstanding IDs: C0474.

## C0475 — Returning sacrificed material to end the attack

Original entry: Returning sacrificed material to end the attack

- **C0475** · 17. Defensive concepts · **unimplemented**
  Not implemented.

Proposed queue rank 384, phase 5. Outstanding IDs: C0475.

## C0476 — Back-rank mate

Original entry: Back-rank mate

- **C0476** · 18. Checkmating patterns · **verified**
  Mechanics verified: actual rook/queen rank mate with own pawns occupying all forward king neighbors.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0477 — Ladder mate

Original entry: Ladder mate

- **C0477** · 18. Checkmating patterns · **verified**
  Mechanics verified: actual edge rook mate; a second rook on inner parallel line controls all vacant inward neighboring flights; sequence not inferred.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0478 — Rook roller mate

Original entry: Rook roller mate

- **C0478** · 18. Checkmating patterns · **verified**
  Mechanics verified: actual edge rook mate; a second rook on inner parallel line controls all vacant inward neighboring flights; sequence not inferred.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0479 — Queen-and-rook mate

Original entry: Queen-and-rook mate

- **C0479** · 18. Checkmating patterns · **verified**
  Mechanics verified: actual mate with checker and named distinct helper protecting adjacent checker or controlling uncovered vacant flight; opposite-color bishops for B/B.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0480 — Smothered mate

Original entry: Smothered mate

- **C0480** · 18. Checkmating patterns · **verified**
  Mechanics verified: actual knight mate with every adjacent king square occupied by own pieces.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0481 — Anastasia's mate

Original entry: Anastasia's mate

- **C0481** · 18. Checkmating patterns · **verified**
  Mechanics verified: actual edge-file/rank rook or queen mate; knight controls both inward diagonal flights and own king-side blocker closes inward step.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0482 — Arabian mate

Original entry: Arabian mate

- **C0482** · 18. Checkmating patterns · **verified**
  Mechanics verified: actual corner checkmate by adjacent rook; same knight protects rook and controls vacant flight outside rook coverage.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0483 — Boden's mate

Original entry: Boden's mate

- **C0483** · 18. Checkmating patterns · **verified**
  Mechanics verified: actual edge bishop mate with opposite-color bishop controlling two uncovered vacant flights and two king-side self-blockers.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0484 — Epaulette mate

Original entry: Epaulette mate

- **C0484** · 18. Checkmating patterns · **verified**
  Mechanics verified: actual edge queen mate from two squares inward with both parallel shoulders occupied by king-side pieces.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0485 — Opera mate

Original entry: Opera mate

- **C0485** · 18. Checkmating patterns · **verified**
  Mechanics verified: actual edge mate by adjacent parallel rook, supported bishop sealing inward flight, two opposite-side self-blockers.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0486 — Damiano's mate

Original entry: Damiano's mate

- **C0486** · 18. Checkmating patterns · **verified**
  Mechanics verified: actual sole-queen mate on relative h7 protected by own g6 pawn, enemy king g8/h8; horizontal mirrored files also checked; pawn terminal pattern only.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0487 — Lolli mate

Original entry: Lolli mate

- **C0487** · 18. Checkmating patterns · **verified**
  Mechanics verified: actual sole-queen mate on relative g7 protected by own f6/h6 pawn, enemy king g8/h8; horizontal mirrored files also checked; no actual castling claim.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0488 — Greco mate

Original entry: Greco mate

- **C0488** · 18. Checkmating patterns · **verified**
  Mechanics verified: actual corner-file rook/queen mate; bishop seals vacant same-edge-rank flight outside checker coverage and enemy pawn blocks inward diagonal neighbor.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0489 — Blackburne's mate

Original entry: Blackburne's mate

- **C0489** · 18. Checkmating patterns · **verified**
  Mechanics verified: actual edge bishop mate with opposite-color bishop and knight each controlling a distinct vacant flight outside both other helpers; knight protects adjacent checker.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0490 — Morphy's mate

Original entry: Morphy's mate

- **C0490** · 18. Checkmating patterns · **verified**
  Mechanics verified: actual corner bishop mate; rook cuts an empty orthogonal flight and own king-side piece blocks other orthogonal flight.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0491 — Legal's mate

Original entry: Legal's mate

- **C0491** · 18. Checkmating patterns · **verified**
  Mechanics verified: actual classical or file-mirrored knight/two-knight/bishop mating net after recent legally replayed knight departure from bishop-to-queen relative pin, same bishop queen capture, bishop check and king reply; no all-defense offer claim.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0492 — Hook mate

Original entry: Hook mate

- **C0492** · 18. Checkmating patterns · **verified**
  Mechanics verified: actual adjacent rook mate outside a corner; pawn protects knight, knight protects rook and seals a vacant flight outside rook coverage, adjacent enemy unit blocks escape.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0493 — Corner mate

Original entry: Corner mate

- **C0493** · 18. Checkmating patterns · **verified**
  Mechanics verified: actual knight mate to corner king with rook/queen controlling both vacant inward-file neighbors and an enemy pawn blocking the other orthogonal neighbor.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0494 — Box mate

Original entry: Box mate

- **C0494** · 18. Checkmating patterns · **verified**
  Mechanics verified: actual exact king+rook versus lone king terminal edge mate; own king seals every vacant flight outside rook coverage; no preceding shrinking-box method claim.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0495 — Kill box

Original entry: Kill box

- **C0495** · 18. Checkmating patterns · **verified**
  Mechanics verified: actual edge contact rook mate; queen two diagonal squares away protects rook across an empty midpoint, king lies inside 3-by-3 rectangle, queen seals every vacant flight outside rook coverage.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0496 — Dovetail mate

Original entry: Dovetail mate

- **C0496** · 18. Checkmating patterns · **verified**
  Mechanics verified: protected diagonal-adjacent queen; exactly two on-board uncovered flights are self-blocked, with actual mate.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0497 — Swallow's-tail mate

Original entry: Swallow's-tail mate

- **C0497** · 18. Checkmating patterns · **verified**
  Mechanics verified: protected orthogonal-adjacent queen; two on-board rear-diagonal uncovered flights are self-blocked, with actual mate.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0498 — Double-bishop mate

Original entry: Double-bishop mate

- **C0498** · 18. Checkmating patterns · **verified**
  Mechanics verified: actual mate with checker and named distinct helper protecting adjacent checker or controlling uncovered vacant flight; opposite-color bishops for B/B.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0499 — Bishop-and-rook mating pattern

Original entry: Bishop-and-rook mating pattern

- **C0499** · 18. Checkmating patterns · **verified**
  Mechanics verified: actual mate with checker and named distinct helper protecting adjacent checker or controlling uncovered vacant flight; opposite-color bishops for B/B.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0500 — Queen-and-knight mating pattern

Original entry: Queen-and-knight mating pattern

- **C0500** · 18. Checkmating patterns · **verified**
  Mechanics verified: actual mate with checker and named distinct helper protecting adjacent checker or controlling uncovered vacant flight; opposite-color bishops for B/B.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0501 — Queen-and-bishop mating pattern

Original entry: Queen-and-bishop mating pattern

- **C0501** · 18. Checkmating patterns · **verified**
  Mechanics verified: actual mate with checker and named distinct helper protecting adjacent checker or controlling uncovered vacant flight; opposite-color bishops for B/B.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0502 — Rook-and-knight mating pattern

Original entry: Rook-and-knight mating pattern

- **C0502** · 18. Checkmating patterns · **verified**
  Mechanics verified: actual mate with checker and named distinct helper protecting adjacent checker or controlling uncovered vacant flight; opposite-color bishops for B/B.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0503 — Pawn-supported mate

Original entry: Pawn-supported mate

- **C0503** · 18. Checkmating patterns · **verified**
  Mechanics verified: actual mate with pawn geometrically protecting adjacent checking piece.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0504 — Discovered mate

Original entry: Discovered mate

- **C0504** · 18. Checkmating patterns · **verified**
  Mechanics verified: played legal move newly exposes a stationary original checking piece and actually checkmates.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0505 — Double-check mate

Original entry: Double-check mate

- **C0505** · 18. Checkmating patterns · **verified**
  Mechanics verified: actual checkmate with at least two distinct checking pieces.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0506 — Promotion mate

Original entry: Promotion mate

- **C0506** · 18. Checkmating patterns · **verified**
  Mechanics verified: played legal promotion actually checkmates; mere promotion is insufficient.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0507 — Underpromotion mate

Original entry: Underpromotion mate

- **C0507** · 18. Checkmating patterns · **verified**
  Mechanics verified: played legal rook, bishop or knight promotion actually checkmates; necessity not inferred.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0509 — Forced mate

Original entry: Forced mate

- **C0509** · 18. Checkmating patterns · **verified**
  Mechanics verified: played move has an independently replayed legal all-defense mate within two/three attacker moves; shorter horizon checked, bounded profile required.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0510 — Mate in one

Original entry: Mate in one

- **C0510** · 18. Checkmating patterns · **verified**
  Mechanics verified: the played legal move is an actual mate with zero legal opponent replies; no longer sequence inferred.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0511 — Mate in two

Original entry: Mate in two

- **C0511** · 18. Checkmating patterns · **verified**
  Mechanics verified: actual played move plus every defender reply permits immediate mating move; no mate in one was played.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0512 — Mate in three

Original entry: Mate in three

- **C0512** · 18. Checkmating patterns · **verified**
  Mechanics verified: all-defense legal tree reaches opponent checkmate within three attacker moves; complete mate-in-two failure tree establishes no shorter guarantee.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0513 — King-and-queen mate

Original entry: King-and-queen mate

- **C0513** · 18. Checkmating patterns · **verified**
  Mechanics verified: actual played checkmate against lone king with exactly the stated mating army.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0514 — King-and-rook mate

Original entry: King-and-rook mate

- **C0514** · 18. Checkmating patterns · **verified**
  Mechanics verified: actual played checkmate against lone king with exactly the stated mating army.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0515 — King and two bishops mate

Original entry: King and two bishops mate

- **C0515** · 18. Checkmating patterns · **verified**
  Mechanics verified: actual played checkmate against lone king with exactly the stated mating army.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0516 — Bishop-and-knight mate

Original entry: Bishop-and-knight mate

- **C0516** · 18. Checkmating patterns · **verified**
  Mechanics verified: actual played checkmate against lone king with exactly the stated mating army.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0517 — Plan formation

Original entry: Plan formation

- **C0517** · 19. Strategic planning · **unimplemented**
  Not implemented.

Proposed queue rank 385, phase 5. Outstanding IDs: C0517.

## C0518 — Short-term plan

Original entry: Short-term plan

- **C0518** · 19. Strategic planning · **unimplemented**
  Not implemented.

Proposed queue rank 386, phase 5. Outstanding IDs: C0518.

## C0519 — Long-term plan

Original entry: Long-term plan

- **C0519** · 19. Strategic planning · **unimplemented**
  Not implemented.

Proposed queue rank 387, phase 5. Outstanding IDs: C0519.

## C0520 — Strategic objective

Original entry: Strategic objective

- **C0520** · 19. Strategic planning · **unimplemented**
  Not implemented.

Proposed queue rank 388, phase 5. Outstanding IDs: C0520.

## C0521 — Target selection

Original entry: Target selection

- **C0521** · 19. Strategic planning · **unimplemented**
  Not implemented.

Proposed queue rank 389, phase 5. Outstanding IDs: C0521.

## C0522 — Weakness identification

Original entry: Weakness identification

- **C0522** · 19. Strategic planning · **unimplemented**
  Not implemented.

Proposed queue rank 390, phase 5. Outstanding IDs: C0522.

## C0523 — Piece improvement

Original entry: Piece improvement

- **C0523** · 19. Strategic planning · **unimplemented**
  Not implemented.

Proposed queue rank 391, phase 5. Outstanding IDs: C0523.

## C0524 — Pawn break preparation

Original entry: Pawn break preparation

- **C0524** · 19. Strategic planning · **unimplemented**
  Not implemented.

Proposed queue rank 164, phase 3. Outstanding IDs: C0524.

## C0525 — Minority attack

Original entry: Minority attack

- **C0525** · 19. Strategic planning · **unimplemented**
  Not implemented.

Proposed queue rank 392, phase 5. Outstanding IDs: C0525.

## C0526 — Majority advance

Original entry: Majority advance

- **C0526** · 19. Strategic planning · **unimplemented**
  Not implemented.

Proposed queue rank 78, phase 2. Outstanding IDs: C0526.

## C0527 — Kingside expansion

Original entry: Kingside expansion

- **C0527** · 19. Strategic planning · **unimplemented**
  Not implemented.

Proposed queue rank 79, phase 2. Outstanding IDs: C0527.

## C0528 — Queenside expansion

Original entry: Queenside expansion

- **C0528** · 19. Strategic planning · **unimplemented**
  Not implemented.

Proposed queue rank 80, phase 2. Outstanding IDs: C0528.

## C0529 — Central expansion

Original entry: Central expansion

- **C0529** · 19. Strategic planning · **unimplemented**
  Not implemented.

Proposed queue rank 81, phase 2. Outstanding IDs: C0529.

## C0530 — Restriction

Original entry: Restriction

- **C0530** · 19. Strategic planning · **verified**
  Mechanics verified: static legal destination count drops by at least two to at most two; explicit hypothetical before-opponent turn, no quality or future-position claim.
- **C0901** · 36. Deeper strategic concepts · **verified**
  Mechanics verified: static legal destination count drops by at least two to at most two; explicit hypothetical before-opponent turn, no quality or future-position claim.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0531 — Blockade

Original entry: Blockade

- **C0531** · 19. Strategic planning · **verified**
  Mechanics verified: actual moved nonpawn piece occupies the square immediately ahead of an unchanged enemy pawn; complete legal enemy replies show no straight advance; pawn captures and blocker removals retained; no permanent/best-move claim.
- **C0900** · 36. Deeper strategic concepts · **verified**
  Mechanics verified: actual moved nonpawn piece occupies the square immediately ahead of an unchanged enemy pawn; complete legal enemy replies show no straight advance; pawn captures and blocker removals retained; no permanent/best-move claim.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0532 — Prophylaxis

Original entry: Prophylaxis

- **C0532** · 19. Strategic planning · **unimplemented**
  Not implemented.
- **C0770** · 31. Prophylaxis and prevention · **unimplemented**
  Not implemented.
- **C0902** · 36. Deeper strategic concepts · **unimplemented**
  Not implemented.

Proposed queue rank 393, phase 5. Outstanding IDs: C0532, C0770, C0902.

## C0533 — Creating an outpost

Original entry: Creating an outpost

- **C0533** · 19. Strategic planning · **partial**
  Partial: new pawn-supported knight on c–f relative ranks 4–6; no enemy pawn ahead on neighboring files; future exchanges/permanence deferred.
- **C0717** · 27. Bishop versus knight endings · **partial**
  Partial: new pawn-supported knight on c–f relative ranks 4–6; no enemy pawn ahead on neighboring files; future exchanges/permanence deferred.

Proposed queue rank 394, phase 5. Outstanding IDs: C0533, C0717.

## C0534 — Occupying an open file

Original entry: Occupying an open file

- **C0534** · 19. Strategic planning · **verified**
  Mechanics verified: pawn-free file geometry and new rook/queen occupation.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0535 — Creating a passed pawn

Original entry: Creating a passed pawn

- **C0535** · 19. Strategic planning · **verified**
  Mechanics verified: passed-pawn geometry, including legal en-passant exception; creation or advance.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0536 — Activating the king

Original entry: Activating the king

- **C0536** · 19. Strategic planning · **verified**
  Mechanics verified: bare K+P versus K: actual king move changes pawn-only safe-queen goal from independently refuted before to proven after; bound covers every remaining push.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0537 — Improving pawn structure

Original entry: Improving pawn structure

- **C0537** · 19. Strategic planning · **unimplemented**
  Not implemented.

Proposed queue rank 395, phase 5. Outstanding IDs: C0537.

## C0538 — Exchanging a bad piece

Original entry: Exchanging a bad piece

- **C0538** · 19. Strategic planning · **unimplemented**
  Not implemented.

Proposed queue rank 396, phase 5. Outstanding IDs: C0538.

## C0539 — Exchanging the opponent's good piece

Original entry: Exchanging the opponent's good piece

- **C0539** · 19. Strategic planning · **unimplemented**
  Not implemented.

Proposed queue rank 397, phase 5. Outstanding IDs: C0539.

## C0540 — Changing the pawn structure

Original entry: Changing the pawn structure

- **C0540** · 19. Strategic planning · **unimplemented**
  Not implemented.

Proposed queue rank 82, phase 2. Outstanding IDs: C0540.

## C0541 — Fixing weaknesses

Original entry: Fixing weaknesses

- **C0541** · 19. Strategic planning · **unimplemented**
  Not implemented.

Proposed queue rank 398, phase 5. Outstanding IDs: C0541.

## C0542 — Inducing weaknesses

Original entry: Inducing weaknesses

- **C0542** · 19. Strategic planning · **unimplemented**
  Not implemented.

Proposed queue rank 399, phase 5. Outstanding IDs: C0542.

## C0543 — Creating a second weakness

Original entry: Creating a second weakness

- **C0543** · 19. Strategic planning · **unimplemented**
  Not implemented.

Proposed queue rank 400, phase 5. Outstanding IDs: C0543.

## C0544 — Switching wings

Original entry: Switching wings

- **C0544** · 19. Strategic planning · **unimplemented**
  Not implemented.

Proposed queue rank 165, phase 3. Outstanding IDs: C0544.

## C0545 — Preparing a favorable endgame

Original entry: Preparing a favorable endgame

- **C0545** · 19. Strategic planning · **unimplemented**
  Not implemented.

Proposed queue rank 401, phase 5. Outstanding IDs: C0545.

## C0546 — Preventing counterplay

Original entry: Preventing counterplay

- **C0546** · 19. Strategic planning · **unimplemented**
  Not implemented.

Proposed queue rank 402, phase 5. Outstanding IDs: C0546.

## C0547 — Material

Original entry: Material

- **C0547** · 20. Evaluation of a position · **unimplemented**
  Not implemented.

Proposed queue rank 8, phase 1. Outstanding IDs: C0547.

## C0549 — Piece activity

Original entry: Piece activity

- **C0549** · 20. Evaluation of a position · **unimplemented**
  Not implemented.

Proposed queue rank 403, phase 5. Outstanding IDs: C0549.

## C0550 — Development

Original entry: Development

- **C0550** · 20. Evaluation of a position · **verified**
  Mechanics verified: first surviving original minor home departure off back rank during first ten own turns; verified initial-position history.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0551 — Space

Original entry: Space

- **C0551** · 20. Evaluation of a position · **verified**
  Mechanics verified: actual new pawn attack squares in enemy half remove immediate enemy king destinations; complete legal before/after/removed-pawn causal sets and every actual reply; no general advantage or permanent restriction claim.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0552 — Pawn structure

Original entry: Pawn structure

- **C0552** · 20. Evaluation of a position · **unimplemented**
  Not implemented.

Proposed queue rank 9, phase 1. Outstanding IDs: C0552.

## C0553 — Center control

Original entry: Center control

- **C0553** · 20. Evaluation of a position · **unimplemented**
  Not implemented.

Proposed queue rank 96, phase 2. Outstanding IDs: C0553.

## C0554 — Initiative

Original entry: Initiative

- **C0554** · 20. Evaluation of a position · **unimplemented**
  Not implemented.
- **C0582** · 21. Initiative and dynamics · **unimplemented**
  Not implemented.

Proposed queue rank 404, phase 5. Outstanding IDs: C0554, C0582.

## C0555 — Mobility

Original entry: Mobility

- **C0555** · 20. Evaluation of a position · **verified**
  Mechanics verified: static legal destination count drops by at least two to at most two; explicit hypothetical before-opponent turn, no quality or future-position claim.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0556 — Coordination

Original entry: Coordination

- **C0556** · 20. Evaluation of a position · **unimplemented**
  Not implemented.

Proposed queue rank 405, phase 5. Outstanding IDs: C0556.

## C0557 — Weak squares

Original entry: Weak squares

- **C0557** · 20. Evaluation of a position · **unimplemented**
  Not implemented.

Proposed queue rank 406, phase 5. Outstanding IDs: C0557.

## C0558 — Outposts

Original entry: Outposts

- **C0558** · 20. Evaluation of a position · **verified**
  Mechanics verified: same conservative pawn-supported knight subset as Outpost, including future file shifts and legal pawn support; no permanent piece safety/strength claim.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0559 — Open files

Original entry: Open files

- **C0559** · 20. Evaluation of a position · **verified**
  Mechanics verified: pawn-free file geometry and new rook/queen occupation.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0560 — Open diagonals

Original entry: Open diagonals

- **C0560** · 20. Evaluation of a position · **verified**
  Mechanics verified: new full edge-to-edge bishop line of length at least five has no other piece; length eight identifies a long diagonal; geometric control only.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0561 — Passed pawns

Original entry: Passed pawns

- **C0561** · 20. Evaluation of a position · **verified**
  Mechanics verified: passed-pawn geometry, including legal en-passant exception; creation or advance.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0562 — Pawn majorities

Original entry: Pawn majorities

- **C0562** · 20. Evaluation of a position · **verified**
  Mechanics verified: counts on fixed a–d/e–h wings; no plan or advantage claim.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0563 — Minor-piece quality

Original entry: Minor-piece quality

- **C0563** · 20. Evaluation of a position · **unimplemented**
  Not implemented.

Proposed queue rank 407, phase 5. Outstanding IDs: C0563.

## C0564 — Bishop pair

Original entry: Bishop pair

- **C0564** · 20. Evaluation of a position · **verified**
  Mechanics verified: both square-color complexes represented; excludes two same-color promoted bishops.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0565 — King activity

Original entry: King activity

- **C0565** · 20. Evaluation of a position · **verified**
  Mechanics verified: bare K+P versus K: actual king move changes pawn-only safe-queen goal from independently refuted before to proven after; bound covers every remaining push.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0566 — Tactical opportunities

Original entry: Tactical opportunities

- **C0566** · 20. Evaluation of a position · **unimplemented**
  Not implemented.

Proposed queue rank 408, phase 5. Outstanding IDs: C0566.

## C0567 — Potential pawn breaks

Original entry: Potential pawn breaks

- **C0567** · 20. Evaluation of a position · **unimplemented**
  Not implemented.

Proposed queue rank 409, phase 5. Outstanding IDs: C0567.

## C0568 — Opponent's counterplay

Original entry: Opponent's counterplay

- **C0568** · 20. Evaluation of a position · **unimplemented**
  Not implemented.

Proposed queue rank 410, phase 5. Outstanding IDs: C0568.

## C0569 — Static evaluation

Original entry: Static evaluation

- **C0569** · 20. Evaluation of a position · **unimplemented**
  Not implemented.

Proposed queue rank 411, phase 5. Outstanding IDs: C0569.

## C0570 — Dynamic evaluation

Original entry: Dynamic evaluation

- **C0570** · 20. Evaluation of a position · **unimplemented**
  Not implemented.

Proposed queue rank 412, phase 5. Outstanding IDs: C0570.

## C0571 — Equal position

Original entry: Equal position

- **C0571** · 20. Evaluation of a position · **unimplemented**
  Not implemented.

Proposed queue rank 413, phase 5. Outstanding IDs: C0571.

## C0572 — Slight advantage

Original entry: Slight advantage

- **C0572** · 20. Evaluation of a position · **unimplemented**
  Not implemented.

Proposed queue rank 414, phase 5. Outstanding IDs: C0572.

## C0573 — Clear advantage

Original entry: Clear advantage

- **C0573** · 20. Evaluation of a position · **unimplemented**
  Not implemented.

Proposed queue rank 415, phase 5. Outstanding IDs: C0573.

## C0574 — Winning position

Original entry: Winning position

- **C0574** · 20. Evaluation of a position · **unimplemented**
  Not implemented.
- **C0978** · 38. Chess terminology for position types · **unimplemented**
  Not implemented.

Proposed queue rank 416, phase 5. Outstanding IDs: C0574, C0978.

## C0575 — Losing position

Original entry: Losing position

- **C0575** · 20. Evaluation of a position · **unimplemented**
  Not implemented.

Proposed queue rank 417, phase 5. Outstanding IDs: C0575.

## C0576 — Unclear position

Original entry: Unclear position

- **C0576** · 20. Evaluation of a position · **unimplemented**
  Not implemented.
- **C0981** · 38. Chess terminology for position types · **unimplemented**
  Not implemented.

Proposed queue rank 418, phase 5. Outstanding IDs: C0576, C0981.

## C0577 — Complicated position

Original entry: Complicated position

- **C0577** · 20. Evaluation of a position · **unimplemented**
  Not implemented.
- **C0976** · 38. Chess terminology for position types · **unimplemented**
  Not implemented.

Proposed queue rank 419, phase 5. Outstanding IDs: C0577, C0976.

## C0578 — Sharp position

Original entry: Sharp position

- **C0578** · 20. Evaluation of a position · **unimplemented**
  Not implemented.
- **C0962** · 38. Chess terminology for position types · **unimplemented**
  Not implemented.

Proposed queue rank 420, phase 5. Outstanding IDs: C0578, C0962.

## C0579 — Quiet position

Original entry: Quiet position

- **C0579** · 20. Evaluation of a position · **unimplemented**
  Not implemented.
- **C0965** · 38. Chess terminology for position types · **unimplemented**
  Not implemented.

Proposed queue rank 421, phase 5. Outstanding IDs: C0579, C0965.

## C0580 — Balanced position

Original entry: Balanced position

- **C0580** · 20. Evaluation of a position · **unimplemented**
  Not implemented.
- **C0968** · 38. Chess terminology for position types · **unimplemented**
  Not implemented.

Proposed queue rank 422, phase 5. Outstanding IDs: C0580, C0968.

## C0581 — Imbalanced position

Original entry: Imbalanced position

- **C0581** · 20. Evaluation of a position · **unimplemented**
  Not implemented.

Proposed queue rank 423, phase 5. Outstanding IDs: C0581.

## C0583 — Momentum

Original entry: Momentum

- **C0583** · 21. Initiative and dynamics · **unimplemented**
  Not implemented.

Proposed queue rank 424, phase 5. Outstanding IDs: C0583.

## C0584 — Tempo

Original entry: Tempo

- **C0584** · 21. Initiative and dynamics · **unimplemented**
  Not implemented.
- **C0752** · 30. Tempo and move-order concepts · **unimplemented**
  Not implemented.

Proposed queue rank 425, phase 5. Outstanding IDs: C0584, C0752.

## C0585 — Development lead

Original entry: Development lead

- **C0585** · 21. Initiative and dynamics · **unimplemented**
  Not implemented.

Proposed queue rank 166, phase 3. Outstanding IDs: C0585.

## C0586 — Forcing play

Original entry: Forcing play

- **C0586** · 21. Initiative and dynamics · **unimplemented**
  Not implemented.

Proposed queue rank 426, phase 5. Outstanding IDs: C0586.

## C0587 — Dynamic compensation

Original entry: Dynamic compensation

- **C0587** · 21. Initiative and dynamics · **unimplemented**
  Not implemented.
- **C0909** · 36. Deeper strategic concepts · **unimplemented**
  Not implemented.

Proposed queue rank 427, phase 5. Outstanding IDs: C0587, C0909.

## C0588 — Activity compensation

Original entry: Activity compensation

- **C0588** · 21. Initiative and dynamics · **unimplemented**
  Not implemented.

Proposed queue rank 428, phase 5. Outstanding IDs: C0588.

## C0589 — Time versus material

Original entry: Time versus material

- **C0589** · 21. Initiative and dynamics · **unimplemented**
  Not implemented.

Proposed queue rank 429, phase 5. Outstanding IDs: C0589.

## C0590 — Space versus material

Original entry: Space versus material

- **C0590** · 21. Initiative and dynamics · **unimplemented**
  Not implemented.

Proposed queue rank 430, phase 5. Outstanding IDs: C0590.

## C0591 — King safety versus material

Original entry: King safety versus material

- **C0591** · 21. Initiative and dynamics · **unimplemented**
  Not implemented.

Proposed queue rank 431, phase 5. Outstanding IDs: C0591.

## C0592 — Initiative versus material

Original entry: Initiative versus material

- **C0592** · 21. Initiative and dynamics · **unimplemented**
  Not implemented.

Proposed queue rank 432, phase 5. Outstanding IDs: C0592.

## C0593 — Sacrificial initiative

Original entry: Sacrificial initiative

- **C0593** · 21. Initiative and dynamics · **unimplemented**
  Not implemented.

Proposed queue rank 433, phase 5. Outstanding IDs: C0593.

## C0594 — Maintaining pressure

Original entry: Maintaining pressure

- **C0594** · 21. Initiative and dynamics · **unimplemented**
  Not implemented.

Proposed queue rank 434, phase 5. Outstanding IDs: C0594.

## C0595 — Losing the initiative

Original entry: Losing the initiative

- **C0595** · 21. Initiative and dynamics · **unimplemented**
  Not implemented.

Proposed queue rank 435, phase 5. Outstanding IDs: C0595.

## C0596 — Seizing the initiative

Original entry: Seizing the initiative

- **C0596** · 21. Initiative and dynamics · **unimplemented**
  Not implemented.

Proposed queue rank 436, phase 5. Outstanding IDs: C0596.

## C0597 — Counter-initiative

Original entry: Counter-initiative

- **C0597** · 21. Initiative and dynamics · **unimplemented**
  Not implemented.

Proposed queue rank 437, phase 5. Outstanding IDs: C0597.

## C0598 — Forcing the opponent onto the defensive

Original entry: Forcing the opponent onto the defensive

- **C0598** · 21. Initiative and dynamics · **unimplemented**
  Not implemented.

Proposed queue rank 438, phase 5. Outstanding IDs: C0598.

## C0599 — Dynamic equilibrium

Original entry: Dynamic equilibrium

- **C0599** · 21. Initiative and dynamics · **unimplemented**
  Not implemented.

Proposed queue rank 439, phase 5. Outstanding IDs: C0599.

## C0600 — Temporary advantage

Original entry: Temporary advantage

- **C0600** · 21. Initiative and dynamics · **unimplemented**
  Not implemented.

Proposed queue rank 440, phase 5. Outstanding IDs: C0600.

## C0601 — Permanent advantage

Original entry: Permanent advantage

- **C0601** · 21. Initiative and dynamics · **unimplemented**
  Not implemented.

Proposed queue rank 441, phase 5. Outstanding IDs: C0601.

## C0602 — Endgame transition

Original entry: Endgame transition

- **C0602** · 22. Endgame fundamentals · **partial**
  Partial: capture changes to an enumerated pure ending class; count-based subset, not strategic desirability.

Proposed queue rank 97, phase 2. Outstanding IDs: C0602.

## C0604 — Centralizing the king

Original entry: Centralizing the king

- **C0604** · 22. Endgame fundamentals · **partial**
  Partial: king arrives on d4/e4/d5/e5; safety and benefit not established.

Proposed queue rank 98, phase 2. Outstanding IDs: C0604.

## C0605 — Passed pawn creation

Original entry: Passed pawn creation

- **C0605** · 22. Endgame fundamentals · **verified**
  Mechanics verified: passed-pawn geometry, including legal en-passant exception; creation or advance.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0606 — Passed pawn promotion

Original entry: Passed pawn promotion

- **C0606** · 22. Endgame fundamentals · **verified**
  Mechanics verified: promotion of a previously identified passer.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0607 — Outside passed pawn

Original entry: Outside passed pawn

- **C0607** · 22. Endgame fundamentals · **verified**
  Mechanics verified: actual flank passer advance with every other pawn at least three files away, at least two other pawns including both colors; no king diversion or win claim.
- **C0643** · 23. Pawn endings · **verified**
  Mechanics verified: actual flank passer advance with every other pawn at least three files away, at least two other pawns including both colors; no king diversion or win claim.
- **C0691** · 25. Bishop endings · **verified**
  Mechanics verified: actual flank passer advance with every other pawn at least three files away, at least two other pawns including both colors; no king diversion or win claim.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0608 — Distant passed pawn

Original entry: Distant passed pawn

- **C0608** · 22. Endgame fundamentals · **verified**
  Mechanics verified: actual flank passer advance with every other pawn at least three files away, at least two other pawns including both colors; no king diversion or win claim.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0609 — Opposition

Original entry: Opposition

- **C0609** · 22. Endgame fundamentals · **verified**
  Mechanics verified: same proven king-move promotion effect with exact vacant even-separation king alignment and opponent to move; direct/distant/diagonal gated separately; not universal win from geometry.
- **C0635** · 23. Pawn endings · **verified**
  Mechanics verified: same proven king-move promotion effect with exact vacant even-separation king alignment and opponent to move; direct/distant/diagonal gated separately; not universal win from geometry.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0611 — Key squares

Original entry: Key squares

- **C0611** · 22. Endgame fundamentals · **unimplemented**
  Not implemented.

Proposed queue rank 215, phase 4. Outstanding IDs: C0611.

## C0613 — Triangulation

Original entry: Triangulation

- **C0613** · 22. Endgame fundamentals · **verified**
  Mechanics verified: recorded king triangle against two reversible moves of one enemy unit restores full piece placement and rights/EP, changing the turn; full legal history, counters and every reply retained; no forcing, opposition gain, zugzwang or winning-tempo claim.
- **C0651** · 23. Pawn endings · **verified**
  Mechanics verified: recorded king triangle against two reversible moves of one enemy unit restores full piece placement and rights/EP, changing the turn; full legal history, counters and every reply retained; no forcing, opposition gain, zugzwang or winning-tempo claim.
- **C0765** · 30. Tempo and move-order concepts · **verified**
  Mechanics verified: recorded king triangle against two reversible moves of one enemy unit restores full piece placement and rights/EP, changing the turn; full legal history, counters and every reply retained; no forcing, opposition gain, zugzwang or winning-tempo claim.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0614 — Zugzwang

Original entry: Zugzwang

- **C0614** · 22. Endgame fundamentals · **unimplemented**
  Not implemented.
- **C0652** · 23. Pawn endings · **unimplemented**
  Not implemented.
- **C0766** · 30. Tempo and move-order concepts · **unimplemented**
  Not implemented.

Proposed queue rank 216, phase 4. Outstanding IDs: C0614, C0652, C0766.

## C0615 — Mutual zugzwang

Original entry: Mutual zugzwang

- **C0615** · 22. Endgame fundamentals · **unimplemented**
  Not implemented.
- **C0767** · 30. Tempo and move-order concepts · **unimplemented**
  Not implemented.

Proposed queue rank 217, phase 4. Outstanding IDs: C0615, C0767.

## C0616 — Reserve tempo

Original entry: Reserve tempo

- **C0616** · 22. Endgame fundamentals · **verified**
  Mechanics verified: used straight pawn waiting step satisfies waiting contract and separate legal live removed-pawn frames retain all-reply next-move mate; no future tempo inventory or general opposition claim.
- **C0649** · 23. Pawn endings · **verified**
  Mechanics verified: used straight pawn waiting step satisfies waiting contract and separate legal live removed-pawn frames retain all-reply next-move mate; no future tempo inventory or general opposition claim.
- **C0760** · 30. Tempo and move-order concepts · **verified**
  Mechanics verified: used straight pawn waiting step satisfies waiting contract and separate legal live removed-pawn frames retain all-reply next-move mate; no future tempo inventory or general opposition claim.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0617 — Tempo move

Original entry: Tempo move

- **C0617** · 22. Endgame fundamentals · **unimplemented**
  Not implemented.

Proposed queue rank 218, phase 4. Outstanding IDs: C0617.

## C0618 — Breakthrough

Original entry: Breakthrough

- **C0618** · 22. Endgame fundamentals · **unimplemented**
  Not implemented.

Proposed queue rank 219, phase 4. Outstanding IDs: C0618.

## C0619 — Pawn race

Original entry: Pawn race

- **C0619** · 22. Endgame fundamentals · **verified**
  Mechanics verified: pure king-and-one-advanced-passed-pawn per side; full legal all-defense bounded route proves own pawn queens first using straight advances, with all post-promotion replies retained; no automatic win or queen-safety claim.
- **C0646** · 23. Pawn endings · **verified**
  Mechanics verified: pure king-and-one-advanced-passed-pawn per side; full legal all-defense bounded route proves own pawn queens first using straight advances, with all post-promotion replies retained; no automatic win or queen-safety claim.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0620 — Counting tempi

Original entry: Counting tempi

- **C0620** · 22. Endgame fundamentals · **unimplemented**
  Not implemented.

Proposed queue rank 220, phase 4. Outstanding IDs: C0620.

## C0621 — Rule of the square

Original entry: Rule of the square

- **C0621** · 22. Endgame fundamentals · **verified**
  Mechanics verified: bare K+P versus K, enemy king outside conservative tempo-adjusted promotion-square distance gate, plus independently verified all-response safe promotion route; no formula-only or inside-square judgment.
- **C0640** · 23. Pawn endings · **verified**
  Mechanics verified: bare K+P versus K, enemy king outside conservative tempo-adjusted promotion-square distance gate, plus independently verified all-response safe promotion route; no formula-only or inside-square judgment.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0622 — Shouldering

Original entry: Shouldering

- **C0622** · 22. Endgame fundamentals · **unimplemented**
  Not implemented.
- **C0639** · 23. Pawn endings · **unimplemented**
  Not implemented.

Proposed queue rank 442, phase 5. Outstanding IDs: C0622, C0639.

## C0623 — Outflanking

Original entry: Outflanking

- **C0623** · 22. Endgame fundamentals · **unimplemented**
  Not implemented.
- **C0638** · 23. Pawn endings · **unimplemented**
  Not implemented.

Proposed queue rank 443, phase 5. Outstanding IDs: C0623, C0638.

## C0626 — Stalemate resource

Original entry: Stalemate resource

- **C0626** · 22. Endgame fundamentals · **verified**
  Mechanics verified: actual moved non-pawn/non-king piece has a named legal enemy capture that immediately stalemates the mover; conditional resource only, not forced draw or loss assessment.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0627 — Underpromotion

Original entry: Underpromotion

- **C0627** · 22. Endgame fundamentals · **verified**
  Mechanics verified: promotion; non-queen piece change, no optimality claim.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0628 — Domination

Original entry: Domination

- **C0628** · 22. Endgame fundamentals · **verified**
  Mechanics verified: every legal move by the named unit permits tracked capture with positive gain through every immediate counterreply; other defenses not promised.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0629 — Converting an extra pawn

Original entry: Converting an extra pawn

- **C0629** · 22. Endgame fundamentals · **unimplemented**
  Not implemented.

Proposed queue rank 221, phase 4. Outstanding IDs: C0629.

## C0630 — Liquidation

Original entry: Liquidation

- **C0630** · 22. Endgame fundamentals · **unimplemented**
  Not implemented.

Proposed queue rank 99, phase 2. Outstanding IDs: C0630.

## C0631 — Endgame simplification

Original entry: Endgame simplification

- **C0631** · 22. Endgame fundamentals · **partial**
  Partial: capture changes to an enumerated pure ending class; count-based subset, not strategic desirability.

Proposed queue rank 100, phase 2. Outstanding IDs: C0631.

## C0633 — King and pawn versus king

Original entry: King and pawn versus king

- **C0633** · 23. Pawn endings · **verified**
  Mechanics verified: exact pure remaining material counts; no win/draw or strategic-value claim.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0634 — Key-square theory

Original entry: Key-square theory

- **C0634** · 23. Pawn endings · **unimplemented**
  Not implemented.

Proposed queue rank 222, phase 4. Outstanding IDs: C0634.

## C0641 — Pawn breakthrough

Original entry: Pawn breakthrough

- **C0641** · 23. Pawn endings · **unimplemented**
  Not implemented.

Proposed queue rank 223, phase 4. Outstanding IDs: C0641.

## C0642 — Protected passed pawn

Original entry: Protected passed pawn

- **C0642** · 23. Pawn endings · **verified**
  Mechanics verified: passer attacked by a friendly pawn; legal recapture or safe advance not promised.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0644 — Candidate passed pawn

Original entry: Candidate passed pawn

- **C0644** · 23. Pawn endings · **unimplemented**
  Not implemented.

Proposed queue rank 167, phase 3. Outstanding IDs: C0644.

## C0645 — Connected passers

Original entry: Connected passers

- **C0645** · 23. Pawn endings · **partial**
  Partial: adjacent-file passers at most one rank apart; safety and reciprocal protection not established.

Proposed queue rank 32, phase 1. Outstanding IDs: C0645.

## C0647 — Promotion race

Original entry: Promotion race

- **C0647** · 23. Pawn endings · **unimplemented**
  Not implemented.

Proposed queue rank 224, phase 4. Outstanding IDs: C0647.

## C0648 — Queen with check

Original entry: Queen with check

- **C0648** · 23. Pawn endings · **partial**
  Partial: passed-pawn queen promotion giving actual check; race strategy deferred.

Proposed queue rank 101, phase 2. Outstanding IDs: C0648.

## C0650 — Spare pawn move

Original entry: Spare pawn move

- **C0650** · 23. Pawn endings · **unimplemented**
  Not implemented.

Proposed queue rank 102, phase 2. Outstanding IDs: C0650.

## C0654 — Trebuchet

Original entry: Trebuchet

- **C0654** · 23. Pawn endings · **unimplemented**
  Not implemented.

Proposed queue rank 225, phase 4. Outstanding IDs: C0654.

## C0655 — Réti maneuver

Original entry: Réti maneuver

- **C0655** · 23. Pawn endings · **unimplemented**
  Not implemented.

Proposed queue rank 226, phase 4. Outstanding IDs: C0655.

## C0656 — Self-blocking pawns

Original entry: Self-blocking pawns

- **C0656** · 23. Pawn endings · **verified**
  Mechanics verified: actual move lands own unit immediately ahead of unchanged own pawn; current straight advance blocked; every enemy reply and next legal pawn move retained, no permanent/weakness claim.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0657 — Pawn majority

Original entry: Pawn majority

- **C0657** · 23. Pawn endings · **verified**
  Mechanics verified: counts on fixed a–d/e–h wings; no plan or advantage claim.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0658 — Fixing pawns

Original entry: Fixing pawns

- **C0658** · 23. Pawn endings · **unimplemented**
  Not implemented.

Proposed queue rank 168, phase 3. Outstanding IDs: C0658.

## C0659 — Creating entry squares

Original entry: Creating entry squares

- **C0659** · 23. Pawn endings · **unimplemented**
  Not implemented.

Proposed queue rank 169, phase 3. Outstanding IDs: C0659.

## C0660 — Rook behind the passed pawn

Original entry: Rook behind the passed pawn

- **C0660** · 24. Rook endings · **verified**
  Mechanics verified: unobstructed rook behind own or enemy passer; no best-placement claim.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0661 — Active rook

Original entry: Active rook

- **C0661** · 24. Rook endings · **unimplemented**
  Not implemented.

Proposed queue rank 444, phase 5. Outstanding IDs: C0661.

## C0662 — Cutting off the enemy king

Original entry: Cutting off the enemy king

- **C0662** · 24. Rook endings · **unimplemented**
  Not implemented.

Proposed queue rank 227, phase 4. Outstanding IDs: C0662.

## C0663 — Checking from behind

Original entry: Checking from behind

- **C0663** · 24. Rook endings · **verified**
  Mechanics verified: actual direct rook check behind enemy king and advanced passer on their file in a K/R/P ending; full legal evasions; no drawing-technique claim.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0664 — Checking from the side

Original entry: Checking from the side

- **C0664** · 24. Rook endings · **verified**
  Mechanics verified: actual direct rook check along king rank beside an advanced passer on king file in a K/R/P ending; full legal evasions; no strength/outcome claim.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0665 — Side checks

Original entry: Side checks

- **C0665** · 24. Rook endings · **unimplemented**
  Not implemented.

Proposed queue rank 33, phase 1. Outstanding IDs: C0665.

## C0666 — Long-side defense

Original entry: Long-side defense

- **C0666** · 24. Rook endings · **unimplemented**
  Not implemented.

Proposed queue rank 228, phase 4. Outstanding IDs: C0666.

## C0667 — Short-side defense

Original entry: Short-side defense

- **C0667** · 24. Rook endings · **unimplemented**
  Not implemented.

Proposed queue rank 229, phase 4. Outstanding IDs: C0667.

## C0668 — Lucena position

Original entry: Lucena position

- **C0668** · 24. Rook endings · **unimplemented**
  Not implemented.

Proposed queue rank 230, phase 4. Outstanding IDs: C0668.

## C0669 — Building a bridge

Original entry: Building a bridge

- **C0669** · 24. Rook endings · **unimplemented**
  Not implemented.

Proposed queue rank 231, phase 4. Outstanding IDs: C0669.

## C0670 — Philidor position

Original entry: Philidor position

- **C0670** · 24. Rook endings · **unimplemented**
  Not implemented.

Proposed queue rank 232, phase 4. Outstanding IDs: C0670.

## C0671 — Vancura defense

Original entry: Vancura defense

- **C0671** · 24. Rook endings · **unimplemented**
  Not implemented.

Proposed queue rank 233, phase 4. Outstanding IDs: C0671.

## C0672 — Rook and pawn versus rook

Original entry: Rook and pawn versus rook

- **C0672** · 24. Rook endings · **verified**
  Mechanics verified: exact pure remaining material counts; no win/draw or strategic-value claim.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0673 — Rook versus connected pawns

Original entry: Rook versus connected pawns

- **C0673** · 24. Rook endings · **verified**
  Mechanics verified: exact pure army and connected/passed pawn geometry; no outcome claim.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0674 — Rook versus passed pawns

Original entry: Rook versus passed pawns

- **C0674** · 24. Rook endings · **verified**
  Mechanics verified: exact pure army and connected/passed pawn geometry; no outcome claim.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0675 — Rook activity versus pawn material

Original entry: Rook activity versus pawn material

- **C0675** · 24. Rook endings · **unimplemented**
  Not implemented.

Proposed queue rank 445, phase 5. Outstanding IDs: C0675.

## C0676 — Seventh-rank rook

Original entry: Seventh-rank rook

- **C0676** · 24. Rook endings · **verified**
  Mechanics verified: relative seventh rank (White 7, Black 2); new placement.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0678 — King-rook coordination

Original entry: King-rook coordination

- **C0678** · 24. Rook endings · **unimplemented**
  Not implemented.

Proposed queue rank 446, phase 5. Outstanding IDs: C0678.

## C0679 — Rook sacrifice for a pawn

Original entry: Rook sacrifice for a pawn

- **C0679** · 24. Rook endings · **unimplemented**
  Not implemented.

Proposed queue rank 234, phase 4. Outstanding IDs: C0679.

## C0680 — Rook endgame pawn races

Original entry: Rook endgame pawn races

- **C0680** · 24. Rook endings · **unimplemented**
  Not implemented.

Proposed queue rank 235, phase 4. Outstanding IDs: C0680.

## C0681 — Four versus three

Original entry: Four versus three

- **C0681** · 24. Rook endings · **unimplemented**
  Not implemented.

Proposed queue rank 34, phase 1. Outstanding IDs: C0681.

## C0682 — Three versus two

Original entry: Three versus two

- **C0682** · 24. Rook endings · **unimplemented**
  Not implemented.

Proposed queue rank 35, phase 1. Outstanding IDs: C0682.

## C0683 — Outside passed pawn in rook endings

Original entry: Outside passed pawn in rook endings

- **C0683** · 24. Rook endings · **unimplemented**
  Not implemented.

Proposed queue rank 236, phase 4. Outstanding IDs: C0683.

## C0684 — Checking distance

Original entry: Checking distance

- **C0684** · 24. Rook endings · **verified**
  Mechanics verified: at least three clear squares between actual checking rook and king, EVERY immediate legal evasion leaves checker uncaptured; exact separation only, no long-term safety/draw claim.
- **C0731** · 28. Queen endings · **verified**
  Mechanics verified: at least three clear squares between actual checking rook and king, EVERY immediate legal evasion leaves checker uncaptured; exact separation only, no long-term safety/draw claim.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0685 — Rook trade into pawn ending

Original entry: Rook trade into pawn ending

- **C0685** · 24. Rook endings · **verified**
  Mechanics verified: verified rook-for-rook recapture leaves only kings and pawns.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0686 — Bishop and pawn versus bishop

Original entry: Bishop and pawn versus bishop

- **C0686** · 25. Bishop endings · **verified**
  Mechanics verified: exact pure remaining material counts; no win/draw or strategic-value claim.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0687 — Opposite-colored bishop ending

Original entry: Opposite-colored bishop ending

- **C0687** · 25. Bishop endings · **verified**
  Mechanics verified: one bishop per side, only kings/pawns/bishops remain; square-color classification.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0688 — Same-colored bishop ending

Original entry: Same-colored bishop ending

- **C0688** · 25. Bishop endings · **verified**
  Mechanics verified: one bishop per side, only kings/pawns/bishops remain; square-color classification.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0689 — Good bishop

Original entry: Good bishop

- **C0689** · 25. Bishop endings · **verified**
  Mechanics verified: new good-bishop pattern has at least two own pawns, all opposite the bishop square color; pawn relation only, not overall strategic value.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0690 — Bad bishop

Original entry: Bad bishop

- **C0690** · 25. Bishop endings · **verified**
  Mechanics verified: new bad-bishop pattern has at least two fixed central same-color own pawns, a direct forward blocker and at most four geometric controlled squares; not overall strategic value.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0692 — Wrong-colored bishop

Original entry: Wrong-colored bishop

- **C0692** · 25. Bishop endings · **verified**
  Mechanics verified: pure K+B+one a/h pawn vs bare K; bishop color differs from promotion corner; cannot control that corner; all legal next moves replayed, no draw/outcome claim.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0693 — Wrong rook pawn

Original entry: Wrong rook pawn

- **C0693** · 25. Bishop endings · **verified**
  Mechanics verified: pure K+B+one a/h pawn vs bare K; opposite-colored promotion corner; defending king occupies it or has a certified legal immediate move there; complete responses, conditional access only, no draw claim.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0694 — Bishop sacrifice for pawns

Original entry: Bishop sacrifice for pawns

- **C0694** · 25. Bishop endings · **unimplemented**
  Not implemented.

Proposed queue rank 237, phase 4. Outstanding IDs: C0694.

## C0695 — Diagonal control

Original entry: Diagonal control

- **C0695** · 25. Bishop endings · **verified**
  Mechanics verified: new full edge-to-edge bishop line of length at least five has no other piece; length eight identifies a long diagonal; geometric control only.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0697 — Bishop domination

Original entry: Bishop domination

- **C0697** · 25. Bishop endings · **verified**
  Mechanics verified: every legal move by the named unit permits tracked capture with positive gain through every immediate counterreply; other defenses not promised.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0698 — Bishop versus pawns on both wings

Original entry: Bishop versus pawns on both wings

- **C0698** · 25. Bishop endings · **unimplemented**
  Not implemented.

Proposed queue rank 447, phase 5. Outstanding IDs: C0698.

## C0699 — Knight and pawn versus knight

Original entry: Knight and pawn versus knight

- **C0699** · 26. Knight endings · **verified**
  Mechanics verified: exact pure remaining material counts; no win/draw or strategic-value claim.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0703 — Knight fork in endgames

Original entry: Knight fork in endgames

- **C0703** · 26. Knight endings · **unimplemented**
  Not implemented.

Proposed queue rank 238, phase 4. Outstanding IDs: C0703.

## C0704 — Knight maneuvering

Original entry: Knight maneuvering

- **C0704** · 26. Knight endings · **unimplemented**
  Not implemented.

Proposed queue rank 170, phase 3. Outstanding IDs: C0704.

## C0705 — Knight versus outside passed pawn

Original entry: Knight versus outside passed pawn

- **C0705** · 26. Knight endings · **unimplemented**
  Not implemented.

Proposed queue rank 239, phase 4. Outstanding IDs: C0705.

## C0706 — Knight versus connected pawns

Original entry: Knight versus connected pawns

- **C0706** · 26. Knight endings · **verified**
  Mechanics verified: exact pure army and connected/passed pawn geometry; no outcome claim.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0707 — King-knight coordination

Original entry: King-knight coordination

- **C0707** · 26. Knight endings · **unimplemented**
  Not implemented.

Proposed queue rank 448, phase 5. Outstanding IDs: C0707.

## C0708 — Knight inability to lose a tempo easily

Original entry: Knight inability to lose a tempo easily

- **C0708** · 26. Knight endings · **unimplemented**
  Not implemented.

Proposed queue rank 240, phase 4. Outstanding IDs: C0708.

## C0709 — Knight distance from action

Original entry: Knight distance from action

- **C0709** · 26. Knight endings · **unimplemented**
  Not implemented.

Proposed queue rank 171, phase 3. Outstanding IDs: C0709.

## C0710 — Bishop versus knight

Original entry: Bishop versus knight

- **C0710** · 27. Bishop versus knight endings · **partial**
  Partial: exact non-pawn army combinations only; strategic comparison deferred.
- **C0881** · 35. Strategic imbalances · **partial**
  Partial: exact non-pawn army combinations only; strategic comparison deferred.

Proposed queue rank 449, phase 5. Outstanding IDs: C0710, C0881.

## C0711 — Open position favors bishop

Original entry: Open position favors bishop

- **C0711** · 27. Bishop versus knight endings · **unimplemented**
  Not implemented.

Proposed queue rank 450, phase 5. Outstanding IDs: C0711.

## C0712 — Closed position favors knight

Original entry: Closed position favors knight

- **C0712** · 27. Bishop versus knight endings · **unimplemented**
  Not implemented.

Proposed queue rank 451, phase 5. Outstanding IDs: C0712.

## C0713 — Pawns on both wings favor bishop

Original entry: Pawns on both wings favor bishop

- **C0713** · 27. Bishop versus knight endings · **unimplemented**
  Not implemented.

Proposed queue rank 452, phase 5. Outstanding IDs: C0713.

## C0714 — Fixed pawns can favor knight

Original entry: Fixed pawns can favor knight

- **C0714** · 27. Bishop versus knight endings · **unimplemented**
  Not implemented.

Proposed queue rank 453, phase 5. Outstanding IDs: C0714.

## C0715 — Good bishop versus bad knight

Original entry: Good bishop versus bad knight

- **C0715** · 27. Bishop versus knight endings · **unimplemented**
  Not implemented.

Proposed queue rank 454, phase 5. Outstanding IDs: C0715.

## C0716 — Good knight versus bad bishop

Original entry: Good knight versus bad bishop

- **C0716** · 27. Bishop versus knight endings · **unimplemented**
  Not implemented.

Proposed queue rank 455, phase 5. Outstanding IDs: C0716.

## C0718 — Fixing pawns on bishop's color

Original entry: Fixing pawns on bishop's color

- **C0718** · 27. Bishop versus knight endings · **unimplemented**
  Not implemented.

Proposed queue rank 172, phase 3. Outstanding IDs: C0718.

## C0719 — Restricting the knight

Original entry: Restricting the knight

- **C0719** · 27. Bishop versus knight endings · **verified**
  Mechanics verified: static legal destination count drops by at least two to at most two; explicit hypothetical before-opponent turn, no quality or future-position claim.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0721 — Bishop's long-range advantage

Original entry: Bishop's long-range advantage

- **C0721** · 27. Bishop versus knight endings · **unimplemented**
  Not implemented.

Proposed queue rank 456, phase 5. Outstanding IDs: C0721.

## C0724 — King exposure

Original entry: King exposure

- **C0724** · 28. Queen endings · **unimplemented**
  Not implemented.

Proposed queue rank 457, phase 5. Outstanding IDs: C0724.

## C0726 — Passed-pawn checks

Original entry: Passed-pawn checks

- **C0726** · 28. Queen endings · **partial**
  Partial: passed pawn advance/promotion itself gives check; broader tactical plans deferred.

Proposed queue rank 241, phase 4. Outstanding IDs: C0726.

## C0727 — Queen behind passed pawn

Original entry: Queen behind passed pawn

- **C0727** · 28. Queen endings · **verified**
  Mechanics verified: new same-file unobstructed queen behind own/enemy passer.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0728 — Queen-versus-pawn endings

Original entry: Queen-versus-pawn endings

- **C0728** · 28. Queen endings · **verified**
  Mechanics verified: exact pure remaining material counts; no win/draw or strategic-value claim.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0729 — Queen race

Original entry: Queen race

- **C0729** · 28. Queen endings · **unimplemented**
  Not implemented.

Proposed queue rank 242, phase 4. Outstanding IDs: C0729.

## C0730 — Cross-check

Original entry: Cross-check

- **C0730** · 28. Queen endings · **verified**
  Mechanics verified: legal checking answer to a check; exact original/counterchecker sets, typed blocking rays or checker capture (including EP) or king discovery; direct/discovered/double counterchecks and promotions; ALL legal enemy evasions replayed; neutral factual wording, no advantage claim.
- **C0936** · 37. Advanced tactical concepts · **verified**
  Mechanics verified: legal checking answer to a check; exact original/counterchecker sets, typed blocking rays or checker capture (including EP) or king discovery; direct/discovered/double counterchecks and promotions; ALL legal enemy evasions replayed; neutral factual wording, no advantage claim.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0734 — Promotion tactics

Original entry: Promotion tactics

- **C0734** · 28. Queen endings · **verified**
  Mechanics verified: immediate E036 or opt-in multi-push E037 route: all defender replies retain queen promotion and every immediate response preserves queen and positive nominal gain, or actual mate; bounded horizon only.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0735 — Perpetual-check fortress

Original entry: Perpetual-check fortress

- **C0735** · 28. Queen endings · **unimplemented**
  Not implemented.

Proposed queue rank 243, phase 4. Outstanding IDs: C0735.

## C0736 — Queen versus rook

Original entry: Queen versus rook

- **C0736** · 29. Advanced endgames · **verified**
  Mechanics verified: exact pure remaining material counts; no win/draw or strategic-value claim.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0737 — Queen versus minor piece

Original entry: Queen versus minor piece

- **C0737** · 29. Advanced endgames · **verified**
  Mechanics verified: exact pure remaining material counts; no win/draw or strategic-value claim.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0738 — Rook versus bishop

Original entry: Rook versus bishop

- **C0738** · 29. Advanced endgames · **partial**
  Partial: exact non-pawn army combinations only; strategic comparison deferred.

Proposed queue rank 244, phase 4. Outstanding IDs: C0738.

## C0739 — Rook versus knight

Original entry: Rook versus knight

- **C0739** · 29. Advanced endgames · **partial**
  Partial: exact non-pawn army combinations only; strategic comparison deferred.

Proposed queue rank 245, phase 4. Outstanding IDs: C0739.

## C0740 — Rook and bishop versus rook

Original entry: Rook and bishop versus rook

- **C0740** · 29. Advanced endgames · **verified**
  Mechanics verified: exact pure remaining material counts; no win/draw or strategic-value claim.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0741 — Rook and knight versus rook

Original entry: Rook and knight versus rook

- **C0741** · 29. Advanced endgames · **verified**
  Mechanics verified: exact pure remaining material counts; no win/draw or strategic-value claim.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0742 — Queen versus rook and pawn

Original entry: Queen versus rook and pawn

- **C0742** · 29. Advanced endgames · **verified**
  Mechanics verified: exact pure remaining material counts; no win/draw or strategic-value claim.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0743 — Queen versus advanced pawn

Original entry: Queen versus advanced pawn

- **C0743** · 29. Advanced endgames · **verified**
  Mechanics verified: exact pure remaining material counts; no win/draw or strategic-value claim.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0744 — Two bishops versus knight

Original entry: Two bishops versus knight

- **C0744** · 29. Advanced endgames · **verified**
  Mechanics verified: exact pure remaining material counts; no win/draw or strategic-value claim.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0745 — Bishop and knight checkmate

Original entry: Bishop and knight checkmate

- **C0745** · 29. Advanced endgames · **verified**
  Mechanics verified: actual played checkmate against lone king with exactly the stated mating army.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0746 — Fortress construction

Original entry: Fortress construction

- **C0746** · 29. Advanced endgames · **unimplemented**
  Not implemented.

Proposed queue rank 246, phase 4. Outstanding IDs: C0746.

## C0747 — Tablebase position

Original entry: Tablebase position

- **C0747** · 29. Advanced endgames · **unimplemented**
  Not implemented.

Proposed queue rank 247, phase 4. Outstanding IDs: C0747.

## C0748 — Tablebase win

Original entry: Tablebase win

- **C0748** · 29. Advanced endgames · **unimplemented**
  Not implemented.

Proposed queue rank 248, phase 4. Outstanding IDs: C0748.

## C0749 — Tablebase draw

Original entry: Tablebase draw

- **C0749** · 29. Advanced endgames · **unimplemented**
  Not implemented.

Proposed queue rank 249, phase 4. Outstanding IDs: C0749.

## C0750 — Distance to mate

Original entry: Distance to mate

- **C0750** · 29. Advanced endgames · **unimplemented**
  Not implemented.

Proposed queue rank 250, phase 4. Outstanding IDs: C0750.

## C0751 — Distance to zeroing move

Original entry: Distance to zeroing move

- **C0751** · 29. Advanced endgames · **unimplemented**
  Not implemented.

Proposed queue rank 251, phase 4. Outstanding IDs: C0751.

## C0753 — Gain of tempo

Original entry: Gain of tempo

- **C0753** · 30. Tempo and move-order concepts · **unimplemented**
  Not implemented.

Proposed queue rank 83, phase 2. Outstanding IDs: C0753.

## C0754 — Loss of tempo

Original entry: Loss of tempo

- **C0754** · 30. Tempo and move-order concepts · **unimplemented**
  Not implemented.

Proposed queue rank 84, phase 2. Outstanding IDs: C0754.

## C0755 — Developing with tempo

Original entry: Developing with tempo

- **C0755** · 30. Tempo and move-order concepts · **verified**
  Mechanics verified: first minor development also gives legal check; mandatory response only, no net tempo gain.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0756 — Attacking with tempo

Original entry: Attacking with tempo

- **C0756** · 30. Tempo and move-order concepts · **unimplemented**
  Not implemented.

Proposed queue rank 85, phase 2. Outstanding IDs: C0756.

## C0757 — Tempo on the queen

Original entry: Tempo on the queen

- **C0757** · 30. Tempo and move-order concepts · **unimplemented**
  Not implemented.

Proposed queue rank 86, phase 2. Outstanding IDs: C0757.

## C0758 — Useful tempo

Original entry: Useful tempo

- **C0758** · 30. Tempo and move-order concepts · **unimplemented**
  Not implemented.

Proposed queue rank 458, phase 5. Outstanding IDs: C0758.

## C0759 — Wasted tempo

Original entry: Wasted tempo

- **C0759** · 30. Tempo and move-order concepts · **unimplemented**
  Not implemented.

Proposed queue rank 459, phase 5. Outstanding IDs: C0759.

## C0761 — Move-order trick

Original entry: Move-order trick

- **C0761** · 30. Tempo and move-order concepts · **unimplemented**
  Not implemented.

Proposed queue rank 173, phase 3. Outstanding IDs: C0761.

## C0762 — Transposition

Original entry: Transposition

- **C0762** · 30. Tempo and move-order concepts · **unimplemented**
  Not implemented.

Proposed queue rank 174, phase 3. Outstanding IDs: C0762.

## C0763 — Waiting move

Original entry: Waiting move

- **C0763** · 30. Tempo and move-order concepts · **verified**
  Mechanics verified: actual quiet move preserves an already existing all-reply next-move mate proven on legal hypothetical pass; no immediate mate originally available; full causal frames and trees; no intent/best-play/zugzwang claim.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0764 — Passing move

Original entry: Passing move

- **C0764** · 30. Tempo and move-order concepts · **unimplemented**
  Not implemented.

Proposed queue rank 252, phase 4. Outstanding IDs: C0764.

## C0768 — Move-order finesse

Original entry: Move-order finesse

- **C0768** · 30. Tempo and move-order concepts · **unimplemented**
  Not implemented.

Proposed queue rank 460, phase 5. Outstanding IDs: C0768.

## C0769 — Forcing move order

Original entry: Forcing move order

- **C0769** · 30. Tempo and move-order concepts · **unimplemented**
  Not implemented.

Proposed queue rank 253, phase 4. Outstanding IDs: C0769.

## C0771 — Opponent's idea

Original entry: Opponent's idea

- **C0771** · 31. Prophylaxis and prevention · **unimplemented**
  Not implemented.

Proposed queue rank 461, phase 5. Outstanding IDs: C0771.

## C0772 — Preventing a pawn break

Original entry: Preventing a pawn break

- **C0772** · 31. Prophylaxis and prevention · **unimplemented**
  Not implemented.

Proposed queue rank 254, phase 4. Outstanding IDs: C0772.

## C0773 — Preventing castling

Original entry: Preventing castling

- **C0773** · 31. Prophylaxis and prevention · **unimplemented**
  Not implemented.

Proposed queue rank 175, phase 3. Outstanding IDs: C0773.

## C0774 — Preventing development

Original entry: Preventing development

- **C0774** · 31. Prophylaxis and prevention · **unimplemented**
  Not implemented.

Proposed queue rank 255, phase 4. Outstanding IDs: C0774.

## C0775 — Stopping an outpost

Original entry: Stopping an outpost

- **C0775** · 31. Prophylaxis and prevention · **unimplemented**
  Not implemented.

Proposed queue rank 176, phase 3. Outstanding IDs: C0775.

## C0776 — Removing counterplay

Original entry: Removing counterplay

- **C0776** · 31. Prophylaxis and prevention · **unimplemented**
  Not implemented.

Proposed queue rank 462, phase 5. Outstanding IDs: C0776.

## C0777 — Creating escape squares

Original entry: Creating escape squares

- **C0777** · 31. Prophylaxis and prevention · **partial**
  Partial: vacated pawn square becomes legal adjacent home-rank king step; generic mate prevention or durable safety not established.

Proposed queue rank 87, phase 2. Outstanding IDs: C0777.

## C0778 — Preventing a tactical motif

Original entry: Preventing a tactical motif

- **C0778** · 31. Prophylaxis and prevention · **partial**
  Partial: subset verified: a specific certified fork prevented versus a supplied legal alternative.

Proposed queue rank 256, phase 4. Outstanding IDs: C0778.

## C0779 — Restricting a piece

Original entry: Restricting a piece

- **C0779** · 31. Prophylaxis and prevention · **verified**
  Mechanics verified: static legal destination count drops by at least two to at most two; explicit hypothetical before-opponent turn, no quality or future-position claim.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0780 — Preventing penetration

Original entry: Preventing penetration

- **C0780** · 31. Prophylaxis and prevention · **unimplemented**
  Not implemented.

Proposed queue rank 257, phase 4. Outstanding IDs: C0780.

## C0781 — Defensive pawn move

Original entry: Defensive pawn move

- **C0781** · 31. Prophylaxis and prevention · **verified**
  Mechanics verified: actual pawn move passes finite target-defense proof for a surviving non-pawn piece.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0783 — Restraining a passed pawn

Original entry: Restraining a passed pawn

- **C0783** · 31. Prophylaxis and prevention · **unimplemented**
  Not implemented.

Proposed queue rank 258, phase 4. Outstanding IDs: C0783.

## C0784 — Neutralizing a strong piece

Original entry: Neutralizing a strong piece

- **C0784** · 31. Prophylaxis and prevention · **unimplemented**
  Not implemented.

Proposed queue rank 463, phase 5. Outstanding IDs: C0784.

## C0785 — Preventive king move

Original entry: Preventive king move

- **C0785** · 31. Prophylaxis and prevention · **unimplemented**
  Not implemented.

Proposed queue rank 464, phase 5. Outstanding IDs: C0785.

## C0786 — Preventive rook move

Original entry: Preventive rook move

- **C0786** · 31. Prophylaxis and prevention · **unimplemented**
  Not implemented.

Proposed queue rank 465, phase 5. Outstanding IDs: C0786.

## C0787 — Preventive queen move

Original entry: Preventive queen move

- **C0787** · 31. Prophylaxis and prevention · **unimplemented**
  Not implemented.

Proposed queue rank 466, phase 5. Outstanding IDs: C0787.

## C0788 — Candidate move selection

Original entry: Candidate move selection

- **C0788** · 32. Decision-making concepts · **unimplemented**
  Not implemented.

Proposed queue rank 467, phase 5. Outstanding IDs: C0788.

## C0789 — Calculation

Original entry: Calculation

- **C0789** · 32. Decision-making concepts · **unimplemented**
  Not implemented.

Proposed queue rank 580, phase 6. Outstanding IDs: C0789.

## C0790 — Evaluation

Original entry: Evaluation

- **C0790** · 32. Decision-making concepts · **unimplemented**
  Not implemented.

Proposed queue rank 581, phase 6. Outstanding IDs: C0790.

## C0791 — Comparison

Original entry: Comparison

- **C0791** · 32. Decision-making concepts · **unimplemented**
  Not implemented.

Proposed queue rank 582, phase 6. Outstanding IDs: C0791.

## C0792 — Planning

Original entry: Planning

- **C0792** · 32. Decision-making concepts · **unimplemented**
  Not implemented.

Proposed queue rank 583, phase 6. Outstanding IDs: C0792.

## C0793 — Pattern recognition

Original entry: Pattern recognition

- **C0793** · 32. Decision-making concepts · **unimplemented**
  Not implemented.

Proposed queue rank 584, phase 6. Outstanding IDs: C0793.

## C0794 — Intuition

Original entry: Intuition

- **C0794** · 32. Decision-making concepts · **unimplemented**
  Not implemented.

Proposed queue rank 585, phase 6. Outstanding IDs: C0794.

## C0795 — Positional judgment

Original entry: Positional judgment

- **C0795** · 32. Decision-making concepts · **unimplemented**
  Not implemented.

Proposed queue rank 586, phase 6. Outstanding IDs: C0795.

## C0796 — Tactical awareness

Original entry: Tactical awareness

- **C0796** · 32. Decision-making concepts · **unimplemented**
  Not implemented.

Proposed queue rank 587, phase 6. Outstanding IDs: C0796.

## C0797 — Risk assessment

Original entry: Risk assessment

- **C0797** · 32. Decision-making concepts · **unimplemented**
  Not implemented.

Proposed queue rank 468, phase 5. Outstanding IDs: C0797.

## C0798 — Practical chances

Original entry: Practical chances

- **C0798** · 32. Decision-making concepts · **unimplemented**
  Not implemented.

Proposed queue rank 469, phase 5. Outstanding IDs: C0798.

## C0799 — Objective evaluation

Original entry: Objective evaluation

- **C0799** · 32. Decision-making concepts · **unimplemented**
  Not implemented.

Proposed queue rank 470, phase 5. Outstanding IDs: C0799.

## C0800 — Subjective difficulty

Original entry: Subjective difficulty

- **C0800** · 32. Decision-making concepts · **unimplemented**
  Not implemented.

Proposed queue rank 471, phase 5. Outstanding IDs: C0800.

## C0801 — Complexity

Original entry: Complexity

- **C0801** · 32. Decision-making concepts · **unimplemented**
  Not implemented.

Proposed queue rank 472, phase 5. Outstanding IDs: C0801.

## C0802 — Uncertainty

Original entry: Uncertainty

- **C0802** · 32. Decision-making concepts · **unimplemented**
  Not implemented.

Proposed queue rank 473, phase 5. Outstanding IDs: C0802.

## C0803 — Critical decision

Original entry: Critical decision

- **C0803** · 32. Decision-making concepts · **unimplemented**
  Not implemented.

Proposed queue rank 474, phase 5. Outstanding IDs: C0803.

## C0804 — Commitment

Original entry: Commitment

- **C0804** · 32. Decision-making concepts · **unimplemented**
  Not implemented.
- **C0926** · 36. Deeper strategic concepts · **unimplemented**
  Not implemented.

Proposed queue rank 475, phase 5. Outstanding IDs: C0804, C0926.

## C0805 — Irreversible move

Original entry: Irreversible move

- **C0805** · 32. Decision-making concepts · **verified**
  Mechanics verified: actual pawn move, capture or castling-right loss with before/after witnesses; no quality judgment.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0806 — Pawn move irreversibility

Original entry: Pawn move irreversibility

- **C0806** · 32. Decision-making concepts · **unimplemented**
  Not implemented.

Proposed queue rank 103, phase 2. Outstanding IDs: C0806.

## C0807 — Exchange decision

Original entry: Exchange decision

- **C0807** · 32. Decision-making concepts · **unimplemented**
  Not implemented.

Proposed queue rank 476, phase 5. Outstanding IDs: C0807.

## C0808 — When to simplify

Original entry: When to simplify

- **C0808** · 32. Decision-making concepts · **unimplemented**
  Not implemented.

Proposed queue rank 477, phase 5. Outstanding IDs: C0808.

## C0809 — When to complicate

Original entry: When to complicate

- **C0809** · 32. Decision-making concepts · **unimplemented**
  Not implemented.

Proposed queue rank 478, phase 5. Outstanding IDs: C0809.

## C0810 — When to attack

Original entry: When to attack

- **C0810** · 32. Decision-making concepts · **unimplemented**
  Not implemented.

Proposed queue rank 479, phase 5. Outstanding IDs: C0810.

## C0811 — When to defend

Original entry: When to defend

- **C0811** · 32. Decision-making concepts · **unimplemented**
  Not implemented.

Proposed queue rank 480, phase 5. Outstanding IDs: C0811.

## C0812 — When to sacrifice

Original entry: When to sacrifice

- **C0812** · 32. Decision-making concepts · **partial**
  Partial: bounded mate certificates verify some sound offers; general timing, necessity and positional criteria remain unresolved.

Proposed queue rank 481, phase 5. Outstanding IDs: C0812.

## C0813 — When to change the structure

Original entry: When to change the structure

- **C0813** · 32. Decision-making concepts · **unimplemented**
  Not implemented.

Proposed queue rank 482, phase 5. Outstanding IDs: C0813.

## C0814 — Time management

Original entry: Time management

- **C0814** · 33. Practical chess concepts · **unimplemented**
  Not implemented.

Proposed queue rank 588, phase 6. Outstanding IDs: C0814.

## C0815 — Clock awareness

Original entry: Clock awareness

- **C0815** · 33. Practical chess concepts · **unimplemented**
  Not implemented.

Proposed queue rank 589, phase 6. Outstanding IDs: C0815.

## C0816 — Time trouble

Original entry: Time trouble

- **C0816** · 33. Practical chess concepts · **unimplemented**
  Not implemented.

Proposed queue rank 590, phase 6. Outstanding IDs: C0816.

## C0817 — Zeitnot

Original entry: Zeitnot

- **C0817** · 33. Practical chess concepts · **unimplemented**
  Not implemented.

Proposed queue rank 591, phase 6. Outstanding IDs: C0817.

## C0818 — Increment

Original entry: Increment

- **C0818** · 33. Practical chess concepts · **unimplemented**
  Not implemented.
- **C1039** · 41. Competitive and rating concepts · **unimplemented**
  Not implemented.

Proposed queue rank 592, phase 6. Outstanding IDs: C0818, C1039.

## C0819 — Delay

Original entry: Delay

- **C0819** · 33. Practical chess concepts · **unimplemented**
  Not implemented.
- **C1040** · 41. Competitive and rating concepts · **unimplemented**
  Not implemented.

Proposed queue rank 593, phase 6. Outstanding IDs: C0819, C1040.

## C0820 — Thinking on the opponent's time

Original entry: Thinking on the opponent's time

- **C0820** · 33. Practical chess concepts · **unimplemented**
  Not implemented.

Proposed queue rank 594, phase 6. Outstanding IDs: C0820.

## C0821 — Blunder checking

Original entry: Blunder checking

- **C0821** · 33. Practical chess concepts · **unimplemented**
  Not implemented.

Proposed queue rank 483, phase 5. Outstanding IDs: C0821.

## C0822 — Practical move

Original entry: Practical move

- **C0822** · 33. Practical chess concepts · **unimplemented**
  Not implemented.

Proposed queue rank 484, phase 5. Outstanding IDs: C0822.

## C0823 — Safe move

Original entry: Safe move

- **C0823** · 33. Practical chess concepts · **unimplemented**
  Not implemented.

Proposed queue rank 485, phase 5. Outstanding IDs: C0823.

## C0824 — Complicated move

Original entry: Complicated move

- **C0824** · 33. Practical chess concepts · **unimplemented**
  Not implemented.

Proposed queue rank 486, phase 5. Outstanding IDs: C0824.

## C0825 — Forcing move

Original entry: Forcing move

- **C0825** · 33. Practical chess concepts · **verified**
  Mechanics verified: nonchecking, noncapturing actual move; every legal reply permits checkmate on the next own move, independently replayed; no newly-created/only-best claim.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0826 — Playing for two results

Original entry: Playing for two results — aiming to win while minimizing losing chances.

- **C0826** · 33. Practical chess concepts · **unimplemented**
  Not implemented.

Proposed queue rank 487, phase 5. Outstanding IDs: C0826.

## C0827 — Playing for a draw

Original entry: Playing for a draw

- **C0827** · 33. Practical chess concepts · **unimplemented**
  Not implemented.

Proposed queue rank 488, phase 5. Outstanding IDs: C0827.

## C0828 — Playing for a win

Original entry: Playing for a win

- **C0828** · 33. Practical chess concepts · **unimplemented**
  Not implemented.

Proposed queue rank 489, phase 5. Outstanding IDs: C0828.

## C0829 — Creating practical problems

Original entry: Creating practical problems

- **C0829** · 33. Practical chess concepts · **unimplemented**
  Not implemented.

Proposed queue rank 490, phase 5. Outstanding IDs: C0829.

## C0830 — Complexity management

Original entry: Complexity management

- **C0830** · 33. Practical chess concepts · **unimplemented**
  Not implemented.

Proposed queue rank 491, phase 5. Outstanding IDs: C0830.

## C0831 — Risk management

Original entry: Risk management

- **C0831** · 33. Practical chess concepts · **unimplemented**
  Not implemented.

Proposed queue rank 492, phase 5. Outstanding IDs: C0831.

## C0832 — Psychological pressure

Original entry: Psychological pressure

- **C0832** · 33. Practical chess concepts · **unimplemented**
  Not implemented.

Proposed queue rank 595, phase 6. Outstanding IDs: C0832.

## C0833 — Opening preparation

Original entry: Opening preparation

- **C0833** · 33. Practical chess concepts · **unimplemented**
  Not implemented.

Proposed queue rank 596, phase 6. Outstanding IDs: C0833.

## C0834 — Opponent preparation

Original entry: Opponent preparation

- **C0834** · 33. Practical chess concepts · **unimplemented**
  Not implemented.

Proposed queue rank 597, phase 6. Outstanding IDs: C0834.

## C0835 — Post-game analysis

Original entry: Post-game analysis

- **C0835** · 33. Practical chess concepts · **unimplemented**
  Not implemented.

Proposed queue rank 598, phase 6. Outstanding IDs: C0835.

## C0836 — Self-analysis

Original entry: Self-analysis

- **C0836** · 33. Practical chess concepts · **unimplemented**
  Not implemented.

Proposed queue rank 599, phase 6. Outstanding IDs: C0836.

## C0837 — Engine analysis

Original entry: Engine analysis

- **C0837** · 33. Practical chess concepts · **unimplemented**
  Not implemented.

Proposed queue rank 600, phase 6. Outstanding IDs: C0837.

## C0838 — Game annotation

Original entry: Game annotation

- **C0838** · 33. Practical chess concepts · **unimplemented**
  Not implemented.

Proposed queue rank 601, phase 6. Outstanding IDs: C0838.

## C0839 — Error classification

Original entry: Error classification

- **C0839** · 33. Practical chess concepts · **unimplemented**
  Not implemented.

Proposed queue rank 602, phase 6. Outstanding IDs: C0839.

## C0840 — Pattern training

Original entry: Pattern training

- **C0840** · 33. Practical chess concepts · **unimplemented**
  Not implemented.

Proposed queue rank 603, phase 6. Outstanding IDs: C0840.

## C0841 — Tactical training

Original entry: Tactical training

- **C0841** · 33. Practical chess concepts · **unimplemented**
  Not implemented.

Proposed queue rank 604, phase 6. Outstanding IDs: C0841.

## C0842 — Calculation training

Original entry: Calculation training

- **C0842** · 33. Practical chess concepts · **unimplemented**
  Not implemented.

Proposed queue rank 605, phase 6. Outstanding IDs: C0842.

## C0843 — Endgame training

Original entry: Endgame training

- **C0843** · 33. Practical chess concepts · **unimplemented**
  Not implemented.

Proposed queue rank 606, phase 6. Outstanding IDs: C0843.

## C0844 — Opening study

Original entry: Opening study

- **C0844** · 33. Practical chess concepts · **unimplemented**
  Not implemented.

Proposed queue rank 607, phase 6. Outstanding IDs: C0844.

## C0845 — Model games

Original entry: Model games

- **C0845** · 33. Practical chess concepts · **unimplemented**
  Not implemented.

Proposed queue rank 608, phase 6. Outstanding IDs: C0845.

## C0846 — Guess-the-move training

Original entry: Guess-the-move training

- **C0846** · 33. Practical chess concepts · **unimplemented**
  Not implemented.

Proposed queue rank 609, phase 6. Outstanding IDs: C0846.

## C0847 — Blunder

Original entry: Blunder

- **C0847** · 34. Common mistakes · **unimplemented**
  Not implemented.

Proposed queue rank 610, phase 6. Outstanding IDs: C0847.

## C0848 — Mistake

Original entry: Mistake

- **C0848** · 34. Common mistakes · **unimplemented**
  Not implemented.

Proposed queue rank 611, phase 6. Outstanding IDs: C0848.

## C0849 — Inaccuracy

Original entry: Inaccuracy

- **C0849** · 34. Common mistakes · **unimplemented**
  Not implemented.

Proposed queue rank 612, phase 6. Outstanding IDs: C0849.

## C0850 — Hanging a piece

Original entry: Hanging a piece

- **C0850** · 34. Common mistakes · **unimplemented**
  Not implemented.

Proposed queue rank 104, phase 2. Outstanding IDs: C0850.

## C0851 — Missing a tactic

Original entry: Missing a tactic

- **C0851** · 34. Common mistakes · **unimplemented**
  Not implemented.

Proposed queue rank 259, phase 4. Outstanding IDs: C0851.

## C0852 — Missing mate

Original entry: Missing mate

- **C0852** · 34. Common mistakes · **verified**
  Mechanics verified: shorter legal alternative has positive mate proof and played move has complete failure counterstrategy at same bound; no claim all later mating chances lost.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0853 — Ignoring the opponent's threat

Original entry: Ignoring the opponent's threat

- **C0853** · 34. Common mistakes · **unimplemented**
  Not implemented.

Proposed queue rank 260, phase 4. Outstanding IDs: C0853.

## C0854 — Premature attack

Original entry: Premature attack

- **C0854** · 34. Common mistakes · **unimplemented**
  Not implemented.

Proposed queue rank 493, phase 5. Outstanding IDs: C0854.

## C0855 — Premature pawn break

Original entry: Premature pawn break

- **C0855** · 34. Common mistakes · **unimplemented**
  Not implemented.

Proposed queue rank 494, phase 5. Outstanding IDs: C0855.

## C0856 — Unnecessary pawn move

Original entry: Unnecessary pawn move

- **C0856** · 34. Common mistakes · **unimplemented**
  Not implemented.

Proposed queue rank 177, phase 3. Outstanding IDs: C0856.

## C0857 — Weakening king safety

Original entry: Weakening king safety

- **C0857** · 34. Common mistakes · **unimplemented**
  Not implemented.

Proposed queue rank 495, phase 5. Outstanding IDs: C0857.

## C0858 — Moving the same piece repeatedly in the opening

Original entry: Moving the same piece repeatedly in the opening

- **C0858** · 34. Common mistakes · **verified**
  Mechanics verified: original surviving minor moves again in first ten turns while another original minor remains unmoved; no bad-move inference.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0860 — Neglecting development

Original entry: Neglecting development

- **C0860** · 34. Common mistakes · **unimplemented**
  Not implemented.

Proposed queue rank 496, phase 5. Outstanding IDs: C0860.

## C0861 — Greed

Original entry: Greed

- **C0861** · 34. Common mistakes · **unimplemented**
  Not implemented.

Proposed queue rank 497, phase 5. Outstanding IDs: C0861.

## C0862 — Pawn grabbing

Original entry: Pawn grabbing

- **C0862** · 34. Common mistakes · **unimplemented**
  Not implemented.

Proposed queue rank 178, phase 3. Outstanding IDs: C0862.

## C0863 — Automatic recapture

Original entry: Automatic recapture

- **C0863** · 34. Common mistakes · **partial**
  Partial: legal direct recapture options are retained as context; necessity, automatic choice and criticism of human decisions not inferred.

Proposed queue rank 498, phase 5. Outstanding IDs: C0863.

## C0864 — Automatic exchange

Original entry: Automatic exchange

- **C0864** · 34. Common mistakes · **unimplemented**
  Not implemented.

Proposed queue rank 499, phase 5. Outstanding IDs: C0864.

## C0865 — Bad simplification

Original entry: Bad simplification

- **C0865** · 34. Common mistakes · **unimplemented**
  Not implemented.

Proposed queue rank 500, phase 5. Outstanding IDs: C0865.

## C0866 — Trading an active piece

Original entry: Trading an active piece

- **C0866** · 34. Common mistakes · **unimplemented**
  Not implemented.

Proposed queue rank 501, phase 5. Outstanding IDs: C0866.

## C0867 — Creating unnecessary weaknesses

Original entry: Creating unnecessary weaknesses

- **C0867** · 34. Common mistakes · **unimplemented**
  Not implemented.

Proposed queue rank 502, phase 5. Outstanding IDs: C0867.

## C0869 — Overextension

Original entry: Overextension

- **C0869** · 34. Common mistakes · **unimplemented**
  Not implemented.

Proposed queue rank 179, phase 3. Outstanding IDs: C0869.

## C0870 — Overconfidence

Original entry: Overconfidence

- **C0870** · 34. Common mistakes · **unimplemented**
  Not implemented.

Proposed queue rank 613, phase 6. Outstanding IDs: C0870.

## C0871 — Playing too quickly

Original entry: Playing too quickly

- **C0871** · 34. Common mistakes · **unimplemented**
  Not implemented.

Proposed queue rank 614, phase 6. Outstanding IDs: C0871.

## C0872 — Using too much time

Original entry: Using too much time

- **C0872** · 34. Common mistakes · **unimplemented**
  Not implemented.

Proposed queue rank 615, phase 6. Outstanding IDs: C0872.

## C0873 — Tunnel vision

Original entry: Tunnel vision

- **C0873** · 34. Common mistakes · **unimplemented**
  Not implemented.

Proposed queue rank 616, phase 6. Outstanding IDs: C0873.

## C0874 — Hope chess

Original entry: Hope chess — playing moves based on an opponent missing something.

- **C0874** · 34. Common mistakes · **unimplemented**
  Not implemented.

Proposed queue rank 617, phase 6. Outstanding IDs: C0874.

## C0875 — Stopping calculation too early

Original entry: Stopping calculation too early

- **C0875** · 34. Common mistakes · **unimplemented**
  Not implemented.

Proposed queue rank 618, phase 6. Outstanding IDs: C0875.

## C0876 — Failing to calculate the opponent's best defense

Original entry: Failing to calculate the opponent's best defense

- **C0876** · 34. Common mistakes · **unimplemented**
  Not implemented.

Proposed queue rank 619, phase 6. Outstanding IDs: C0876.

## C0877 — Misjudging an endgame

Original entry: Misjudging an endgame

- **C0877** · 34. Common mistakes · **unimplemented**
  Not implemented.

Proposed queue rank 503, phase 5. Outstanding IDs: C0877.

## C0878 — Entering a lost pawn ending

Original entry: Entering a lost pawn ending

- **C0878** · 34. Common mistakes · **unimplemented**
  Not implemented.

Proposed queue rank 261, phase 4. Outstanding IDs: C0878.

## C0879 — Ignoring counterplay

Original entry: Ignoring counterplay

- **C0879** · 34. Common mistakes · **unimplemented**
  Not implemented.

Proposed queue rank 504, phase 5. Outstanding IDs: C0879.

## C0880 — Material imbalance

Original entry: Material imbalance

- **C0880** · 35. Strategic imbalances · **partial**
  Partial: nominal 1/3/3/5/9 arithmetic and listed exact army subsets; positional value deferred.

Proposed queue rank 10, phase 1. Outstanding IDs: C0880.

## C0882 — Bishop pair versus other minor pieces

Original entry: Bishop pair versus other minor pieces

- **C0882** · 35. Strategic imbalances · **unimplemented**
  Not implemented.

Proposed queue rank 11, phase 1. Outstanding IDs: C0882.

## C0883 — Rook versus two minor pieces

Original entry: Rook versus two minor pieces

- **C0883** · 35. Strategic imbalances · **partial**
  Partial: exact non-pawn army combinations only; strategic comparison deferred.

Proposed queue rank 12, phase 1. Outstanding IDs: C0883.

## C0886 — Pawn-structure imbalance

Original entry: Pawn-structure imbalance

- **C0886** · 35. Strategic imbalances · **unimplemented**
  Not implemented.

Proposed queue rank 180, phase 3. Outstanding IDs: C0886.

## C0887 — Space imbalance

Original entry: Space imbalance

- **C0887** · 35. Strategic imbalances · **unimplemented**
  Not implemented.

Proposed queue rank 505, phase 5. Outstanding IDs: C0887.

## C0888 — Development imbalance

Original entry: Development imbalance

- **C0888** · 35. Strategic imbalances · **unimplemented**
  Not implemented.

Proposed queue rank 105, phase 2. Outstanding IDs: C0888.

## C0889 — King-safety imbalance

Original entry: King-safety imbalance

- **C0889** · 35. Strategic imbalances · **unimplemented**
  Not implemented.

Proposed queue rank 506, phase 5. Outstanding IDs: C0889.

## C0890 — Initiative imbalance

Original entry: Initiative imbalance

- **C0890** · 35. Strategic imbalances · **unimplemented**
  Not implemented.

Proposed queue rank 507, phase 5. Outstanding IDs: C0890.

## C0891 — Activity imbalance

Original entry: Activity imbalance

- **C0891** · 35. Strategic imbalances · **unimplemented**
  Not implemented.

Proposed queue rank 508, phase 5. Outstanding IDs: C0891.

## C0892 — Weak-square imbalance

Original entry: Weak-square imbalance

- **C0892** · 35. Strategic imbalances · **unimplemented**
  Not implemented.

Proposed queue rank 509, phase 5. Outstanding IDs: C0892.

## C0893 — Passed-pawn imbalance

Original entry: Passed-pawn imbalance

- **C0893** · 35. Strategic imbalances · **unimplemented**
  Not implemented.

Proposed queue rank 13, phase 1. Outstanding IDs: C0893.

## C0894 — Pawn-majority imbalance

Original entry: Pawn-majority imbalance

- **C0894** · 35. Strategic imbalances · **unimplemented**
  Not implemented.

Proposed queue rank 14, phase 1. Outstanding IDs: C0894.

## C0895 — Color-complex imbalance

Original entry: Color-complex imbalance

- **C0895** · 35. Strategic imbalances · **unimplemented**
  Not implemented.

Proposed queue rank 510, phase 5. Outstanding IDs: C0895.

## C0896 — Good-piece/bad-piece imbalance

Original entry: Good-piece/bad-piece imbalance

- **C0896** · 35. Strategic imbalances · **unimplemented**
  Not implemented.

Proposed queue rank 511, phase 5. Outstanding IDs: C0896.

## C0897 — Static versus dynamic advantage

Original entry: Static versus dynamic advantage

- **C0897** · 35. Strategic imbalances · **unimplemented**
  Not implemented.

Proposed queue rank 512, phase 5. Outstanding IDs: C0897.

## C0898 — Principle of two weaknesses

Original entry: Principle of two weaknesses

- **C0898** · 36. Deeper strategic concepts · **unimplemented**
  Not implemented.

Proposed queue rank 513, phase 5. Outstanding IDs: C0898.

## C0903 — Centralization

Original entry: Centralization

- **C0903** · 36. Deeper strategic concepts · **verified**
  Mechanics verified: same before/after promotion benefit plus new king arrival on d4/e4/d5/e5; king subset only, no geometry-only quality judgment.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0904 — Maximal piece activity

Original entry: Maximal piece activity

- **C0904** · 36. Deeper strategic concepts · **unimplemented**
  Not implemented.

Proposed queue rank 514, phase 5. Outstanding IDs: C0904.

## C0905 — Transformation of advantages

Original entry: Transformation of advantages

- **C0905** · 36. Deeper strategic concepts · **unimplemented**
  Not implemented.

Proposed queue rank 515, phase 5. Outstanding IDs: C0905.

## C0906 — Accumulation of small advantages

Original entry: Accumulation of small advantages

- **C0906** · 36. Deeper strategic concepts · **unimplemented**
  Not implemented.

Proposed queue rank 516, phase 5. Outstanding IDs: C0906.

## C0907 — Strategic exchange sacrifice

Original entry: Strategic exchange sacrifice

- **C0907** · 36. Deeper strategic concepts · **unimplemented**
  Not implemented.

Proposed queue rank 517, phase 5. Outstanding IDs: C0907.

## C0908 — Positional pawn sacrifice

Original entry: Positional pawn sacrifice

- **C0908** · 36. Deeper strategic concepts · **unimplemented**
  Not implemented.

Proposed queue rank 518, phase 5. Outstanding IDs: C0908.

## C0910 — Permanent weakness

Original entry: Permanent weakness

- **C0910** · 36. Deeper strategic concepts · **unimplemented**
  Not implemented.

Proposed queue rank 181, phase 3. Outstanding IDs: C0910.

## C0911 — Temporary weakness

Original entry: Temporary weakness

- **C0911** · 36. Deeper strategic concepts · **unimplemented**
  Not implemented.

Proposed queue rank 182, phase 3. Outstanding IDs: C0911.

## C0912 — Static weakness

Original entry: Static weakness

- **C0912** · 36. Deeper strategic concepts · **unimplemented**
  Not implemented.

Proposed queue rank 183, phase 3. Outstanding IDs: C0912.

## C0913 — Weakness creation

Original entry: Weakness creation

- **C0913** · 36. Deeper strategic concepts · **unimplemented**
  Not implemented.

Proposed queue rank 519, phase 5. Outstanding IDs: C0913.

## C0914 — Fixation

Original entry: Fixation

- **C0914** · 36. Deeper strategic concepts · **unimplemented**
  Not implemented.

Proposed queue rank 184, phase 3. Outstanding IDs: C0914.

## C0915 — Provocation

Original entry: Provocation

- **C0915** · 36. Deeper strategic concepts · **unimplemented**
  Not implemented.

Proposed queue rank 520, phase 5. Outstanding IDs: C0915.

## C0916 — Inducing pawn moves

Original entry: Inducing pawn moves

- **C0916** · 36. Deeper strategic concepts · **unimplemented**
  Not implemented.

Proposed queue rank 185, phase 3. Outstanding IDs: C0916.

## C0917 — Changing the character of the position

Original entry: Changing the character of the position

- **C0917** · 36. Deeper strategic concepts · **unimplemented**
  Not implemented.

Proposed queue rank 521, phase 5. Outstanding IDs: C0917.

## C0918 — Good version versus bad version of a structure

Original entry: Good version versus bad version of a structure

- **C0918** · 36. Deeper strategic concepts · **unimplemented**
  Not implemented.

Proposed queue rank 522, phase 5. Outstanding IDs: C0918.

## C0919 — Favorable minor-piece imbalance

Original entry: Favorable minor-piece imbalance

- **C0919** · 36. Deeper strategic concepts · **unimplemented**
  Not implemented.

Proposed queue rank 523, phase 5. Outstanding IDs: C0919.

## C0920 — Improving before attacking

Original entry: Improving before attacking

- **C0920** · 36. Deeper strategic concepts · **unimplemented**
  Not implemented.

Proposed queue rank 524, phase 5. Outstanding IDs: C0920.

## C0921 — Restricting before breaking through

Original entry: Restricting before breaking through

- **C0921** · 36. Deeper strategic concepts · **partial**
  Partial: finite mobility/trap witnesses are implemented; separate preparatory history or larger combination intent remains unresolved.

Proposed queue rank 525, phase 5. Outstanding IDs: C0921.

## C0922 — Creating multiple fronts

Original entry: Creating multiple fronts

- **C0922** · 36. Deeper strategic concepts · **unimplemented**
  Not implemented.

Proposed queue rank 526, phase 5. Outstanding IDs: C0922.

## C0923 — Switching the point of attack

Original entry: Switching the point of attack

- **C0923** · 36. Deeper strategic concepts · **unimplemented**
  Not implemented.

Proposed queue rank 527, phase 5. Outstanding IDs: C0923.

## C0924 — Maximum tension

Original entry: Maximum tension

- **C0924** · 36. Deeper strategic concepts · **unimplemented**
  Not implemented.

Proposed queue rank 528, phase 5. Outstanding IDs: C0924.

## C0925 — Keeping flexibility

Original entry: Keeping flexibility

- **C0925** · 36. Deeper strategic concepts · **unimplemented**
  Not implemented.

Proposed queue rank 529, phase 5. Outstanding IDs: C0925.

## C0927 — Irreversibility

Original entry: Irreversibility

- **C0927** · 36. Deeper strategic concepts · **unimplemented**
  Not implemented.

Proposed queue rank 106, phase 2. Outstanding IDs: C0927.

## C0928 — Pawn structure determines plans

Original entry: Pawn structure determines plans

- **C0928** · 36. Deeper strategic concepts · **unimplemented**
  Not implemented.

Proposed queue rank 530, phase 5. Outstanding IDs: C0928.

## C0929 — Geometric tactics

Original entry: Geometric tactics

- **C0929** · 37. Advanced tactical concepts · **unimplemented**
  Not implemented.

Proposed queue rank 262, phase 4. Outstanding IDs: C0929.

## C0930 — Line tactics

Original entry: Line tactics

- **C0930** · 37. Advanced tactical concepts · **unimplemented**
  Not implemented.

Proposed queue rank 263, phase 4. Outstanding IDs: C0930.

## C0931 — Alignment tactics

Original entry: Alignment tactics

- **C0931** · 37. Advanced tactical concepts · **unimplemented**
  Not implemented.

Proposed queue rank 264, phase 4. Outstanding IDs: C0931.

## C0932 — Overworked defender

Original entry: Overworked defender

- **C0932** · 37. Advanced tactical concepts · **verified**
  Mechanics verified: conditional enemy N/B/R/Q recapture abandons another target after two before-proven legal recapture duties; same own attacker captures that target with positive before-move nominal gain through EVERY immediate enemy reply; all defender acceptances checked, no forced acceptance/long-term gain claim.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0933 — Underprotected piece

Original entry: Underprotected piece

- **C0933** · 37. Advanced tactical concepts · **unimplemented**
  Not implemented.

Proposed queue rank 69, phase 2. Outstanding IDs: C0933.

## C0934 — Self-pin

Original entry: Self-pin

- **C0934** · 37. Advanced tactical concepts · **unimplemented**
  Not implemented.

Proposed queue rank 70, phase 2. Outstanding IDs: C0934.

## C0935 — Cross-pin

Original entry: Cross-pin

- **C0935** · 37. Advanced tactical concepts · **verified**
  Mechanics verified: mixed king/queen pin on distinct slider lines; nonempty legal off-queen-line reply set passes the relative-pin proof; other cross-pin forms excluded.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0937 — Double attack with discovered attack

Original entry: Double attack with discovered attack

- **C0937** · 37. Advanced tactical concepts · **verified**
  Mechanics verified: new moved-piece and stationary revealed-slider attacks on distinct targets with finite capture witnesses.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0938 — Clearance combination

Original entry: Clearance combination

- **C0938** · 37. Advanced tactical concepts · **verified**
  Mechanics verified: same all-defense vacated-square mate sequence, complete legal reply/mating witnesses.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0939 — Interference combination

Original entry: Interference combination

- **C0939** · 37. Advanced tactical concepts · **verified**
  Mechanics verified: enemy slider had a legally proven before-duty recapture; actual move interposes on its clear ray; EVERY enemy reply allows the original target capture with positive before-move nominal gain through EVERY next enemy response; removing only the blocker restores a legal counterfactual defender recapture.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0940 — Deflection combination

Original entry: Deflection combination

- **C0940** · 37. Advanced tactical concepts · **verified**
  Mechanics verified: conditional enemy N/B/R/Q recapture abandons another target after two before-proven legal recapture duties; same own attacker captures that target with positive before-move nominal gain through EVERY immediate enemy reply; all defender acceptances checked, no forced acceptance/long-term gain claim.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0941 — Attraction combination

Original entry: Attraction combination

- **C0941** · 37. Advanced tactical concepts · **verified**
  Mechanics verified: positive nominal mating offer; EVERY legal defense permits mate next move; legal king acceptance changes its square and the SAME before-legal nonmating move becomes actual mate; conditional acceptance, no best-move/intent claim.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0942 — Decoy combination

Original entry: Decoy combination

- **C0942** · 37. Advanced tactical concepts · **verified**
  Mechanics verified: positive all-defense mating offer plus independently replayed king attraction or nonking self-blocking; mere defender-duty deflection insufficient; same-row full mate and complete causal-role certificate required.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0943 — Blocking combination

Original entry: Blocking combination

- **C0943** · 37. Advanced tactical concepts · **verified**
  Mechanics verified: positive all-defense mating offer; accepted nonking unit blocks an adjacent king flight; actual mate is legal and removing ONLY that capturer restores a legal escape onto its square; explicit artificial counterfactual, conditional acceptance.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0944 — Trapping combination

Original entry: Trapping combination

- **C0944** · 37. Advanced tactical concepts · **partial**
  Partial: finite mobility/trap witnesses are implemented; separate preparatory history or larger combination intent remains unresolved.

Proposed queue rank 265, phase 4. Outstanding IDs: C0944.

## C0945 — Desperado combination

Original entry: Desperado combination

- **C0945** · 37. Advanced tactical concepts · **verified**
  Mechanics verified: geometrically threatened N/B/R/Q takes its maximum available nominal capture; EVERY legal quiet alternative admits a legal unit-loss capture through ALL own responses (or enemy mate); EVERY actual unit recapture retains the conditional captured-value benefit through ALL own responses; finite three-ply comparison, no best-move or lasting-gain claim.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0946 — Promotion tactic

Original entry: Promotion tactic

- **C0946** · 37. Advanced tactical concepts · **verified**
  Mechanics verified: immediate E036 or opt-in multi-push E037 route: all defender replies retain queen promotion and every immediate response preserves queen and positive nominal gain, or actual mate; bounded horizon only.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0947 — Underpromotion tactic

Original entry: Underpromotion tactic

- **C0947** · 37. Advanced tactical concepts · **verified**
  Mechanics verified: played non-queen promotion remains nonterminal or actually mates while same-square queen promotion stalemates; avoids that draw only, no general necessity or forced win.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0948 — Stalemate tactic

Original entry: Stalemate tactic

- **C0948** · 37. Advanced tactical concepts · **verified**
  Mechanics verified: actual moved non-pawn/non-king piece has a named legal enemy capture that immediately stalemates the mover; conditional resource only, not forced draw or loss assessment.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0949 — Perpetual-check tactic

Original entry: Perpetual-check tactic

- **C0949** · 37. Advanced tactical concepts · **partial**
  Partial: repetition claim is verified from history; forced perpetual-check strategy remains unimplemented.

Proposed queue rank 266, phase 4. Outstanding IDs: C0949.

## C0950 — Fortress tactic

Original entry: Fortress tactic

- **C0950** · 37. Advanced tactical concepts · **unimplemented**
  Not implemented.

Proposed queue rank 267, phase 4. Outstanding IDs: C0950.

## C0951 — Tactical liquidation

Original entry: Tactical liquidation

- **C0951** · 37. Advanced tactical concepts · **unimplemented**
  Not implemented.

Proposed queue rank 268, phase 4. Outstanding IDs: C0951.

## C0952 — Intermediate sacrifice

Original entry: Intermediate sacrifice

- **C0952** · 37. Advanced tactical concepts · **verified**
  Mechanics verified: full history ends in enemy capture; every legal original recapture enumerated; different positive-cost offer forces mate in 2 or 3 via full same-row all-defense proof; no original mate in one; no eventual-recapture/best-move claim.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0953 — Intermediate check

Original entry: Intermediate check

- **C0953** · 37. Advanced tactical concepts · **verified**
  Mechanics verified: actual check delays a verified available recapture; every legal reply permits tracked recapture with finite positive gain or actual mate.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0954 — Intermediate capture

Original entry: Intermediate capture

- **C0954** · 37. Advanced tactical concepts · **verified**
  Mechanics verified: capture of a different unit delays verified recapture; every legal reply permits tracked recapture with finite positive gain or actual mate.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0955 — Quiet tactical move

Original entry: Quiet tactical move

- **C0955** · 37. Advanced tactical concepts · **verified**
  Mechanics verified: nonchecking, noncapturing actual move; every legal reply permits checkmate on the next own move, independently replayed; no newly-created/only-best claim.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0956 — Tactical retreat

Original entry: Tactical retreat

- **C0956** · 37. Advanced tactical concepts · **unimplemented**
  Not implemented.

Proposed queue rank 269, phase 4. Outstanding IDs: C0956.

## C0957 — Counter-combination

Original entry: Counter-combination

- **C0957** · 37. Advanced tactical concepts · **unimplemented**
  Not implemented.

Proposed queue rank 270, phase 4. Outstanding IDs: C0957.

## C0958 — Defensive combination

Original entry: Defensive combination

- **C0958** · 37. Advanced tactical concepts · **unimplemented**
  Not implemented.

Proposed queue rank 271, phase 4. Outstanding IDs: C0958.

## C0959 — Open position

Original entry: Open position

- **C0959** · 38. Chess terminology for position types · **unimplemented**
  Not implemented.

Proposed queue rank 186, phase 3. Outstanding IDs: C0959.

## C0960 — Closed position

Original entry: Closed position

- **C0960** · 38. Chess terminology for position types · **unimplemented**
  Not implemented.

Proposed queue rank 187, phase 3. Outstanding IDs: C0960.

## C0961 — Semi-open position

Original entry: Semi-open position

- **C0961** · 38. Chess terminology for position types · **unimplemented**
  Not implemented.

Proposed queue rank 188, phase 3. Outstanding IDs: C0961.

## C0963 — Tactical position

Original entry: Tactical position

- **C0963** · 38. Chess terminology for position types · **unimplemented**
  Not implemented.

Proposed queue rank 531, phase 5. Outstanding IDs: C0963.

## C0964 — Positional position

Original entry: Positional position

- **C0964** · 38. Chess terminology for position types · **unimplemented**
  Not implemented.

Proposed queue rank 532, phase 5. Outstanding IDs: C0964.

## C0966 — Dynamic position

Original entry: Dynamic position

- **C0966** · 38. Chess terminology for position types · **unimplemented**
  Not implemented.

Proposed queue rank 533, phase 5. Outstanding IDs: C0966.

## C0967 — Static position

Original entry: Static position

- **C0967** · 38. Chess terminology for position types · **unimplemented**
  Not implemented.

Proposed queue rank 534, phase 5. Outstanding IDs: C0967.

## C0969 — Unbalanced position

Original entry: Unbalanced position

- **C0969** · 38. Chess terminology for position types · **unimplemented**
  Not implemented.

Proposed queue rank 535, phase 5. Outstanding IDs: C0969.

## C0970 — Symmetrical position

Original entry: Symmetrical position

- **C0970** · 38. Chess terminology for position types · **unimplemented**
  Not implemented.

Proposed queue rank 36, phase 1. Outstanding IDs: C0970.

## C0971 — Asymmetrical position

Original entry: Asymmetrical position

- **C0971** · 38. Chess terminology for position types · **unimplemented**
  Not implemented.

Proposed queue rank 37, phase 1. Outstanding IDs: C0971.

## C0972 — Cramped position

Original entry: Cramped position

- **C0972** · 38. Chess terminology for position types · **unimplemented**
  Not implemented.

Proposed queue rank 536, phase 5. Outstanding IDs: C0972.

## C0973 — Spacious position

Original entry: Spacious position

- **C0973** · 38. Chess terminology for position types · **unimplemented**
  Not implemented.

Proposed queue rank 537, phase 5. Outstanding IDs: C0973.

## C0974 — Blocked position

Original entry: Blocked position

- **C0974** · 38. Chess terminology for position types · **verified**
  Mechanics verified: actual pawn advance completes a matched contiguous central pawn wall; neither side has a legal pawn move now, and all pawns/wall survive every live enemy reply with zero own pawn moves; full legal sets retained; no permanent blockage, fortress or advantage claim.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0975 — Fluid position

Original entry: Fluid position

- **C0975** · 38. Chess terminology for position types · **unimplemented**
  Not implemented.

Proposed queue rank 189, phase 3. Outstanding IDs: C0975.

## C0977 — Simplified position

Original entry: Simplified position

- **C0977** · 38. Chess terminology for position types · **unimplemented**
  Not implemented.

Proposed queue rank 107, phase 2. Outstanding IDs: C0977.

## C0979 — Lost position

Original entry: Lost position

- **C0979** · 38. Chess terminology for position types · **unimplemented**
  Not implemented.

Proposed queue rank 538, phase 5. Outstanding IDs: C0979.

## C0980 — Drawn position

Original entry: Drawn position

- **C0980** · 38. Chess terminology for position types · **verified**
  Mechanics verified: actual legal stalemate or conservative dead material: bare kings, lone minor, or only same-square-color bishops; no general drawn evaluation.

All original occurrences mechanically verified within their stated scopes; broader validity remains unmeasured.

## C0982 — Fortress position

Original entry: Fortress position

- **C0982** · 38. Chess terminology for position types · **unimplemented**
  Not implemented.

Proposed queue rank 272, phase 4. Outstanding IDs: C0982.

## C0983 — Zugzwang position

Original entry: Zugzwang position

- **C0983** · 38. Chess terminology for position types · **unimplemented**
  Not implemented.

Proposed queue rank 273, phase 4. Outstanding IDs: C0983.

## C0984 — Critical position

Original entry: Critical position

- **C0984** · 38. Chess terminology for position types · **unimplemented**
  Not implemented.

Proposed queue rank 539, phase 5. Outstanding IDs: C0984.

## C0985 — Algebraic notation

Original entry: Algebraic notation

- **C0985** · 39. Chess notation and analysis language · **unimplemented**
  Not implemented.

Proposed queue rank 620, phase 6. Outstanding IDs: C0985.

## C0986 — Descriptive notation

Original entry: Descriptive notation

- **C0986** · 39. Chess notation and analysis language · **unimplemented**
  Not implemented.

Proposed queue rank 621, phase 6. Outstanding IDs: C0986.

## C0987 — SAN

Original entry: SAN — Standard Algebraic Notation

- **C0987** · 39. Chess notation and analysis language · **unimplemented**
  Not implemented.

Proposed queue rank 622, phase 6. Outstanding IDs: C0987.

## C0988 — PGN

Original entry: PGN — Portable Game Notation

- **C0988** · 39. Chess notation and analysis language · **unimplemented**
  Not implemented.

Proposed queue rank 623, phase 6. Outstanding IDs: C0988.

## C0989 — FEN

Original entry: FEN — Forsyth-Edwards Notation

- **C0989** · 39. Chess notation and analysis language · **unimplemented**
  Not implemented.

Proposed queue rank 624, phase 6. Outstanding IDs: C0989.

## C0990 — Move number

Original entry: Move number

- **C0990** · 39. Chess notation and analysis language · **unimplemented**
  Not implemented.

Proposed queue rank 625, phase 6. Outstanding IDs: C0990.

## C0991 — Variation

Original entry: Variation

- **C0991** · 39. Chess notation and analysis language · **partial**
  Partial: bounded mate tree/profile and verified continuation are implemented in research evidence; generic calculation/variation coaching label remains outside this candidate.

Proposed queue rank 626, phase 6. Outstanding IDs: C0991.

## C0992 — Main line

Original entry: Main line

- **C0992** · 39. Chess notation and analysis language · **unimplemented**
  Not implemented.

Proposed queue rank 627, phase 6. Outstanding IDs: C0992.

## C0993 — Side variation

Original entry: Side variation

- **C0993** · 39. Chess notation and analysis language · **unimplemented**
  Not implemented.

Proposed queue rank 628, phase 6. Outstanding IDs: C0993.

## C0994 — Annotation

Original entry: Annotation

- **C0994** · 39. Chess notation and analysis language · **unimplemented**
  Not implemented.

Proposed queue rank 629, phase 6. Outstanding IDs: C0994.

## C0995 — !

Original entry: ! — good move

- **C0995** · 39. Chess notation and analysis language · **unimplemented**
  Not implemented.

Proposed queue rank 630, phase 6. Outstanding IDs: C0995.

## C0996 — !!

Original entry: !! — brilliant/excellent move

- **C0996** · 39. Chess notation and analysis language · **unimplemented**
  Not implemented.

Proposed queue rank 631, phase 6. Outstanding IDs: C0996.

## C0997 — ?

Original entry: ? — mistake

- **C0997** · 39. Chess notation and analysis language · **unimplemented**
  Not implemented.

Proposed queue rank 632, phase 6. Outstanding IDs: C0997.

## C0998 — ??

Original entry: ?? — blunder

- **C0998** · 39. Chess notation and analysis language · **unimplemented**
  Not implemented.

Proposed queue rank 633, phase 6. Outstanding IDs: C0998.

## C0999 — !?

Original entry: !? — interesting move

- **C0999** · 39. Chess notation and analysis language · **unimplemented**
  Not implemented.

Proposed queue rank 634, phase 6. Outstanding IDs: C0999.

## C1000 — ?!

Original entry: ?! — dubious move

- **C1000** · 39. Chess notation and analysis language · **unimplemented**
  Not implemented.

Proposed queue rank 635, phase 6. Outstanding IDs: C1000.

## C1001 — +=

Original entry: += — White slightly better

- **C1001** · 39. Chess notation and analysis language · **unimplemented**
  Not implemented.

Proposed queue rank 636, phase 6. Outstanding IDs: C1001.

## C1002 — =+

Original entry: =+ — Black slightly better

- **C1002** · 39. Chess notation and analysis language · **unimplemented**
  Not implemented.

Proposed queue rank 637, phase 6. Outstanding IDs: C1002.

## C1003 — ±

Original entry: ± — White clearly better

- **C1003** · 39. Chess notation and analysis language · **unimplemented**
  Not implemented.

Proposed queue rank 638, phase 6. Outstanding IDs: C1003.

## C1004 — ∓

Original entry: ∓ — Black clearly better

- **C1004** · 39. Chess notation and analysis language · **unimplemented**
  Not implemented.

Proposed queue rank 639, phase 6. Outstanding IDs: C1004.

## C1005 — =

Original entry: = — equal

- **C1005** · 39. Chess notation and analysis language · **unimplemented**
  Not implemented.

Proposed queue rank 640, phase 6. Outstanding IDs: C1005.

## C1006 — ∞

Original entry: ∞ — unclear/compensation

- **C1006** · 39. Chess notation and analysis language · **unimplemented**
  Not implemented.

Proposed queue rank 641, phase 6. Outstanding IDs: C1006.

## C1007 — Mating evaluation

Original entry: Mating evaluation

- **C1007** · 39. Chess notation and analysis language · **unimplemented**
  Not implemented.

Proposed queue rank 642, phase 6. Outstanding IDs: C1007.

## C1008 — Centipawn evaluation

Original entry: Centipawn evaluation

- **C1008** · 39. Chess notation and analysis language · **unimplemented**
  Not implemented.

Proposed queue rank 643, phase 6. Outstanding IDs: C1008.

## C1009 — Engine evaluation

Original entry: Engine evaluation

- **C1009** · 39. Chess notation and analysis language · **unimplemented**
  Not implemented.

Proposed queue rank 644, phase 6. Outstanding IDs: C1009.

## C1010 — Depth

Original entry: Depth

- **C1010** · 39. Chess notation and analysis language · **unimplemented**
  Not implemented.

Proposed queue rank 645, phase 6. Outstanding IDs: C1010.

## C1011 — Principal variation

Original entry: Principal variation

- **C1011** · 39. Chess notation and analysis language · **unimplemented**
  Not implemented.
- **C1018** · 40. Computer-chess concepts · **unimplemented**
  Not implemented.

Proposed queue rank 646, phase 6. Outstanding IDs: C1011, C1018.

## C1012 — Chess engine

Original entry: Chess engine

- **C1012** · 40. Computer-chess concepts · **unimplemented**
  Not implemented.

Proposed queue rank 647, phase 6. Outstanding IDs: C1012.

## C1013 — Evaluation function

Original entry: Evaluation function

- **C1013** · 40. Computer-chess concepts · **unimplemented**
  Not implemented.

Proposed queue rank 648, phase 6. Outstanding IDs: C1013.

## C1014 — Centipawn

Original entry: Centipawn

- **C1014** · 40. Computer-chess concepts · **unimplemented**
  Not implemented.

Proposed queue rank 649, phase 6. Outstanding IDs: C1014.

## C1015 — Search depth

Original entry: Search depth

- **C1015** · 40. Computer-chess concepts · **partial**
  Partial: bounded mate tree/profile and verified continuation are implemented in research evidence; generic calculation/variation coaching label remains outside this candidate.

Proposed queue rank 650, phase 6. Outstanding IDs: C1015.

## C1016 — Nodes

Original entry: Nodes

- **C1016** · 40. Computer-chess concepts · **unimplemented**
  Not implemented.

Proposed queue rank 651, phase 6. Outstanding IDs: C1016.

## C1017 — Nodes per second

Original entry: Nodes per second

- **C1017** · 40. Computer-chess concepts · **unimplemented**
  Not implemented.

Proposed queue rank 652, phase 6. Outstanding IDs: C1017.

## C1019 — Engine line

Original entry: Engine line

- **C1019** · 40. Computer-chess concepts · **unimplemented**
  Not implemented.

Proposed queue rank 653, phase 6. Outstanding IDs: C1019.

## C1020 — Multi-PV

Original entry: Multi-PV

- **C1020** · 40. Computer-chess concepts · **unimplemented**
  Not implemented.

Proposed queue rank 654, phase 6. Outstanding IDs: C1020.

## C1021 — Opening book

Original entry: Opening book

- **C1021** · 40. Computer-chess concepts · **unimplemented**
  Not implemented.

Proposed queue rank 655, phase 6. Outstanding IDs: C1021.

## C1022 — Endgame tablebase

Original entry: Endgame tablebase

- **C1022** · 40. Computer-chess concepts · **unimplemented**
  Not implemented.

Proposed queue rank 656, phase 6. Outstanding IDs: C1022.

## C1023 — Syzygy tablebases

Original entry: Syzygy tablebases

- **C1023** · 40. Computer-chess concepts · **unimplemented**
  Not implemented.

Proposed queue rank 657, phase 6. Outstanding IDs: C1023.

## C1024 — Mate search

Original entry: Mate search

- **C1024** · 40. Computer-chess concepts · **partial**
  Partial: bounded mate tree/profile and verified continuation are implemented in research evidence; generic calculation/variation coaching label remains outside this candidate.

Proposed queue rank 658, phase 6. Outstanding IDs: C1024.

## C1025 — Engine tactical analysis

Original entry: Engine tactical analysis

- **C1025** · 40. Computer-chess concepts · **unimplemented**
  Not implemented.

Proposed queue rank 659, phase 6. Outstanding IDs: C1025.

## C1026 — Engine positional evaluation

Original entry: Engine positional evaluation

- **C1026** · 40. Computer-chess concepts · **unimplemented**
  Not implemented.

Proposed queue rank 660, phase 6. Outstanding IDs: C1026.

## C1027 — Human versus engine move

Original entry: Human versus engine move

- **C1027** · 40. Computer-chess concepts · **unimplemented**
  Not implemented.

Proposed queue rank 661, phase 6. Outstanding IDs: C1027.

## C1028 — Top engine move

Original entry: Top engine move

- **C1028** · 40. Computer-chess concepts · **unimplemented**
  Not implemented.

Proposed queue rank 662, phase 6. Outstanding IDs: C1028.

## C1029 — Evaluation swing

Original entry: Evaluation swing

- **C1029** · 40. Computer-chess concepts · **unimplemented**
  Not implemented.

Proposed queue rank 663, phase 6. Outstanding IDs: C1029.

## C1030 — Blunder according to engine

Original entry: Blunder according to engine

- **C1030** · 40. Computer-chess concepts · **unimplemented**
  Not implemented.

Proposed queue rank 664, phase 6. Outstanding IDs: C1030.

## C1031 — Accuracy

Original entry: Accuracy

- **C1031** · 40. Computer-chess concepts · **unimplemented**
  Not implemented.

Proposed queue rank 665, phase 6. Outstanding IDs: C1031.

## C1032 — Computer-assisted preparation

Original entry: Computer-assisted preparation

- **C1032** · 40. Computer-chess concepts · **unimplemented**
  Not implemented.

Proposed queue rank 666, phase 6. Outstanding IDs: C1032.

## C1033 — Classical chess

Original entry: Classical chess

- **C1033** · 41. Competitive and rating concepts · **unimplemented**
  Not implemented.

Proposed queue rank 667, phase 6. Outstanding IDs: C1033.

## C1034 — Rapid chess

Original entry: Rapid chess

- **C1034** · 41. Competitive and rating concepts · **unimplemented**
  Not implemented.

Proposed queue rank 668, phase 6. Outstanding IDs: C1034.

## C1035 — Blitz chess

Original entry: Blitz chess

- **C1035** · 41. Competitive and rating concepts · **unimplemented**
  Not implemented.

Proposed queue rank 669, phase 6. Outstanding IDs: C1035.

## C1036 — Bullet chess

Original entry: Bullet chess

- **C1036** · 41. Competitive and rating concepts · **unimplemented**
  Not implemented.

Proposed queue rank 670, phase 6. Outstanding IDs: C1036.

## C1037 — Armageddon

Original entry: Armageddon

- **C1037** · 41. Competitive and rating concepts · **unimplemented**
  Not implemented.

Proposed queue rank 671, phase 6. Outstanding IDs: C1037.

## C1038 — Time control

Original entry: Time control

- **C1038** · 41. Competitive and rating concepts · **unimplemented**
  Not implemented.

Proposed queue rank 672, phase 6. Outstanding IDs: C1038.

## C1041 — Rated game

Original entry: Rated game

- **C1041** · 41. Competitive and rating concepts · **unimplemented**
  Not implemented.

Proposed queue rank 673, phase 6. Outstanding IDs: C1041.

## C1042 — Unrated game

Original entry: Unrated game

- **C1042** · 41. Competitive and rating concepts · **unimplemented**
  Not implemented.

Proposed queue rank 674, phase 6. Outstanding IDs: C1042.

## C1043 — Rating

Original entry: Rating

- **C1043** · 41. Competitive and rating concepts · **unimplemented**
  Not implemented.

Proposed queue rank 675, phase 6. Outstanding IDs: C1043.

## C1044 — Elo rating

Original entry: Elo rating

- **C1044** · 41. Competitive and rating concepts · **unimplemented**
  Not implemented.

Proposed queue rank 676, phase 6. Outstanding IDs: C1044.

## C1045 — Rating performance

Original entry: Rating performance

- **C1045** · 41. Competitive and rating concepts · **unimplemented**
  Not implemented.

Proposed queue rank 677, phase 6. Outstanding IDs: C1045.

## C1046 — Performance rating

Original entry: Performance rating

- **C1046** · 41. Competitive and rating concepts · **unimplemented**
  Not implemented.

Proposed queue rank 678, phase 6. Outstanding IDs: C1046.

## C1047 — Tournament

Original entry: Tournament

- **C1047** · 41. Competitive and rating concepts · **unimplemented**
  Not implemented.

Proposed queue rank 679, phase 6. Outstanding IDs: C1047.

## C1048 — Round robin

Original entry: Round robin

- **C1048** · 41. Competitive and rating concepts · **unimplemented**
  Not implemented.

Proposed queue rank 680, phase 6. Outstanding IDs: C1048.

## C1049 — Swiss system

Original entry: Swiss system

- **C1049** · 41. Competitive and rating concepts · **unimplemented**
  Not implemented.

Proposed queue rank 681, phase 6. Outstanding IDs: C1049.

## C1050 — Knockout

Original entry: Knockout

- **C1050** · 41. Competitive and rating concepts · **unimplemented**
  Not implemented.

Proposed queue rank 682, phase 6. Outstanding IDs: C1050.

## C1051 — Match

Original entry: Match

- **C1051** · 41. Competitive and rating concepts · **unimplemented**
  Not implemented.

Proposed queue rank 683, phase 6. Outstanding IDs: C1051.

## C1052 — Tiebreak

Original entry: Tiebreak

- **C1052** · 41. Competitive and rating concepts · **unimplemented**
  Not implemented.

Proposed queue rank 684, phase 6. Outstanding IDs: C1052.

## C1053 — Tournament standings

Original entry: Tournament standings

- **C1053** · 41. Competitive and rating concepts · **unimplemented**
  Not implemented.

Proposed queue rank 685, phase 6. Outstanding IDs: C1053.

## C1054 — Title norms

Original entry: Title norms

- **C1054** · 41. Competitive and rating concepts · **unimplemented**
  Not implemented.

Proposed queue rank 686, phase 6. Outstanding IDs: C1054.

## C1055 — Candidate Master

Original entry: Candidate Master

- **C1055** · 41. Competitive and rating concepts · **unimplemented**
  Not implemented.

Proposed queue rank 687, phase 6. Outstanding IDs: C1055.

## C1056 — FIDE Master

Original entry: FIDE Master

- **C1056** · 41. Competitive and rating concepts · **unimplemented**
  Not implemented.

Proposed queue rank 688, phase 6. Outstanding IDs: C1056.

## C1057 — International Master

Original entry: International Master

- **C1057** · 41. Competitive and rating concepts · **unimplemented**
  Not implemented.

Proposed queue rank 689, phase 6. Outstanding IDs: C1057.

## C1058 — Grandmaster

Original entry: Grandmaster

- **C1058** · 41. Competitive and rating concepts · **unimplemented**
  Not implemented.

Proposed queue rank 690, phase 6. Outstanding IDs: C1058.

## C1059 — What does the opponent want?

Original entry: What does the opponent want?

- **C1059** · 42. Higher-level ideas that tie everything together · **unimplemented**
  Not implemented.

Proposed queue rank 540, phase 5. Outstanding IDs: C1059.

## C1060 — What changed after the last move?

Original entry: What changed after the last move?

- **C1060** · 42. Higher-level ideas that tie everything together · **unimplemented**
  Not implemented.

Proposed queue rank 541, phase 5. Outstanding IDs: C1060.

## C1061 — Are there checks, captures, or threats?

Original entry: Are there checks, captures, or threats?

- **C1061** · 42. Higher-level ideas that tie everything together · **unimplemented**
  Not implemented.

Proposed queue rank 542, phase 5. Outstanding IDs: C1061.

## C1062 — Which pieces are undefended?

Original entry: Which pieces are undefended?

- **C1062** · 42. Higher-level ideas that tie everything together · **unimplemented**
  Not implemented.

Proposed queue rank 543, phase 5. Outstanding IDs: C1062.

## C1063 — Which pieces are badly placed?

Original entry: Which pieces are badly placed?

- **C1063** · 42. Higher-level ideas that tie everything together · **unimplemented**
  Not implemented.

Proposed queue rank 544, phase 5. Outstanding IDs: C1063.

## C1064 — What is my worst piece?

Original entry: What is my worst piece?

- **C1064** · 42. Higher-level ideas that tie everything together · **unimplemented**
  Not implemented.

Proposed queue rank 545, phase 5. Outstanding IDs: C1064.

## C1065 — What is my opponent's best piece?

Original entry: What is my opponent's best piece?

- **C1065** · 42. Higher-level ideas that tie everything together · **unimplemented**
  Not implemented.

Proposed queue rank 546, phase 5. Outstanding IDs: C1065.

## C1066 — Where are the weak squares?

Original entry: Where are the weak squares?

- **C1066** · 42. Higher-level ideas that tie everything together · **unimplemented**
  Not implemented.

Proposed queue rank 547, phase 5. Outstanding IDs: C1066.

## C1067 — Where are the pawn breaks?

Original entry: Where are the pawn breaks?

- **C1067** · 42. Higher-level ideas that tie everything together · **unimplemented**
  Not implemented.

Proposed queue rank 548, phase 5. Outstanding IDs: C1067.

## C1068 — Who benefits from exchanges?

Original entry: Who benefits from exchanges?

- **C1068** · 42. Higher-level ideas that tie everything together · **unimplemented**
  Not implemented.

Proposed queue rank 549, phase 5. Outstanding IDs: C1068.

## C1069 — Who benefits from an open position?

Original entry: Who benefits from an open position?

- **C1069** · 42. Higher-level ideas that tie everything together · **unimplemented**
  Not implemented.

Proposed queue rank 550, phase 5. Outstanding IDs: C1069.

## C1070 — Who benefits from a closed position?

Original entry: Who benefits from a closed position?

- **C1070** · 42. Higher-level ideas that tie everything together · **unimplemented**
  Not implemented.

Proposed queue rank 551, phase 5. Outstanding IDs: C1070.

## C1071 — Whose king is weaker?

Original entry: Whose king is weaker?

- **C1071** · 42. Higher-level ideas that tie everything together · **unimplemented**
  Not implemented.

Proposed queue rank 552, phase 5. Outstanding IDs: C1071.

## C1072 — Who has more space?

Original entry: Who has more space?

- **C1072** · 42. Higher-level ideas that tie everything together · **unimplemented**
  Not implemented.

Proposed queue rank 553, phase 5. Outstanding IDs: C1072.

## C1073 — Who has the initiative?

Original entry: Who has the initiative?

- **C1073** · 42. Higher-level ideas that tie everything together · **unimplemented**
  Not implemented.

Proposed queue rank 554, phase 5. Outstanding IDs: C1073.

## C1074 — What are the long-term weaknesses?

Original entry: What are the long-term weaknesses?

- **C1074** · 42. Higher-level ideas that tie everything together · **unimplemented**
  Not implemented.

Proposed queue rank 555, phase 5. Outstanding IDs: C1074.

## C1075 — What are the temporary advantages?

Original entry: What are the temporary advantages?

- **C1075** · 42. Higher-level ideas that tie everything together · **unimplemented**
  Not implemented.

Proposed queue rank 556, phase 5. Outstanding IDs: C1075.

## C1076 — Can a temporary advantage be converted before it disappears?

Original entry: Can a temporary advantage be converted before it disappears?

- **C1076** · 42. Higher-level ideas that tie everything together · **unimplemented**
  Not implemented.

Proposed queue rank 557, phase 5. Outstanding IDs: C1076.

## C1077 — Can one advantage be transformed into another?

Original entry: Can one advantage be transformed into another?

- **C1077** · 42. Higher-level ideas that tie everything together · **unimplemented**
  Not implemented.

Proposed queue rank 558, phase 5. Outstanding IDs: C1077.

## C1078 — Can counterplay be eliminated before trying to win?

Original entry: Can counterplay be eliminated before trying to win?

- **C1078** · 42. Higher-level ideas that tie everything together · **unimplemented**
  Not implemented.

Proposed queue rank 559, phase 5. Outstanding IDs: C1078.

## C1079 — Can a second weakness be created?

Original entry: Can a second weakness be created?

- **C1079** · 42. Higher-level ideas that tie everything together · **unimplemented**
  Not implemented.

Proposed queue rank 560, phase 5. Outstanding IDs: C1079.

## C1080 — What is the correct moment to change the pawn structure?

Original entry: What is the correct moment to change the pawn structure?

- **C1080** · 42. Higher-level ideas that tie everything together · **unimplemented**
  Not implemented.

Proposed queue rank 561, phase 5. Outstanding IDs: C1080.

## C1081 — What is the correct moment to simplify?

Original entry: What is the correct moment to simplify?

- **C1081** · 42. Higher-level ideas that tie everything together · **unimplemented**
  Not implemented.

Proposed queue rank 562, phase 5. Outstanding IDs: C1081.

## C1082 — What is the correct moment to sacrifice?

Original entry: What is the correct moment to sacrifice?

- **C1082** · 42. Higher-level ideas that tie everything together · **partial**
  Partial: bounded mate certificates verify some sound offers; general timing, necessity and positional criteria remain unresolved.

Proposed queue rank 563, phase 5. Outstanding IDs: C1082.

## C1083 — What is the opponent's strongest defensive resource?

Original entry: What is the opponent's strongest defensive resource?

- **C1083** · 42. Higher-level ideas that tie everything together · **unimplemented**
  Not implemented.

Proposed queue rank 564, phase 5. Outstanding IDs: C1083.

## C1084 — What would I play if it were the opponent's turn?

Original entry: What would I play if it were the opponent's turn?

- **C1084** · 42. Higher-level ideas that tie everything together · **unimplemented**
  Not implemented.

Proposed queue rank 565, phase 5. Outstanding IDs: C1084.

## C1085 — What is the position asking for?

Original entry: What is the position asking for?

- **C1085** · 42. Higher-level ideas that tie everything together · **unimplemented**
  Not implemented.

Proposed queue rank 566, phase 5. Outstanding IDs: C1085.
