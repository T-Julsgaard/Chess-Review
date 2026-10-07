# E059: own-pawn blockers and next-turn pawn fixation

2026-10-07. Research only; numerical work remains paused. Usage cutoff and
shutdown cancelled. Original list unchanged; no extension integration or push.

Opt-in pawnRestraintTags distinguishes an actual own unit placed immediately
ahead of an unchanged own pawn from an actual pawn move creating an enemy-pawn
ram. The first names only the blocked straight advance. The second requires
EVERY legal enemy reply to remain live, preserve both ram pawns and leave zero
legal moves of the tracked pawn on its next turn. Captures, lost blockers and
terminal branches are retained explicitly. No permanent immobility, weakness,
best-move or advantage claim. Default-disabled and exhausted profiles preserve
the frozen parent. Independent replay reconstructs full legal history,
identities, actual move, every enemy reply and every tracked legal pawn move.

Selected examples:

- “Self-blocking pawns: Ne3 occupies e3 directly ahead of your pawn e2, blocking its straight advance.”
- “Pawn fixation: e4 locks pawn e4 against e5; every legal reply leaves it without a legal move next turn.”

EXPOSURE.md records authored illegal-root corrections and the selected-comment
failure: fixation initially lost to generic ending/transition text. Its priority
was corrected before the decisive runs; urgent tactical comments retain their
priority. Own-pawn captures, captures of the blocker, captures by the ram pawn,
loss of the tracked pawn, history, actual terminal moves and terminal replies
are exercised. Naming a straight blocker never implies that captures are blocked.

All 98 new tests and 2,544 cumulative E020–E059 tests pass, along with maintained
source verification and diff checks. Full run: 2,328 cases, 2,238 with facts,
64 abstentions and 26 refused illegal moves. Selected comments at most 19 words.
Cumulative independent replay: 4,603 certificates, 288 queries, 14,043 reply or
history edges and 34,588 leaves. New classification uses 4,912 bounded nodes.
No engine search, numerical fitting or human-outcome measurement.

Main, repeat and initially clean local clone all use source ba339f4 and match
normalized input hashes, physical output hashes and metrics exactly; 186–189
seconds each. Saved JSON independently replays 48 new labels on 48 positive
rows: 40 self-blocking and eight next-turn fixation. All 40 legal negative rows
and four illegal moves checked. Evidence retains 328 enemy-reply references,
24 legal tracked-pawn moves, eight removed-blocker references and 12 terminal
reply references. Refuting captures physically executed. All 2,236 inherited
full-result fingerprints match E058 in order; original-list hash unchanged.
Full evidence 2,863,637 bytes, below 3MB; every new proof retained.

Coverage: 284 verified names / 324 original occurrences; 76 partial and 685
unimplemented occurrences. New names Self-blocking pawns and Pawn fixation
refer only to the bounded mechanics above. Real-game precision, teaching
benefit and extension readiness remain unmeasured.

[Demo](evidence/demo.html), [tracker](evidence/concept-status.md),
[results](evidence/results.json), [main](evidence/run.json),
[repeat](evidence/repeat-run.json), [clean](evidence/clean-run.json).
Reproduce: `node research/experiments/E059-pawn-restraint/code/run.mjs --out research/runs/E059/reproduction`.
Guarded D001 test receipts retained. Work remains in an isolated checkout while
the shared checkout belongs to other activity.

Next: E060 investigate pawn breaks that actually remove an enemy pawn blocking
another own pawn. Require complete legal replies and independently replayable
next-turn advances before naming a released pawn; do not infer advantage or
permanent freedom from the capture alone.
