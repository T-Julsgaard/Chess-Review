# E053: legal cross-checks and exact check-evasion certificates

2026-10-07. Frozen E052, research only. Cutoff/shutdown cancelled. No extension,
rating edits or push. Original 1085-entry list unchanged. Authored synthetic
positions/mirrors only; source definitions, no external boards or sequences.

Opt-in crossCheckTags defaultfalse exact parent; maxCrossCheckNodes integer
0..50000 default50000 shared budget, exhaustion drops ALL new tags. <=24-word
comments, qualityClaim false. Label the objectively verifiable fact of legally
answering a check with a check, not a positional advantage or best-move claim.
Existing stronger mating/defensive facts retain selection priority.

Before: live, own king in check, exact geometrical checking units recorded.
Actual move is fully legal and leaves own king unattacked, enemy king checked.
Record every before checking unit and after checking unit identity. Classify
interposition on a correctly typed clear checking ray (including discovered
and double counterchecks), actual capture of a checking unit (including EP
captured square), or king escape uncovering check. Actual mating countercheck
is allowed; no other terminal state. A checking answer outside those mechanisms
must have its own explicit classification or be refused, never mislabelled.

Each original checking ray retains ALL intermediate squares, the actual
blocked square, and exact before and after occupancies. Countercheckers direct
vs discovered are distinguished, with full actual move and king records.
Retain EVERY legal enemy check evasion and resulting FEN, identities, actual
nominal material change relative to before, and terminal status. Confirm each
evasion leaves their king safe. This is a complete legal-evasion certificate,
not a forced gain or game-result proof. Actual mate has no evasions and must
replay actual checkmate. Strict full-history/counter/terminal guards apply.

Independent replay imports no detector/arithmetic helpers. Reconstruct exact
before/after checker sets, typed rays, EP capture square, mechanism, direct vs
discovered, all evasions/material/canonical FENs, and exact short text. Reject
ordinary checks without before check, ordinary evasions without countercheck,
illegal continued own check/double-check interposition, already drawn roots,
drawn checking moves, malformed/exhausted flags, tampered sets/history/text.
Exercise R/B/Q checking rays, N/B/R/Q/P interpositions, discovered/double
counterchecks, checker captures, king discovery, promotions and EP when legal.

Commit plan before smoke/source before decisive evaluation. D001 test guarded
receipt before fixture imports. Cumulative E020–E053 tests/source/diff checks.
Main/repeat/initially clean clone exact source, normalized inputs, deterministic
outputs/metrics; saved independent JSON replay and frozen ordered E052 hashes.
Full new certificates below 3 MB. Estimate ~150 seconds per full run; three
overlap. Synthetic mechanics only; real-game precision/human utility unmeasured.

## Exposed smoke corrections

The first checker-capture fixture placed the enemy king off the resulting
bishop ray, so it was an ordinary evasion rather than a cross-check. Moving
the king to b8 made Ba7 a checking capture, but K+B versus K then triggered the
strict draw refusal. Retaining an authored black h7 pawn gives the intended
live checking-capture example. Removing the checking rook from the initial
negative left an already dead K+N versus K root; a black a7 pawn retains a live
ordinary-check negative. No legality or terminal guard was weakened.

The frozen E047 file mirror discards en-passant rights. Mirrored e5xd6 EP was
therefore illegal. A local E053 wrapper reflects the EP file explicitly;
frozen mirrors/runtimes remain unchanged. Rank/color reflection already
preserves the valid rights. Full-history checking-rook cases and illegal
double-check interpositions were added before decisive evaluation. The latter
are refused moves, never attributed an explanation.

Meaningful negative evidence includes legal Re8xe4 capturing the cross-checking
knight: the neutral term is a verified legal mechanism, not a claim that every
cross-check is sound as a strategy. Existing stronger warnings retain priority.

Before source commit, add a clock-boundary mating fixture starting at 99
halfmoves. chess.js reports both isDraw() and isCheckmate() after this quiet
mate. Explicit mate takes precedence (US Chess 13A); ordinary checking moves
at that boundary remain excluded. Detector and independent replay use the
same rule separately. The exposed 96-case pilot predates this four-case
addition; final targeted/cumulative checks and decisive runs use 100 new cases.

Initial decisive runs at c7f1c28 matched and saved replay passed, but the
retention gate failed: 3,090,979 bytes exceeded the preregistered 3 MB limit.
Most duplication was complete certificates serialized again in demo cards.
A local display adapter retains all teaching comments, boards and summary
highlights, links canonical results.json, and omits duplicate bulk evidence.
Full results/certificates remain unchanged. Test the display contract and
rerun source/cumulative and main/repeat/clean checks at a new source revision;
the original matched runs remain exposed development observations.
