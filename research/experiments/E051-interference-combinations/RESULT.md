# E051 result: all-reply interference combinations

Research only. Cutoff/shutdown remain cancelled; no extension, numerical-rating
changes or push. [Sources](SOURCES.md) provide definitions only; authored
positions and color/file mirrors contain no copied source boards, games, FENs
or move sequences. Original concept list unchanged.

Opt-in interferenceTags adds a stronger tactical certificate beside the frozen
line-interruption geometry. An enemy rook/bishop/queen previously defended
another enemy target along a clear, correctly typed ray. Before the actual
move, an original own unit can legally capture that target and the defender
can legally recapture, preventing an immediate nominal gain. The actual move
interposes on an initially empty intermediate square, blocking this duty.
Every legal enemy reply permits that same own unit to capture the target with
strictly positive material change relative to BEFORE the actual move, both
immediately and through EVERY next legal enemy response.

Example: “Interference on f7 blocks rook a7; every reply permits a capture on
h7, winning material through the next reply.” This is a finite three-ply proof
after the move, not permanent gain, a unique best move or inferred intention.
The loss of an interposed sacrificial unit is included in the before-move
baseline. Every new event has qualityClaim false.

Each branch additionally reconstructs a hypothetical board removing ONLY the
occupant of the interposed square. The original defender must then have a
legal recapture of the capturing unit on the target square. That hypothetical
removal is explicitly separate from the legal line; it verifies why blocking
the ray matters. Full removed-piece, counterfactual FEN and legal recapture
records are retained. This excludes geometric coincidence beside an unrelated
material gain. The tracker adds Interference combination and states this
stronger witness separately alongside the existing Interference interpretation.

Independent replay imports no detector/arithmetic/ray helpers and reconstructs
typed ray, original empty squares, both legal before-duty records, full history
and canonical counters, exact all-defense and all-final-response sets, role
identities, current obstruction, capture, counterfactual removal/recapture and
p1/n3/b3/r5/q9 arithmetic. Default false preserves exact E050 behavior. Shared
maxInterferenceNodes integer 0..50,000 defaults to 50,000; exhaustion removes
all new tags while retaining parent facts. Omitted or altered rays, duties,
identities, sets, moves/FENs, removed pieces, counterfactuals, gains, baseline,
minimum, horizon and history are rejected.

Authored positive families cover rook/queen rank defense and bishop/queen
diagonal defense. Negatives retain absent discovered check, an unguarded
capturing unit taken by the king, another knight recapturing it, an initially
blocked ray, wrong slider, missing attacker, irrelevant move, a legal target
escape/interposition, interposer loss outweighing the captured pawn, an original
absolutely pinned defender without a legal duty, actual terminal mate and
disabled/exhausted profiles. Explicit negative sequences verify those defenses.

Exposed smoke found a king blocking its own intended discovered check, a
supposed target escape that illegally exposed its king to a different rook,
and a terminal queen setup already checking the nonmoving king. Authored legal
roots now isolate the intended mechanisms and negatives. Corrections are
retained in the committed plan; proof gates unchanged.

Validation: 73 new and 1,775 cumulative tests pass; maintained-source and diff
checks pass. Evaluation covers 1,610 authored/reflected cases: 1,560 with facts,
44 abstentions and six invalid moves refused. Selected comments stay at most
19 words. Independent replay checks 2,833 certificates, 140 mate queries,
9,895 reply/history edges and 28,262 leaves. New interference classification
uses 765 nodes; inherited trap checks use 302 nodes. No new engine search.
Coverage reaches 265 verified names across 300 original occurrences, with
76 partial and 709 unimplemented. Existing geometry and stronger combination
scopes remain explicit; original 1,085 occurrences unchanged.

Main, repeat and initially clean checkout match source revision 15a799c, every
normalized input hash, deterministic output hash and metric. All finish in
157–161 seconds; clean working-tree status is empty. Separate saved-JSON replay
verifies 16 new certificates, four per rank/diagonal/defender profile, 32
before-duty records, 16 complete enemy-defense branches, 200 final-response
records and 16 counterfactual legal recaptures. All positives retain at least
two nominal material points through the stated horizon. It checks all 52
negative cases and explicitly executes checker capture, king/knight recapture,
legal target escape, interposer-loss refutation, pinned-duty refusal and actual
terminal mate. All 1,542 inherited full-result fingerprints match E050 in
fixture order and the original list hash is unchanged. Retained evidence totals
2,251,867 bytes, below 3 MB; full new certificates remain readable in results.json.

[Demo](evidence/demo.html), [tracker](evidence/concept-status.md),
[results](evidence/results.json), [main](evidence/run.json),
[repeat](evidence/repeat-run.json), [clean checkout](evidence/clean-run.json).
Reproduce with `node research/experiments/E051-interference-combinations/code/run.mjs --out research/runs/E051/reproduction`.
Guarded D001 test receipts retained; no registered game analyzed. Synthetic
mechanics only; real-game precision/human learning benefit unmeasured.

Next: E052 investigate desperado captures with an actual threatened unit,
complete legal escape comparisons and finite material witnesses. Preserve
frozen evidence, keep production separate and commits local.
