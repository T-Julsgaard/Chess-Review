# E052: maximum unit capture before finite unavoidable quiet loss

2026-10-07. Frozen E051, research only. Cutoff/shutdown cancelled, no extension,
rating edits or push. Authored synthetic cases/color/file mirrors only; no
external games, boards, FENs or sequences. Original list unchanged.

Opt-in desperadoTags boolean defaultfalse preserves exact parent. Shared
maxDesperadoNodes integer 0..50000 default50000; exhaustion drops ALL new tags,
retains parent facts. <=24-word comments, qualityClaim false.

Actual mover is own N/B/R/Q, geometrically attacked before the move, and legally
captures an enemy nonking worth >0 and <= its own nominal value. Require its
captured value equal the MAXIMUM captured value among ALL original legal
captures by that unit (ties allowed). No claim of best overall move.

Enumerate EVERY legal own NONCAPTURING alternative move, by ANY own unit, not
only the threatened one. At least one such alternative required. Track the
same threatened unit at its new square if it moves, including castling-rook
relocation; otherwise at its original square. Each alternative must leave a
live position permitting a legal enemy capture of that same unit. Immediately
and through EVERY legal own response, own material change relative to BEFORE
actual move must be <= minus the unit's value. Refuse drawn capture branches
and terminal own response lines. Enemy capture checkmating the player is an
explicit terminal loss witness with no responses, not an invented escape.
Store all original alternative moves, legal loss capture/response records,
unit identities, terminal status and greatest gain on the loss branch.

After actual capture enumerate EVERY legal enemy capture of that actual moved
unit. At least one required. Each must leave a live position with nominal own
change = captured value minus unit value. Retain EVERY legal own response:
each must leave at least that balance, with no terminal draw/mate response.
Store full records, accepted gain, actual minimum and before balance. This
verifies the specific conditional recapture benefit of taking material first;
other enemy replies/other own captures are not forced or assigned an outcome.
Quiet comparison horizon: alternative/enemy-unit-capture/own-response (3 plies).
Actual horizon: played capture/enemy-unit-capture/own-response (3 plies).
Wording: "Desperado ...: capturing first gains X before recapture; every quiet
alternative loses at least Y." No lasting gain, game result, intent or universal
doomed-unit assertion beyond the explicit alternatives/horizon.
Names Desperado and Desperado combination within this precise finite scope.

Independent replay imports no detector/arithmetic helpers, reconstructs legal
history/full canonical counters/terminal guards, original legal max captures,
exact ALL quiet alternatives and actual recaptures, unit relocation/identity,
complete ALL own response sets, terminal loss and nominal p1/n3/b3/r5/q9 values.

Cases knight pawn salvage, corner queen/rook/bishop captures, equal exchange
restoration and maximal own-unit capture; a safe quiet retreat or king defense,
own response recaptures/recovers material, missing initial attack, lower-value
capture when a larger unit capture exists, no noncapture alternatives, missing
actual acceptance, actual terminal/drawn branch, disabled/exhausted/malformed
limits, tampered move sets/identities/loss maxima/gains/baseline/horizon/history.
Retain meaningful legal negative lines and exposed authoring corrections.

Commit plan before smoke, source before main. Guard D001 test receipt before
fixture import. Cumulative E020–E052 tests/source/diff; main/repeat/initially
clean local clone match source revision, normalized inputs, deterministic
outputs and metrics. Saved JSON independent replay, unchanged inherited full
fingerprints and original-list hash. Full new proofs <3 MB; estimated ~160
seconds per full run, overlap three. Synthetic mechanics only; real-game
precision/human benefit unmeasured. No new engine or registered game analysis.
