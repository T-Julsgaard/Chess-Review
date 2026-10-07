# E039 result: king support and opposition for promotion

Research only. The user cancelled usage monitoring and PC shutdown. Extension
integration and the separately paused numerical-rating work remain outside scope.

King activity now has a concrete, conservative benefit certificate in bare
king-and-pawn versus king positions. After the actual king move, forward pawn
pushes must secure safe queen promotion against every defender reply and
immediate response. Before that move, a complete counterstrategy must refute
the same pawn-only goal. The depth covers all remaining single pushes; budget
exhaustion, insufficient depth and an already-safe route produce no new label.
This is a bounded promotion effect, not a whole-game win or best-move claim.

The same certificate can name actual centralization, penetration, direct,
distant or diagonal opposition when the exact king geometry also holds.
Opposition alone never establishes benefit. One proposed centralizing move
failed the promotion gate and remains a negative fixture. Generic key squares
and critical squares remain deferred: these fixed-position certificates cannot
establish a universal square theorem.

Validation: 27 new tests and 1,070 cumulative tests pass, including both colors,
history preservation, omitted negative branches, fabricated positional tags,
budget exhaustion and witness tampering. Source verification and diff checks
pass. Main evaluates 968 authored/reflected cases: 932 with facts, 30 abstentions
and six invalid moves refused. Selected comments remain at most 19 words.
Independent replay checks 1,501 event certificates, 72 mate queries, 7,659
reply/history edges and 23,532 leaves. Coverage reaches 226 verified names,
259 verified original occurrences, 80 partial and 746 unimplemented occurrences.
Checked entries retain their specific scope; real-game precision and human
learning benefit have not been measured.

[Demo](evidence/demo.html), [tracker](evidence/concept-status.md) and
[results](evidence/results.json) retain the actual moves and proof references.
[Main](evidence/run.json), [repeat](evidence/repeat-run.json) and
[initially clean checkout](evidence/clean-run.json) match all normalized input
and deterministic output hashes at source revision `31e7653`. Each run took
72–74 seconds. Repeat records only newly generated untracked evidence; the
clean run records an empty working tree. D001 eligibility receipts are retained;
no registered game was analyzed. Pilot: `research/runs/E039/development`.
Total retained evidence is 1,028,898 bytes, below the preregistered 3 MB cap.

The eight paired certificates are stored losslessly in
[certificates.json.gz](evidence/certificates.json.gz). The pack contains
1,714,967 uncompressed bytes in 34,736 compressed bytes. A separate read-back
audit verified both hashes, unique keys, every result reference and independent
replay of all eight hydrated events. No tree branch or leaf is omitted.

To decode, read the pack with Node's `readFile`, decompress with `gunzipSync`
from `node:zlib`, then `JSON.parse`. Match each entry's `key` against
`event.evidence.beforeProof.certificate` and `afterProof.certificate`; replace
those references with the entry's full `beforeProof` and `afterProof`. After
the guarded D001 test receipt, call `replay(row.fixture, hydratedEvent)` from
`code/replay.mjs`. The full runner also performs raw independent replay and
lossless roundtrip before writing artifacts. Rerun with
`node research/experiments/E039-king-promotion-support/code/run.mjs --out research/runs/E039/reproduction`.

Next: E040 add further sound, independently replayable items from the original
concept list. Preserve earlier evidence, keep comments short and commit locally.
