# E051: all-reply material interference combinations

2026-10-07. Frozen E050, research only. Cutoff/shutdown cancelled. No extension,
rating changes or push. Authored synthetic fixtures only, both colors and file
mirrors; no source boards, FENs, games or sequences. Original list unchanged.

Opt-in interferenceTags boolean defaultfalse preserves exact E050. Shared
maxInterferenceNodes integer 0..50000 default50000; exhaustion drops ALL new
tags, retains parent facts. Comments <=24 words, qualityClaim false.

Before actual move enemy R/B/Q D has a clear, correctly typed geometric ray to
enemy nonking target T. An own existing unit A can legally capture T, and D can
legally recapture A there with own net nominal gain <=0 relative to BEFORE
actual move. Store both full move records as a concrete defending duty.
Actual move lands on an EMPTY intermediate square S of that ray, interrupting
the connection while retaining D/T/A identities. Actual position must be live.

For EVERY legal enemy reply, require D/T/A identities persist, S remains
occupied and the D-to-T ray still blocked. A legally captures T. Immediate own
net material gain relative to BEFORE actual move must be >0, and EVERY legal
next enemy response must preserve >0 gain. Reject draw terminals and own mate
against the player in final responses. Own mate after capture allowed but
still requires positive nominal material. Store complete sets, records, gains,
minimum and finite three-ply horizon after actual move.

Additionally after each A capture, remove ONLY the occupant of S in an
explicitly counterfactual board. D must then have a legal recapture onto T.
Retain removed piece, counterfactual FEN and full hypothetical recapture
record. This tests that interposition actually prevents a formerly real duty,
not that geometric alignment happens to coexist with some unrelated win.
Counterfactual removal is hypothetical, never a legal played move.

Independent replay reconstructs full history/canonical counters/terminal guards,
typed ray and empty original intermediate squares, both legal defensive-duty
moves, exact ALL enemy replies, identities and obstruction, capture, complete
ALL final responses and p1/n3/b3/r5/q9 material. It independently reconstructs
single-unit counterfactual removal and legal D recapture, without detector or
proof/arithmetic-helper imports. Scope: Interference combination, and a stronger
additional Interference witness alongside its frozen geometry-only scope.
No optimal-play, permanent gain, unique move or player-intention claim.

Cases: rook/queen file or rank defense, bishop/queen diagonal defense, forcing
interposition and typed-ray witness; missing/blocked original duty, pinned or
otherwise illegal defensive recapture, wrong line geometry, irrelevant move,
target escape/other reply refutation, another defender removing gain, net loss
including sacrificed interposer, illegal follow-up, disabled/exhausted and
malformed settings, tampered rays/roles/before duties/allreply and final-response
sets/counterfactual boards/gains/horizon/history. Retain legal negative lines.

Commit plan before smoke, log exposures, source before main. Guard D001 test
receipt before fixture import. Cumulative E020–E051 tests/source/diff checks;
main/repeat/initially clean local clone match exact revision, normalized input
hashes, deterministic output hashes and metrics. Separate saved JSON positive/
negative replay, unchanged inherited fingerprints and original-list hash.
Retain full new certificates <3 MB. Estimate ~140 seconds per full run, overlap
three runs. Synthetic mechanics; real-game precision/human benefit unmeasured.
