# E027: short defensive resources with counterfactual witnesses

Registered 2026-10-07 before evaluation. Import frozen E026. Research only;
authored synthetic positions, no engine, seed or real-game sample.

## Candidate

Saving/defending a non-pawn piece: before the played move, when mover is NOT
in check, change the side to the opponent and clear en-passant. This explicitly
hypothetical board identifies a legal capture of an original own N/B/R/Q with
positive nominal opponent gain after EVERY immediate mover response. Reject
draw and opponent-mated response branches. After the actual move the same
piece must survive (mapped from/to if moved). EVERY legal opponent capture of
that piece must allow at least one immediate legal mover reply leaving opponent
gain <=0 versus AFTER the played move. A capturing mate, draw or no legal
response fails; zero legal captures passes. Retain full old all-response and
new all-capture/existential-reply witnesses. This is immediate material loss
prevention for one piece, not overall move quality or all-future safety.

Name defense, saving/defending pieces, defensive pawn move, and eliminating
attacking pieces only under that proof and actual corresponding move identity.
Active defense additionally requires actual check or capture. Do not infer
intent, optimality, passive defense or lasting initiative. Selected text <=24
words and names the defended piece/square and immediate scope.

Interposition: legal check evasion places the mover strictly between a checking
enemy slider and own king, removing that direct attack. King escape requires
actual king move out of check. Blocking/closing files/diagonals additionally
names an actual previously clear slider attack line to a surviving own piece
that the played move blocks; geometric scope only, no generic quality claim.

Escape-square geometry: a noncapturing own pawn move makes its old square a
new legal noncapturing king step, with king unmoved on its home rank. Both
kings must be free of check when constructing hypothetical same-side king moves.
Geometry alone remains partial for creating escape squares/luft. Strong luft
requires a BEFORE hypothetical opponent rook/queen back-rank checkmate witness
(actual mate, own king home rank, checking slider on same home rank) and ZERO
actual opponent mate-in-one moves AFTER the pawn move. Retain exhaustive mate
scan and old/new king-step sets. No statement about longer king safety.

E027 shared finite/scan budget <=50,000; exhausted scan drops all E027 finite
and escape-square claims while retaining directly replayable line/king facts.
Verified input history is replayed for actual after-board scans; FEN-only input
cannot establish earlier repetitions. Parents retain frozen limitations.

## Gates

Guard D001 before dynamic fixtures. Author positive/negative cases and rank/color
reflections: relocation, added legal recapture, captured attacker, another
profitable attacker, pinned recapturer, counter-mate, check input, unchanged
threat, blocked versus defended escape square, old escape, remaining mate,
file/diagonal blocks, noncheck, adjacent unblockable check, budget exhaustion.
Independent legal replay enumerates old response and new capture/mate sets,
geometry and material; tampered targets, baselines, gains and incomplete or
duplicate witness sets fail. Run all earlier tests/certificates and source
verification. Retain full new cases, inherited fingerprints, source/receipt/
environment/config/time hashes, exact repeat and initially clean checkout.
Estimate <=30 seconds, <=3 MB evidence. Log exposed implementation amendments.

Keep coach goal active, numerical research paused, no extension integration or
push. Monitor actual 300-minute usage. Near 10% remaining checkpoint/commit,
disable cutoff heartbeat and execute the authorized normal shutdown without /f.

Implementation notes, 2026-10-07: existing frozen interposition events are kept;
new named-line witnesses use `line-interposition` to avoid mixing evidence schemas.
Specific E026 relative/cross-pin and defender-removal labels outrank general
defense labels while mate/draw/warnings retain priority, with selected-label
regressions. Initial rook examples protected by their adjacent king correctly
failed the old profitable-threat gate; a distinct unprotected-king arrangement
supplies positive cases and the original is retained as a negative. A rook on
the escape file was blocked by the advanced pawn and did not invalidate the
new king step; the attacked-square negative uses an unblocked bishop diagonal.
