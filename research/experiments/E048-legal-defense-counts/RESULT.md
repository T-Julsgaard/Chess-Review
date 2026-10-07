# E048 result: legal capture counts and conditional x-ray defense

Research only. Cutoff and PC shutdown remain cancelled. No extension changes,
numerical-rating work or push. [Sources](SOURCES.md) provide rule/API metadata;
no external games, boards, FENs or move sequences are used. All positions and
their color/file mirrors are authored synthetic cases.

Opt-in defenseCountTags adds short comments counting distinct enemy pieces
that can legally capture an own target, then gives the immediate legal own
recapture count after a specified capture. Full sets for EVERY such capture
are retained, not just the displayed branch. A capturing promotion pawn counts
once even with four promotion choices. En passant identifies the captured pawn
on its original square while counting recaptures on the actual landing square.
Example: “Your knight d4 faces 2 legal capturing pieces; after ...Bxd4, 2 pieces
can recapture on d4.” This is an option count, not a claim of a good exchange
or a guaranteed material result.

Pinned-recapture comments require an apparently defending N/B/R/Q that cannot
legally recapture, with an independently reconstructed geometric capture
exposing its own previously safe king. Existing check and unsafe king captures
are deliberately excluded from this pin explanation. Example: “Your rook e2
cannot recapture on a2: moving it would expose your king e1.” Evidence retains
the hypothetical board, king and exact attacking pieces; that hypothetical
capture is not presented as a legal move.

X-ray defense requires one own blocker between an own rook/bishop/queen and
the target. The opponent captures the target, that blocker legally recaptures,
the opponent recaptures again, and the original slider legally recaptures.
All four legal moves, SAN, before/after positions and original ray are saved.
Example: “X-ray defense: after ...Nxd4, Rxd4 opens d1; that rook can recapture
after ...Bxd4.” This conditional witness upgrades the earlier alignment-only
partial interpretation; it does not imply forced acceptance or a profitable
trade. qualityClaim is false for every new event.

Default false preserves exact frozen E047 behavior. Shared 50,000-node budget
exhaustion removes all new events while retaining parent facts. Independent
replay imports no detector and reconstructs full canonical history, terminal
guards, complete capture/recapture sets, distinct-piece counts, excluded
defender king exposure and the entire conditional x-ray line. Tests reject
omitted captures/recaptures, altered counts, wrong pin attackers/boards/kings,
wrong ray/blocker, truncated or altered lines, and full-FEN history mismatch.

Negatives include a geometrically attacking but pinned enemy knight, an unsafe
king recapture, unrelated check after a capture, two ray blockers, a bishop
substituting for a rook on a file, and a slider whose tempting last recapture
exposes its king. A discovered defender after the capturing piece leaves its
old square validates why counts are computed after each branch. Terminal mate,
disabled settings and exhausted budget retain no new labels.

Exposed smoke initially refused a setup already checking the nonmoving king.
An incorrectly ranked promotion pawn was corrected; a king-recapture case
needed extra pawn material to avoid an immediate insufficient-material draw.
The pin gate now explicitly requires no existing check after the capture.
An x-ray slider behind its blocker is not an initial direct defender, so its
negative tests reject the x-ray line rather than demand an incorrect pin label.
Corrections are retained in the committed plan. The 72-case pilot passed;
the final fixture set additionally exercises the preregistered discovered
defender case. No proof gate was relaxed to make negatives pass.

Validation: 86 new and 1,522 cumulative tests pass; maintained-source and diff
checks pass. Final evaluation covers 1,374 authored/reflected cases: 1,336 with
facts, 32 abstentions and six invalid moves refused. Selected comments remain
at most 19 words. Independent replay checks 2,433 certificates, 140 mate
queries, 9,331 reply/history edges and 26,470 leaves. New count classification
uses 820 nodes; inherited trap checks use 1,610 nodes. No new engine search.
Coverage reaches 258 verified names across 293 original occurrences, with
76 partial and 716 unimplemented; the 1,085-occurrence original is unchanged.

Main, repeat and initially clean checkout match revision 3f669ab, every
normalized input hash, deterministic output hash and metric. All three runs
finish successfully in 117–118 seconds; clean working-tree status is empty.
Separate saved-JSON replay verifies 88 new certificates (76 counts, four pinned
recaptures, eight x-ray defenses), 140 capture branches, 124 legal recapture
rows, 32 x-ray move records and four king-exposure witnesses. It checks 32
negative cases and the en passant, promotion, king danger, pinned attacker and
discovered defender distinctions. All 1,298 inherited full-result fingerprints
match E047 in fixture order. Retained evidence totals 2,184,953 bytes, below
3 MB. Full certificates remain directly readable in results.json.

[Demo](evidence/demo.html), [tracker](evidence/concept-status.md),
[results](evidence/results.json), [main](evidence/run.json),
[repeat](evidence/repeat-run.json), [clean checkout](evidence/clean-run.json).
Reproduce with `node research/experiments/E048-legal-defense-counts/code/run.mjs --out research/runs/E048/reproduction`.
Guarded D001 test receipts are retained; no registered game was analyzed.
Synthetic mechanics are verified within these scopes; real-game precision
and human learning benefit remain unmeasured.

Next: E049 investigate overloading with distinct threatened targets and legal
defender-response witnesses, requiring concrete tactical outcomes rather than
counting geometric duties alone. Preserve frozen evidence, keep the extension
separate and commits local.
