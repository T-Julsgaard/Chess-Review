# E032: history-grounded draw and irreversible-move facts

Registered 2026-10-07 before evaluation. Import frozen E031; research only,
authored synthetic fixtures, no engine or source game positions.

Repetition requires verified history and exact position keys: placement, side
to move, castling rights and legally available en-passant square. Ignore move
counters. Replay all supplied moves plus the played move; retain matching ply
indices and complete position-key trail. At a third occurrence say a draw can
be claimed by the side now to move, never that a draw was awarded. No forced
perpetual-check claim from a merely observed cycle. FEN-only repetition abstains.

A fifty-move claim label requires verified history covering at least 100 plies
since the last pawn move/capture, with zero initial halfmove counter if no
reset appears. Require current halfmove count consistent with the replay and
>=100. FEN-only threshold stays an inherited partial fact, not a verified
history claim. Checkmate, stalemate and insufficient material take precedence.
Actual drawn-position label is limited to legal stalemate or conservative
insufficient mating material, with explicit reason/piece witness. Do not infer
generic drawn evaluations, dead blocked structures or adjudication.

Irreversible-move label requires actual pawn move/capture or lost castling
rights, retain before/after rights/counters and concrete reason. No king-safety
or move-quality judgment. Resetting fifty-move count is stated as a fact only.
Comments <=24 words; actual terminal mates and warnings keep priority as
appropriate. Conservative insufficient-material classification is independently
checked for bare kings, lone minor, or all bishops on the same square color.

Authored third/twofold/no-history, legal/unavailable en-passant and castling
rights distinctions; full 100-ply quiet history versus counter-only, resetting
pawn/capture, and mate at clock boundary. Include actual stalemate/dead material
and nondead near misses; rank/color reflect. Independent replay recomputes
position trail, legal-EP key, occurrence indices, quiet suffix, material class
and irreversible changes. Tamper witnesses and require refusal. History guards
stay unchanged: don't progress past library terminal conditions, so fivefold
and 75-move continuation are outside this candidate.

Guard D001 before dynamic fixtures; normalized hashes, committed source,
receipt, command/config/environment/timing. Pilot cumulative estimate <=180 sec
and <=3 MB evidence. Targeted cumulative tests and source check; repeat and
initially clean task-owned local checkout match deterministic source/output
hashes. Record exposed failures; no human or real-game precision claim.

Coach expansion and live five-hour cutoff active; at about 10% remaining
checkpoint/commit, disable heartbeat and authorized normal shutdown without /f.
Numerical research paused; no extension integration or push.

## Exposed development notes

An initial bare-kings fixture tried to capture a lone knight from an already
dead position, and a same-color-bishop fixture also started dead; inherited
terminal guards correctly refused both. Capturing a last pawn reaches bare
kings legally, and removing a pawn reaches the same-color-bishop subset.
A bishop near-miss initially checked the moving king along its diagonal, so
its proposed move was illegal; a different opposite-color square supplies a
legal control. A rights-loss setup accidentally checked the nonmoving king
with its rook; moving that king to e8 makes the legal rights witness explicit.
The authored quiet walk uses a deterministic seed solely for synthetic move
choice, rejecting repeated/terminal positions; all 100 plies are retained.
