# E104 exposure

2026-10-09: current filtered catalog and E085/E095 scopes inspected. E095 already
proves only-resource for positive own mate/draw; new full alternative matrix
adds complete finite mate avoidance, not duplicated labels or global safety.
E029 accepted legal minimax and independent full query replay reused unchanged.
No game data, engine or tablebase acquisition.

Initial back-rank board omitted f2 pawn, so all root choices had finite avoidance;
retain no-exposure observation. Adding actual f2 blocker creates losing rook
alternatives while multiple pawn/rook defenses remain: no only-defense label.
Initial h-file rook check had one legal escape and no losing alternative; retain
negative because unique legal move is not a compared mate defense. New authored
checked Kh1/Rf2 versus Ke4/Qh8/Rf8/Bg3/Bc4 has three legal moves; Kg1 uniquely
avoids mate, Kg2 and Rh2 permit mate. Same matrix holds at1 and3plies, with known
full check history and near-fifty clock. All26 reflected semantic replays passed.
