# E050: mating-square clearance and temporary material recovery

2026-10-07. Frozen E049, research only, no cutoff/shutdown/extension/rating/push.
Authored synthetic fixtures only, both colors/file mirrors; original list
unchanged. Source terminology only; no external boards, games or sequences.

Opt-in clearanceRecoveryTags boolean defaultfalse preserves exact E049.
Shared maxClearanceRecoveryNodes integer 0..50000 default50000; exhaustion
discards ALL new tags, retaining parent facts. Comments <=24 words.

Square clearance: actual move vacates own occupied square S, which is empty
afterward. Actual position must be live. Enumerate EVERY legal enemy reply;
each branch must permit an own legal immediate checkmate landing on S, by a
different own unit that existed on its same starting square before the actual
move. Store full reply/mating records and helper identities. Reject draws or
terminal enemy replies. This proves another unit uses a newly vacant square
to mate against all defenses. It does not claim S is the only mating square,
actual move optimal, historical intent or all forms of quiet clearance.
Names Square clearance and Clearance combination. Existing broad Clearance
partial interpretation remains partial; no blanket upgrade by renamed geometry.

Temporary sacrifice: actual nonking, nonpromotion unit is legally capturable
after the move, with positive nominal cost relative to material it captured.
Enumerate EVERY legal enemy capture of that offered unit, including en passant
capturing it off the landing square. Each acceptance must create negative own
material change relative to BEFORE actual move and leave a live position.
For each acceptance find a legal own capture that restores own nominal balance
to at least the before-move level, both immediately and through EVERY legal
enemy response. Reject draws or own checkmate in any response. Store all
acceptance, recovery and response records, initial balance, negative accepted
gain, minimum recovered gain and finite three-ply horizon after actual move.
Wording explicitly says "if"; declines are not forced or assigned a result.
qualityClaim false; no permanent gain/optimal-play/general move-quality claim.
Name Temporary sacrifice within this near-immediate conditional recovery scope.

Independent replayer imports no detector/helpers, reconstructs legal history,
canonical counters and terminal guards, exact all-defense and all-acceptance
sets, original unit identity and mating destination, all final responses and
p1/n3/b3/r5/q9 material. Retain tamper refusals and meaningful negatives.

Cases: knight/bishop vacancies, true all-reply mates on the vacated square,
other mating squares only, available escape/refutation, missing helper,
mate already played, draw/terminal reply; rook/queen/bishop/knight/pawn offers,
en passant acceptance, equal/more material recovered, missing recovery unit,
insufficient recovery, another unit recaptures recovery unit and refutes,
conditional draws, no acceptance, ordinary equal exchanges, malformed settings,
disabled/exhausted limits, full history mismatch, tampered proof rows/identities/
reply sets/material/horizon. No external fixture moves imported.

Commit plan before smoke, log exposed corrections, source before main.
Guard D001 test receipt before fixtures. Cumulative E020–E050 tests, source/diff
checks; main/repeat/initially clean local clone must match exact revision,
normalized inputs, deterministic outputs and metrics. Independently replay
saved JSON positives and negatives, unchanged inherited full fingerprints.
Retain full new proofs <3 MB; estimated ~140 seconds per run, overlap three.
Synthetic mechanics only; real-game explanation precision and learning benefit
remain unmeasured.

Exposed smoke: a queen on d4 already checked the nonmoving h8 king; relocate
that king for queen-offer cases. The first bishop-draw negative also allowed
a different capture recovering material without a draw; changed the offered
square/accepting bishop so all apparent restoration captures genuinely draw
or fail. In the rook-refutation negative the recovery bishop initially could
not legally move because it exposed its own king; relocate the own king to
exercise the intended legal enemy recapture instead. A defense capturing the
square-clearance helper refutes that mate claim, but the same setup genuinely
has a different conditional temporary-sacrifice recovery. Retain that positive
tag while suppressing square clearance; do not conflate independent concepts.
All corrections precede main; proof gates unchanged. Add a two-acceptor case
and prove both capture branches, retaining an omitted-branch tamper refusal.
