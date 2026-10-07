# E075: board, legal-input and nominal-material foundations

Preregistered 2026-10-08 before implementation or decisive testing. Approved
ACTIVE-QUEUE ranks 1–8: C0001 board coordinates, C0002 piece movement, C0016
legal move, C0017 illegal move, C0020 material inventory, C0030 material balance,
C0031 material imbalance and C0547 material in position evaluation. E074 frozen
baseline has 4,420 ordered results. Duplicate audit finds no mixed verified/
pending exact group to discharge by reuse. Original scope and occurrence IDs stay.

Reuse chess.js legal moves, E020 legalPosition/UCI/material constants and E074
coach output. No new chess rule engine, numeric evaluator or production input
path. All fixtures are authored synthetic, admitted through D001 test guard.
Every test, runner and independent input probe calls openResearchData first.

## Registered behavior and separate claims

`foundationTags` is boolean false by default: disabled explainMove is exact
E074, including illegal-move exceptions. Enabled `explainAttempt` is a separate
research user-input route; enabled explainMove may delegate to it. It validates
strict UCI (including promotion suffix), legal root and recorded history. Bad
syntax/invalid roots throw instead of being called illegal chess moves. Terminal
roots return unavailable with no legal/illegal promise or new events. A legal
move in a live root is accepted even if its result is terminal. No move-quality
claim, best move, mental state or instructional effectiveness inference.

1. Coordinates: exact origin/destination file, rank and square names, including
   both colors and all edges. No relative-color relabeling of absolute squares.
2. Piece movement: the actual legal move's piece and displacement, capture,
   promotion, en passant and castling king/rook transitions. Full legal set from
   the root is evidence, not a geometric pseudo-legal substitute. Distinguish
   special pawn/king movement explicitly. No generic geometry when it misstates
   the actual special move; all six types need independent authored cases.
3. Legal/illegal input: strict UCI membership in the complete sorted live-root
   legal set. Save all legal destinations from the proposed origin. A missing
   move produces a short refusal and up to three legal examples with explicit
   truncation wording. Empty/enemy origins and zero alternatives get accurate
   wording. Do not invent why a move is illegal from failed membership alone.
   Pinned moves, check evasions, blocked sliders, pawn direction/double push,
   castling through attack/rights and promotion requirements get negative cases.
4. Material: complete square/type/color inventories and per-type counts before
   and after, including kings; declared nominal values P1/N3/B3/R5/Q9/K0 reused
   from E020. Save own/enemy totals and balance from the actual actor's viewpoint.
   Capture and promotion inventory deltas must handle off-destination EP victims,
   underpromotions and castling. Kings' zero arithmetic value never implies they
   are expendable. Piece combinations compare full count vectors, not merely
   score equality: bishop versus knight can have equal points and unequal armies.
   C0020 can gain inventory mechanics. C0030/C0031 describe explicit nominal
   comparison/count-vector scope, with positional value unresolved. C0547 stays
   partial because inventory alone does not complete material's evaluation role.
   No by-name discharge of other original material occurrences.

All comments <=24 words and qualityClaim false. Low beginner-descriptor priorities
below E074 structure annotations and urgent tactics. Prefer material changes to
generic movement/coordinates when parent has no higher comment; an unchanged
material balance can be requested as a descriptor event without quality advice.
Illegal attempts select their refusal and never fabricate a played after-position.
No implicit enabling of old study flags. History root/legal sequence must agree
with input FEN; preserve repetition/clock terminal state.

Shared `maxFoundationNodes` integer 0..50000 counts legal-set query, inventory
snapshots and per-event proof construction. Atomic exhaustion discards all new
events; accepted moves keep parent events/comment, illegal attempts abstain rather
than pretending acceptance. Record nodes/status; test exact boundary and one less.

## Evidence, negative gates and reproduction

Save full validated history, input/actor/UCI, complete legal moves, coordinates,
accepted/rejected/unavailable state, move/after for acceptance only, inventories,
declared values, nominal balance and unequal count vectors; every claim's text.
Independent replay imports no detector helpers/constants. Reconstruct inventory
by FEN expansion rather than detector board traversal, use separate literal value
arithmetic, replay full history, regenerate exact legal membership/special move
records and assert the actor's king is safe after acceptance. Tampered legal sets,
coordinate labels, status, history, capture square, inventory/count/value/balance,
castling/promotion fields, text and quality flags must fail replay.

Separate gates per claim: both colors, board edges, all piece types, captures,
castling both sides/colors, all promotion types including capture promotion,
legal/illegal EP and pinned EP, in-check escapes versus unresolved check, empty/
enemy origin, blocked slider, own capture, missing/extra promotion, no legal
alternatives, actual check/mate/stalemate/dead draw, root terminal (including
history repetition), malformed inputs/options, valid/invalid history, unchanged
inventory, equal nominal/unequal armies, unequal nominal and capture score delta.
Disabled exact E074 and atomic budget gates are mandatory. Preserve urgent warning
selection on overlapping cases, independently checked in saved outputs.

Cheap pilot, then focused checks; retain failures/exposures. Full cumulative coach
suite, source verification and diff checks before source freeze. Main/repeat/
initially clean detached runs require exact revision/input/physical output hashes
and metrics. Independently replay saved proofs and compare all 4,420 inherited
ordered full-result fingerprints plus original-list hash unchanged. No selective
proof pruning or relaxed legality gates. Estimate 250–300 seconds per full run,
three overlapping reproductions; prospective canonical evidence budget 20MB.
Audit each accepted claim separately before updating occurrence-specific tracker
scope. Research status remains E074 until all final gates pass. Synthetic exposed
mechanics are not precision on real games or teaching-usefulness validation.

Keep stable existing isolated/verification checkouts and local commits. Import
completed research only under AGENTS clean fast-forward safeguards; never push.
Numerical research remains paused; cutoff/shutdown/automations remain cancelled.
No replacement goal, automation, extension implementation or new branch.
