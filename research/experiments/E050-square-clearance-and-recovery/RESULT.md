# E050 result: mating-square clearance and temporary material recovery

Research only. Cutoff/shutdown remain cancelled; no extension, rating changes
or push. [Sources](SOURCES.md) provide definitions only. Fixtures are authored,
with file/color mirrors; no source games, boards, FENs or sequences copied.
Original 1,085-occurrence concept list remains unchanged.

Opt-in clearanceRecoveryTags verifies square clearance when the actual move
vacates an own occupied square and EVERY legal enemy reply permits another
original own unit to legally mate on that square. Full reply, helper and mate
records are saved. Example: “Square clearance: vacating h7 lets queen e7 mate
there after every reply.” This does not imply that square is the only mating
square, a unique best move or player intention. Square clearance and Clearance
combination receive this exact scope; general Clearance remains partial.

Temporary sacrifice requires an actual material offer with positive nominal
cost, EVERY legal capture of that offered unit creating negative material
change relative to BEFORE the played move, and a legal own capture restoring
at least that starting balance immediately and through EVERY legal next enemy
reply. Example: “Temporary rook sacrifice: if ...Nxe4, Bxb8 recovers material
through the next reply.” Declines are not forced or evaluated by this tag.
All acceptance/recovery/response records, losses, gains, minimum and three-ply
horizon after the actual move are retained. Equal material restoration counts;
a terminal draw or mate without actual material recovery does not. Every new
event has qualityClaim false, with no lasting-gain or overall move-quality claim.

Independent replay imports no detector/helpers and reconstructs full legal
history, canonical FEN/counters, terminal guards, original helper identities,
exact all-defense/acceptance/final-response sets and p1/n3/b3/r5/q9 arithmetic.
Default false preserves exact E049 output. Shared 50,000-node classification
budget discards all new tags on exhaustion while retaining parent facts.
Tests reject altered vacancy/helper, omitted reply/acceptance/response rows,
tampered SAN/FEN/moves, wrong losses/gains/minima, horizon and history mismatch.

Authored positives include knight and bishop vacancies, rook/queen/bishop/
knight/pawn offers, equal queen recovery, exchange offers, en passant acceptance
capturing the pawn off the landing square, and two different accepting pieces.
Negatives include a king flight, missing mating helper, mate on a different
square, mate already played, 100-halfmove draw, helper-capturing defense,
missing/insufficient recovery, a legal recapture refuting restoration, a
same-color bishop draw, absent acceptance, equal ordinary exchange and budgets.
A helper-capturing defense refutes clearance in a position that still has a
different valid conditional temporary-sacrifice branch; both scopes are tested.

Exposed smoke initially refused a queen checking the nonmoving king. One draw
case allowed a different legal recovery, and an intended refutation's bishop
could not move without exposing its own king. Corrected legal roots isolate
the intended refutations without changing proof gates. The committed plan
retains these exposures; independent negative replay executes actual legal
refuting sequences rather than assuming they exist.

Validation: 107 new and 1,702 cumulative tests pass; maintained-source and diff
checks pass. Evaluation covers 1,542 authored/reflected cases: 1,492 with facts,
44 abstentions and six invalid moves refused. Selected comments remain at most
19 words. Independent replay checks 2,709 certificates, 140 mate queries,
9,783 reply/history edges and 27,358 leaves. New classification uses 832 nodes;
inherited trap checks use 1,855 nodes. No new engine search. Coverage reaches
264 verified names across 299 original occurrences, with 76 partial and 710
unimplemented. General Clearance remains partial rather than being renamed.

Main, repeat and initially clean checkout match source revision 4920deb, every
normalized input hash, deterministic output hash and metric. All finish in
128–129 seconds; clean working-tree status is empty. Separate saved-JSON replay
verifies 48 new certificates: 12 square-clearance proofs with 24 all-defense
branches and 36 temporary-sacrifice proofs with 40 accepting branches and
408 complete final-response records. It checks all 52 negative cases and
explicitly replays the legal king escape, other-square mate, already-played
mate, 100-halfmove draw, helper capture, insufficient-material draw and material
refutation; equal recovery, en passant and both accepting pieces are confirmed.
All 1,442 inherited full-result fingerprints match E049 in fixture order and
the original list's hash is unchanged. Evidence totals 2,512,070 bytes, below
3 MB; full new certificates remain directly readable in results.json.

[Demo](evidence/demo.html), [tracker](evidence/concept-status.md),
[results](evidence/results.json), [main](evidence/run.json),
[repeat](evidence/repeat-run.json), [clean checkout](evidence/clean-run.json).
Reproduce with `node research/experiments/E050-square-clearance-and-recovery/code/run.mjs --out research/runs/E050/reproduction`.
Guarded D001 test receipts retained; no registered game analyzed. Synthetic
mechanics only; real-game precision/human learning benefit unmeasured.

Next: E051 investigate tactical interference between defending pieces with
complete legal recapture and finite material/mate consequences. Preserve frozen
evidence, keep production separate and commits local.
