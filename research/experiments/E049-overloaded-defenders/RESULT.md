# E049 result: conditional overloaded defenders

Research only. Cutoff and PC shutdown remain cancelled. No extension changes,
numerical-rating work or push. [Sources](SOURCES.md) supply terminology; all
positions and color/file mirrors are authored, without external games, boards,
FENs or sequences. Original list unchanged.

Opt-in overloadTags identifies an enemy knight, bishop, rook or queen with TWO
actual defensive duties. Before the played capture, a different own attacker
can legally capture a second target; this defender can legally recapture there
and remove the immediate nominal gain. After the actual capture of the first
target, the same defender can legally recapture the actual mover with no own
material gain. If it does, it no longer protects the second target. The SAME
original own attacker can then capture that second target, with positive net
nominal gain relative to BEFORE the actual move, through EVERY legal immediate
enemy reply. Every legal acceptance by the identified defender is proved.

Example: “Overloaded rook d7: if ...Rxd5, Rxb7 wins material through the next
reply.” The conditional wording matters: the opponent can decline or choose
another recapturer. This is a finite three-ply proof after the played move,
not a forced line, permanent gain or an overall move-quality verdict.
qualityClaim is false. Overloading, Overworked defender and Deflection
combination receive the same precise material-witness scope in the tracker;
existing mating deflections retain their distinct frozen certificates.

Evidence retains original pieces and geometric duties, full before-duty
capture/recapture records, actual capture, every defender acceptance, follow-up
capture, every final legal response, SAN/FEN records, baseline and gain minima.
Independent replay imports no detector/helper arithmetic and recomputes all
legal move sets, identities, canonical histories/counters and p1/n3/b3/r5/q9
material. It rejects draws and own checkmate in any final response and rejects
terminal acceptance branches. Actual own mate after the follow-up capture may
have no replies, but still requires positive nominal gain.

Default false preserves exact E048 results. Shared maxOverloadNodes integer
0..50,000 defaults to 50,000; exhaustion drops all new events and retains parent
facts. Tests reject tampered duties, roles, full records, acceptance/response
sets, gains, minima, horizon, baseline, after position and history mismatch.
No real registered game was analyzed; guarded D001 test receipts retained.

Four positive families exercise rook, queen, knight and bishop defenders.
Negatives retain absent duties/targets/attackers, a queen still defending the
second target, another defender refuting the gain, a costly first mover,
an absolutely pinned defender without a legal duty, acceptance checking the
own king so the follow-up cannot be played, an insufficient-material bishop
draw, exactly zero net gain, a quiet move and disabled/exhausted profiles.

Exposed smoke refused two initially illegal king setups. Corrected roots keep
the intended pin/check negatives legal, without weakening proof gates. A
supposed pawn recapture onto b7 was unavailable and correctly produced a
positive label; a legal knight recapture now provides the intended zero-gain
refutation. The committed plan retains those corrections. The final source
adds explicit legal replays of the refuting lines.

Validation: 73 new and 1,595 cumulative tests pass; maintained-source and diff
checks pass. Evaluation covers 1,442 authored/reflected cases: 1,404 with facts,
32 abstentions and six invalid moves refused. Selected comments remain at most
19 words. Independent replay checks 2,597 certificates, 140 mate queries,
9,675 reply/history edges and 26,858 leaves. New overload classification uses
644 nodes; inherited trap checks use 1,548 nodes. No new engine search.
Coverage reaches 261 verified names across 296 original occurrences, with
76 partial and 713 unimplemented; all original 1,085 occurrences unchanged.

Main, repeat and initially clean checkout match source revision 0509c18,
every normalized input hash, deterministic output hash and metric. All runs
finish successfully in 133–135 seconds; clean working-tree status is empty.
Separate saved-JSON replay verifies 16 new certificates, four per defender
type, 32 first-duty records, 16 acceptance branches and 268 final legal reply
records, each retaining at least three nominal points through the stated
horizon. It checks all 52 negative cases and explicitly executes the other-
defender, pinned-duty, acceptance-check, terminal bishop draw, zero-net-gain
and still-defending refutations. All 1,374 inherited full-result fingerprints
match E048 in fixture order. Retained evidence totals 2,197,197 bytes, below
3 MB, with full new certificates directly readable in results.json.

[Demo](evidence/demo.html), [tracker](evidence/concept-status.md),
[results](evidence/results.json), [main](evidence/run.json),
[repeat](evidence/repeat-run.json), [clean checkout](evidence/clean-run.json).
Reproduce with `node research/experiments/E049-overloaded-defenders/code/run.mjs --out research/runs/E049/reproduction`.
Synthetic mechanics only; real-game precision and learning benefit unmeasured.

Next: E050 investigate square clearance and temporary tactical sacrifices with
explicit legally replayed vacancy/recapture witnesses. Preserve frozen evidence,
keep production separate and commits local.
