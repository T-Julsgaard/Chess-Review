# E040 result: verified quiet mating nets

Research only. Usage monitoring and PC shutdown remain cancelled. No extension
integration, numerical-rating work or remote push.

A quiet mating net now names an actual nonchecking, noncapturing move when
every legal opponent reply admits checkmate on the next own move. It reuses
the complete frozen mate-in-two certificate and independently enumerates all
defenses and executes their mating responses. The selected comment is:
“Quiet mating net: every legal reply allows mate on your next move.”
It does not say the threat is newly created, the move is uniquely winning or
better than alternatives. Stronger warnings and missed-mate labels keep priority.

Checking moves, captures, immediate mate, three-move-only mate, terminal draws,
disabled depth and exhausted searches refuse this label. The first positive
fixture had a sole reply despite its initial name; it is accurately renamed
and retained. An added opposing knight supplies four defenses, three by the
knight, each met by mate. Both colors pass; removing a defense rejects the proof.
The first pilot also caught a demo dereference for packed proof references;
the corrected adapter passes a display smoke check. No chess proof gate changed.

Validation: 27 new tests, 1,097 cumulative tests, source verification and diff
checks pass. Main evaluates 992 authored/reflected cases: 954 with facts,
32 abstentions and six invalid moves refused. Maximum selected comment remains
19 words. Independent replay checks 1,533 event certificates, 94 mate queries,
7,829 reply/history edges and 23,636 leaves. Coverage reaches 231 verified
names across 266 original occurrences, with 81 partial and 738 unimplemented.
Mating net, mating attack, forcing move(s) and quiet tactical move have the
specific bounded scope above. Broad Quiet move remains partial because the
original list's non-forcing wording is not established by a forced mating threat.

[Demo](evidence/demo.html), [tracker](evidence/concept-status.md) and
[results](evidence/results.json) retain legal positions, moves and certificates.
[Main](evidence/run.json), [repeat](evidence/repeat-run.json) and
[initially clean checkout](evidence/clean-run.json) match all normalized input,
deterministic output hashes and metrics at source revision `614aa1b`. Final
runs took 72–73 seconds each. The clean run records an empty working tree.
Guarded D001 receipts are retained; no registered game was analyzed. Earlier
exposed outputs stay under `research/runs/E040/`; final repeat is `final-repeat`
and the clean clone's final run is `final-clean`.
Total retained evidence is 1,145,826 bytes, below the 3 MB gate.

The four new full certificates are retained losslessly in
[certificates.json.gz](evidence/certificates.json.gz): 2,101 uncompressed bytes
in 390 compressed bytes. A separate read-back audit verified both hashes,
unique keys, exact result references and independent replay of all four proofs.
Decode with Node `readFile`, `gunzipSync` from `node:zlib`, and `JSON.parse`.
Match pack entry `key` to `event.evidence.proof.certificate`, replace that
reference with the full entry `proof`, and after the guarded D001 test receipt
call `replay(row.fixture, hydratedEvent)` from `code/replay.mjs`.
Rerun with `node research/experiments/E040-quiet-mating-nets/code/run.mjs --out research/runs/E040/reproduction`.

These certificates establish synthetic legal mechanics. Real-game explanation
precision and human learning benefit remain unmeasured. Next: E041 examine
unique defenses to immediate mate, retaining exact alternative-move refutations
and short comments. Keep all work in research and commit locally.
