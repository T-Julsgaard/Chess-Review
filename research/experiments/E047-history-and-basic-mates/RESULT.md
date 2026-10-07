# E047 result: played Legal history and basic terminal mates

Research only. Usage cutoff and PC shutdown remain cancelled. No extension,
numerical-rating changes or push. [Sources](SOURCES.md) supply terminology;
all positions and histories are authored, without imported source games,
boards, FENs or move sequences.

New opt-in historyMateTags names Legal, Corner and Box mates only after the
actual legal move checkmates with the played piece as sole checker. Legal's
mate additionally requires four actual history moves: a knight leaves a
bishop-to-queen relative pin, that bishop captures the queen, the final own
bishop checks, and the enemy king moves before the other knight mates. The
helper knight protects the bishop, and each of the two knights and bishop
controls a distinct vacant flight outside the other two units' coverage.
Full move/SAN/FEN records, pin pieces and ray, and flight witnesses are saved.
Example: “Legal’s mate: after ...Bxe2, your bishop and two knights finish the
mate.” This describes a verified played branch; it does not assert that the
earlier queen offer forces mate against every alternative defense.

Corner mate requires a knight finishing against a corner king, a rook or queen
on the adjacent inward file sealing both vacant flights on that file, and an
enemy pawn blocking the other orthogonal neighbor. Other corner finishes stay
unnamed. Box mate requires exactly king and rook against a lone king, with the
rook mating on the edge and its king sealing every vacant flight outside rook
coverage. This verifies the terminal form, not a preceding shrinking-box plan.
Example: “Box mate: rook a8 checks on the edge; your king e6 seals the remaining
escapes.” Comments identify the concrete roles without implying an opening,
historical game or unverified intention.

Default false preserves the exact frozen E046 result. The shared 50,000-node
classification limit discards all new tags on exhaustion while retaining
parent facts. Independent replay reconstructs all legal history, checks full
canonical final FEN including counters, rejects terminal continuation, executes
the actual mating move and recomputes each role without importing detectors.
Tampered history rows, captures, indices, pin rays/pieces, helpers and flights
are rejected. Negative cases retain actual mates without a prior pin, older
queen loss, rook loss, missing history, alternative corner helpers, a queen
instead of a rook, or extra material in the Box profile; missing-role nonmates
are retained too. Both colors and file mirrors include replayed full history.

An extra closing brace initially prevented module loading and was fixed before
fixture evaluation. The authored Legal pin route uses bishop b5, knight c4,
queen e2 and bishop h5, deliberately distinct from a source opening sequence.
The exposed smoke and restricted scope are recorded in the committed plan.

Validation: 85 new and 1,436 cumulative tests pass; maintained-source and diff
checks pass. Main evaluates 1,298 authored/reflected cases: 1,260 with facts,
32 abstentions and six invalid moves refused. Selected comments stay at most
19 words. Independent replay checks 2,225 certificates, 140 mate queries,
8,767 reply/history edges and 25,942 leaves. New cases use 140 classification
nodes and no new mate-search nodes. Coverage reaches 256 verified names across
291 original occurrences, with 77 partial and 717 unimplemented. The original
1,085-occurrence list is unchanged. Verification refers to the precise scopes
above; real-game precision and human learning benefit remain unmeasured.

Main, repeat and initially clean checkout match every normalized input hash,
deterministic output hash and metric at source revision 3e1c2ec. Runs took
103–104 seconds; the clean working-tree status is empty. Separate saved-JSON
replay verifies 20 new certificates (four Legal, eight Corner, eight Box),
16 complete history records and 52 flight witnesses. It also verifies 36
actual mates correctly receiving no new label and 24 missing-role nonmates.
All 1,218 inherited full-result fingerprints match frozen E046 in fixture
order. Retained evidence totals 1,801,370 bytes, below the 3 MB limit.

[Demo](evidence/demo.html), [tracker](evidence/concept-status.md),
[results](evidence/results.json), [main](evidence/run.json),
[repeat](evidence/repeat-run.json), [clean checkout](evidence/clean-run.json).
Reproduce with `node research/experiments/E047-history-and-basic-mates/code/run.mjs --out research/runs/E047/reproduction`.
Guarded D001 test receipts are retained; no registered game was analyzed.

Next: E048 investigate counting attackers and defenders with legal capture
witnesses and pinned-piece exclusions, avoiding numerical-count claims of a
winning capture without an actual proof. Preserve frozen records and the
original list; keep the extension separate and commits local.
