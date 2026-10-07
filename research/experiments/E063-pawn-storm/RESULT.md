# E063: history-confirmed connected pawn storms

2026-10-07. Research only; numerical work paused, usage cutoff/shutdown cancelled.
Original list unchanged. No extension integration, acquired games or pushes.

Opt-in pawnStormTags identifies two distinct adjacent advanced pawns moving
toward an enemy king on consecutive own turns after its recorded legal castle.
The king must still occupy that castle destination; both pawn advances remain
on the corresponding flank and decrease their rank distance to the king.
Both pawns must still be present, advanced at least to their own fourth rank,
and adjacent in file with at most one rank separating them. This is a concrete
current sequence, not inferred attacking intent, safety, advantage or success.
Default-disabled behavior equals frozen E062; shared budget exhaustion removes
all new events while preserving parent facts and selected comments.

Example: “Pawn storm: g 5 and h 5 advanced distinct pawns toward their castled
king on g 8; both now occupy that flank.”

Full evidence retains legal history, castle/advance records and indices,
distinct pawn identities, king context, connection and rank distances, plus
every actual enemy reply with terminal and both pawn-presence flags.
Independent replay imports no detector helpers and reconstructs the complete
history, chronology, geometry, all reply records and exact short text.
Explicit standard kingside/queenside counterparts avoid invalid geometric
reflection of the king's e-file and castling rights; both colors tested.

EXPOSURE.md records authored fixture and counter-tamper corrections before
source freeze, plus the added double-step en passant regression. No detector
or priority relaxation. Same-pawn repetition, missing/incorrect history,
pre-castle advances, relocated king, missing prior pawn, disconnected/early
pawns, wrong flank, promotion and actual terminal moves do not qualify.
Legal pawn-loss and enemy mating replies remain in the evidence while urgent
warnings take selection priority. En passant removes the pawn off its landing
square, independently checked on both flanks/colors.

All 108 new tests and 3,047 cumulative E020–E063 tests pass. Maintained source
verification and diff checks pass. Full run: 2,800 cases, 2,678 with facts,
80 abstentions and 42 refused illegal moves; selected comments at most 20 words.
Cumulative independent replay: 5,339 certificates, 288 queries, 17,403 reply
or history edges and 39,500 replay leaves. New classification uses 1,072 bounded
nodes; inherited trap checks 612 on new cases. No engine search/numerical fitting.

Main, repeat and initially clean clone use exact source 76c1494 and match
normalized input hashes, physical output hashes and metrics;189–198 seconds.
Saved JSON independently reconstructs 32 new certificates on 32 positive rows,
with 64 legal negative rows and four refused illegal moves. Evidence retains
668 replies,100 history plies,64 advance references,16 pawn-loss replies,
14 terminal replies and four en passant captures. All 2,700 inherited full-result
fingerprints match E062 in order; original-list hash unchanged.

Full evidence 3,382,869 bytes, within the prospective 5MB budget; all proofs
retained with frozen E053 compact display. Coverage 288 verified names /
330 original occurrences;76 partial and 679 unimplemented occurrences. Only
Pawn storm's concrete recorded sequence is newly marked verified. Human
teaching benefit, real-game precision and extension readiness remain unknown.

[Demo](evidence/demo.html), [tracker](evidence/concept-status.md),
[results](evidence/results.json), [main](evidence/run.json),
[repeat](evidence/repeat-run.json), [clean](evidence/clean-run.json).
Reproduce: `node research/experiments/E063-pawn-storm/code/run.mjs --out research/runs/E063/reproduction`.
Guarded D001 test receipts retained. Continue in the isolated checkout while
other activity owns the shared checkout.

Next: investigate Blocked position through complete legal pawn mobility on
both sides of an actual newly completed pawn wall. Require next-turn evidence
against every legal enemy reply and explicit refutations for captures,
promotions, en passant and terminal replies. Do not infer permanent blockage,
fortress or positional advantage from the finite mobility claim.
