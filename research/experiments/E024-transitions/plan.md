# E024: material transitions, verified recaptures and placement vocabulary

Registered 2026-10-07 before evaluation. Research only; import frozen E023.
Add concise explanations of material structure and actual recapture history,
not recommendations based solely on material or placement. No real games used.

## Candidate definitions

Classify pure post-move material endings (kings excluded): king+pawn versus
king, rook+pawn versus rook, bishop+pawn versus bishop, knight+pawn versus
knight, queen versus rook/minor/rook+pawn/advanced pawn, rook+bishop versus rook,
rook+knight versus rook, two opposite-color bishops versus knight, rook versus
connected or passed pawns, knight versus connected passers. Require exact piece
counts, including exactly one pawn for singular pawn formulations; allow either
orientation. Advanced pawn means relative sixth/seventh rank. No outcome claim.
Only comment when signature changes or on meaningful movement of a qualifying
pawn; no repeated material label after an unrelated king move.

Pawn-ending transition means a non-pawn capture leaves only kings and pawns;
general endgame transition means change to one of the exact pure ending classes
or single-type rook/bishop/knight/queen endings. Pawn-less dead endings retain
existing draw priority. Rook trade into pawn ending additionally needs history.

Optional `history:{fen,moves}` contains an explicitly supplied starting FEN and
legal UCI moves; replay must exactly equal input FEN including counters/rights.
Reject illegal, terminal, mismatch or >1,000-ply history, never silently ignore.
History is synthetic authored source in fixtures, not imported games. A trade
requires the immediately preceding capture and played legal recapture of that
same capturing piece on its destination (including en-passant removed-square
handling). Label queen/rook/minor trades when both removed pieces qualify;
equal/unequal compares fixed 1/3/3/5/9 values, not strategic value. "The exchange"
means this actual rook/minor swap, not intentional sacrifice. Exact before/after
material deltas and verified history are inspectable. No history = no trade
assertion. Promotion/terminal-history semantics must be explicit.

Placement facts: new queen on d4/e4/d5/e5; rook advances to relative third/fourth
rank (lift preparation subset, not later swing intent); rook horizontal move on
those ranks (lift geometry); queen behind own/enemy passer with unobstructed
file; queen gives check after a passer advances or promotes (actual check only).
Knight pawn-supported outpost geometry: knight arrives on c–f relative ranks
4–6, supported by own pawn, and no enemy pawn ahead on either neighboring file.
No permanence, quality or immunity after pawn exchanges promised. Outpost stays
partial. Bishop outside pawn chain strategic interpretation stays deferred.

## Evidence and gates

Guard input-loading runners/tests with D001 eligibility before dynamic authored
fixtures; no data sample used. Every fixture also rank/color reflected, including
its history replay. Verify positive/negative labels, <=24-word selected comments,
exact endgame counts and history arithmetic through separate test calculations.
Reject mismatched history, non-recapture captures, extra pieces/pawns, blocked
queen files, pawn-challenge outposts and old placements. Retain earlier tactical
certificates/replay and expected negative controls without changing frozen code.

Node 24, chess.js only, no engine/seed/tuning. Exposed development fixtures, not
held-out usefulness evaluation. Repeated and clean-source deterministic outputs
must match. Retain exact source revision/hashes, commands, receipt, environment,
timing and results. Estimate <=30 seconds and <=5 MB compact retained artifacts;
full inherited case details may be referenced by frozen evidence rather than
duplicated. Targeted tests and source integrity before local commits. Log fixes.

Live allowance monitor continues. At 10% remaining in the 300-minute window,
checkpoint/commit, disable heartbeat, normal `shutdown.exe /s /t 0` without `/f`.
No extension integration, pushes or numerical goal restart.
