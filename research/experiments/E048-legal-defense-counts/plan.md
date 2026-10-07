# E048: legal capture counts and conditional x-ray defense

2026-10-07. Research only; no cutoff, shutdown, extension edits or push.
Frozen E047 baseline. Authored synthetic cases, both colors/file mirrors.
Source definitions only; no imported games, boards, FENs or move sequences.

Question: can concise comments count actual legal capture/recapture options,
explain why an apparently defending piece cannot recapture, and demonstrate
x-ray defense through actual conditional recapture sequences?

Opt-in defenseCountTags boolean defaults false, exact parent preserved.
maxDefenseCountNodes integer 0..50000 default50000 shared; on exhaustion drop
ALL new events, keep parent facts. Terminal actual positions excluded. <=24
words. No engine search, intention, forced acceptance or material-win claim.

For each own nonking target after the actual move enumerate EVERY opponent
legal capture onto it (en passant included when its captured pawn is the
target). Each capture stores full move/SAN/after and ALL legal immediate own
recaptures on its landing square, unless the branch is terminal. Counts use
distinct starting pieces, not promotion alternatives as extra attackers.
Geometric defender lists are separately named; legal recapture sets are
branch-specific and must not be represented as a universal static count.
Emit one count event per threatened target; choose a deterministic capture
with fewest legal recapturing pieces as the short example, keeping all branches.

Pinned-recapture event requires a geometric own defender excluded from one
legal recapture branch; simulate its geometric capture without changing turn
and show its own king attacked. Never infer a pin solely from absence in the
legal move list. Restrict this explanation to N/B/R/Q normal capture geometry;
king danger, pawn promotion/en passant and terminal branches stay out of this
specific pin explanation. Store counterfactual board and king attackers.

X-ray defense requires an own R/B/Q ray to the own target with EXACTLY ONE
intermediate blocker, an own unit. After an opponent target capture, that
blocker legally recaptures onto the target, opening the ray. An opponent then
legally captures that recapturer on the same target, and the original slider
legally recaptures there. Store all four full move records, original ray and
blocker. This is a conditional legal defense sequence, not a forced line or a
claim that exchanges are good. Upgrade the existing alignment-only partial
concept only within this concrete played-branch scope.

Independent replay re-enumerates exact legal capture/recapture sets, full
canonical histories and terminal guards, counts distinct pieces, reconstructs
illegal-capture king exposure and the entire x-ray line. No detector imports.
Negatives: geometric but pinned attacker; pinned defender; checking captures
with unrelated apparent defenders; discovered defender after capture; legal
king recapture vs attacked king recapture; en passant landing-square mismatch;
promotion choices count once; blocked ray/two blockers/wrong slider/king-exposing
slider recapture; nonforcing branches; history mismatch/terminal continuation;
disabled/exhausted/malformed budgets and tampered sets/counts/boards/sequence.

Commit plan before smoke; retain exposed corrections. Guard D001 test receipt
before fixture imports. Cumulative E020–E048 tests and source checks, main,
repeat and initially clean local checkout must match revision, normalized input
hashes, output hashes and metrics. Independent saved JSON replay, unchanged
inherited fingerprints, original 1085 IDs unchanged, full new evidence <3 MB.
Expected ~100 seconds each full run, overlap three runs. Synthetic mechanics
only: real-game precision and human benefit remain unmeasured.
