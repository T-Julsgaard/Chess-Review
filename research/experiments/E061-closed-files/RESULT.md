# E061: closed files and actual slider access

2026-10-07. Research only; numerical work paused, cutoff/shutdown cancelled.
Original list unchanged. No extension changes, acquired games or pushes.

Opt-in closedFileTags identifies an actual moved rook or queen, including R/Q
promotion, on a file containing pawns of BOTH colors. Complete pawn lists and
both geometric file rays are retained. The short comment names the forward
ray's first occupied square or unobstructed board edge; the first obstruction
may be a pawn, another piece or a king. It does not confuse a geometric ray
with legal movement or claim strategic inferiority, permanent restraint or a
generally closed position. Default-disabled API is exact frozen E060; shared
budget exhaustion drops all new events and preserves parent facts.

Every legal enemy reply has a full record, terminal flag, slider-present flag,
complete resulting file-pawn list and ALL legal tracked slider file moves on
the next own turn. Captures and the effects of pins/checks are retained.
Terminal replies have no continuation. Independent replay reconstructs strict
history/counters/rights, actual move, unit identities, both entire rays, every
reply and every relevant legal move. Selected examples:

- “Closed file: Re2 occupies e-file with pawns of both colors; its forward ray stops at e4, occupied by your pawn.”
- “Closed file: Re5 occupies e-file with pawns of both colors; its forward ray stops at e6, occupied by their pawn.”
- “Closed file: Re7 occupies e-file with pawns of both colors; its forward ray reaches e8 without a blocker.”

EXPOSURE.md records exposed authored fixtures and storage smoke. No detector,
predicate or priority correction after target inspection. An enemy pawn may
be legally captured even on a closed file. A horizontal pin removes all legal
file moves despite the unchanged geometric forward ray. Captured sliders,
pawn captures vacating the file, all four enemy promotions, R/Q promotion,
both-color doubled pawns and explicit terminal replies checked. A legal EP
right in full history expires on actual rook entry; fictitious later EP fails.
Urgent hanging-rook text still wins selection. Open/semi-open files, unrelated
moves, wrong pieces and captures of the last enemy file pawn do not qualify.

All 159 new tests and 2,822 cumulative E020–E061 tests pass. Maintained source
verification and diff checks pass. Full run: 2,592 cases, 2,482 with facts,
76 abstentions and 34 refused illegal moves; selected comments at most 20 words.
Cumulative independent replay: 4,987 certificates, 288 queries, 15,843 reply or
history edges and 36,932 leaves. New classification 20,924 bounded nodes;
inherited trap checks 556 on new cases. No engine search or numerical fitting.

Main, repeat and initially clean clone all use exact source8942732 and match
normalized input hashes, physical output hashes and metrics; 188–191 seconds.
Saved JSON independently replays 108 new certificates: 100 rooks, eight queens,
on 108 positive rows. All 40 legal negative rows/four illegal moves checked.
Full evidence has 864 enemy-reply references, 1,572 legal file moves, 256
capture references, 12 captured-slider references, 12 terminal replies,
16 enemy promotions, eight actual R/Q promotions and eight history plies.
Captures, horizontal pin and EP expiry physically executed. All 2,440 inherited
full-result fingerprints match E060 in order; original-list hash unchanged.

Planned <=4MB storage target FAILS at 4,109,803 bytes, including repeat/clean
manifests. Preserve every proof and case; no silent omissions or raised
after-the-fact passing threshold. This resource miss changes no chess claim,
source or reproducibility result. The pre-run smoke measured new full-result
rows and board/card HTML but underestimated cumulative replay/report overhead.
Use measured complete overhead and explicit display sizing in the next plan.

Coverage: 286 verified names /326 original occurrences; 76 partial, 683
unimplemented occurrences. New name Closed file, within the occupancy/ray/legal
move scope above. Real-game precision, human teaching benefit and extension
readiness remain unknown.

[Demo](evidence/demo.html), [tracker](evidence/concept-status.md),
[results](evidence/results.json), [main](evidence/run.json),
[repeat](evidence/repeat-run.json), [clean](evidence/clean-run.json).
Reproduce: `node research/experiments/E061-closed-files/code/run.mjs --out research/runs/E061/reproduction`.
Guarded D001 test receipts retained. Continue in the isolated checkout while
other activity owns the shared checkout.

Next: E062 investigate Space as actual new pawn control denying enemy king
destinations. Require legal before/after destination sets and independently
legal causal counterfactuals before naming a restriction. Treat this concrete
territory restriction separately from general space advantage, safe occupation
by other pieces or lasting restriction. Budget complete report/replay overhead
and display bytes prospectively; consider a smaller interactive display while
retaining every canonical proof.
