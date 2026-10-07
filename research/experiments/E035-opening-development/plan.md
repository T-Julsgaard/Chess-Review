# E035: verified opening development history

Date: 2026-10-07. Research only; no extension integration or game acquisition.

Question: can short opening comments name actual development and repeated
piece moves without inferring strategic benefit from board placement alone?

Require fully legal supplied history beginning at the orthodox initial board
(rank/color reflection is accepted for synthetic symmetry tests). Track each
original minor and queen identity through moves and captures. Limit labels to
the mover's first ten turns. First home departure by an original bishop or
knight to a square off its back rank is development. Checking development also
names tempo as a required check response, without claiming a net tempo gain.
Repeated minor moves require prior moves by that surviving identity and at
least one other unmoved original minor. Early queen movement requires a first
queen departure within eight own turns with fewer than two developed minors.
Completion means four surviving original minors currently off the back rank,
all with prior development; captured pieces cannot count as developed.

Do not label generic loss of tempo, negligence, good squares, initiative or
overall development advantage. FEN-only, partial or unknown history abstains.
Tactical warnings and certificates retain priority. All labels are facts,
at most 24 words, with complete identity/count/history witnesses.

Use authored synthetic move sequences, reflected positives and negatives,
history/refutation/tampering tests and all E020–E034 regression tests. Shared
D001 guarded eligibility receipt precedes fixture loading; no D001 games used.
Independent verifier replays identity history and validates exact witnesses.
Commit plan before decisive evaluation; exposed pilots under research/runs.
After source commit run main, repeat and initially clean local clone; match
normalized input and deterministic output hashes. Retain <3 MB evidence and
exact revision/environment/config/receipt. Source verification required.

Acceptance: every synthetic expectation, independent replay, comment bound,
cumulative tests and reproducibility passes. This does not establish real-game
precision or human benefit. Continue actual five-hour usage monitoring and
checkpoint/disable heartbeat/normal shutdown at about 10% remaining.
