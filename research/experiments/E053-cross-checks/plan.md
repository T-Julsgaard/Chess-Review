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
