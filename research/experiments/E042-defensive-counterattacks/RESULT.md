# E042 result: counterattacking defenses and sacrifice offers

Research only. Usage cutoff and PC shutdown remain cancelled. No extension,
rating edits or push. Definition sources are documented in [SOURCES.md](SOURCES.md);
no source game, diagram or puzzle was imported.

An actual checking move with a complete unique immediate-mate-defense certificate
can now receive “Counterattack: Rxf2+ checks and is your only move avoiding mate
in one.” The move must prevent immediate mate and every legal alternative must
admit a mating reply. No exclusive causal role for check, longer-term safety or
initiative is inferred. Checking without that defense proof abstains.

A defensive sacrifice offer additionally requires a legal capture of the actual
moved non-king unit with nominal material loss versus before the played move,
remaining strictly negative through EVERY legal immediate own response. Terminal
draw/mate continuations and recoverable offers fail that gate. All qualifying
acceptances and response FENs/gains are retained. Acceptance remains conditional.
The authored Ne3+ example has Qxe3, losing three nominal points through three
possible immediate replies; the opponent also has legal noncapturing defenses.
The comment explicitly says “Defensive sacrifice offer”. Longer-term compensation
or a forced loss of material is not claimed.

Adding a rook to recapture Qxe3 also creates another safe Rf3 defense: that exposed
case is retained as a prerequisite refutation. An authored bishop version retains
unique Ne3+ but permits Bxe3, so it receives counterattack and refuses sacrifice.
Nonchecking defenses, another safe choice, disabled profiles and zero/exhausted
tag budgets also abstain. Defaults preserve the exact frozen parent result.
The new tag budget is shared across all acceptances/responses and capped at 50,000;
exhaustion drops the new tag while retaining inherited unique-defense evidence.

Validation: 26 new tests and 1,144 cumulative tests pass; source verification and
diff checks pass. Tests cover both colors, supplied history, decline choices,
omitted responses/acceptances, fabricated gains/FEN/unit identity, missing parent
alternatives and budget boundaries. Main evaluates 1,030 authored/reflected cases:
992 with facts, 32 abstentions and six invalid moves refused. Selected comments
remain at most 19 words. Independent replay checks 1,615 event certificates,
94 mate queries, 8,197 reply/history edges and 23,904 leaves. New fixtures use
670 unique-search nodes and 37 defensive-tag nodes. Coverage reaches 235 names
across 270 verified original occurrences, 79 partial and 736 unimplemented.
Counterattack and Defensive sacrifice have the exact scopes above; the previously
verified Active defense entry also includes this checking-defense subset.

[Demo](evidence/demo.html), [tracker](evidence/concept-status.md) and
[results](evidence/results.json) retain the full new certificates in compact JSON.
[Main](evidence/run.json), [repeat](evidence/repeat-run.json) and
[initially clean checkout](evidence/clean-run.json) match all normalized inputs,
deterministic outputs and metrics at source revision `5dfdd91`. Each run took
about 80 seconds; clean working-tree status is empty. A separate saved JSON replay
verified all six new certificates, both sacrifice acceptances and six immediate
counterresponses. All 1,010 inherited full-result hashes exactly match E041.
The inherited comparison preserves order because some earlier fixture names repeat.
Retained evidence totals 1,210,592 bytes, below 3 MB. Guarded D001 receipts are
retained; no registered game was analyzed. Pilot: research/runs/E042/development.

Reproduce with `node research/experiments/E042-defensive-counterattacks/code/run.mjs --out research/runs/E042/reproduction`.
Saved-proof checking obtains the guarded D001 test receipt, loads results.json,
and calls `replay(row.fixture, event)` from code/replay.mjs for each
defensive-counterattack event. No decompression or hydration is needed.

Synthetic mechanics are verified; real-game explanation precision and human
learning benefit remain unmeasured. Next: E043 investigate conditional decoy/
deflection motifs with explicit acceptance and continuation proofs, and refresh
stale generic Pin/Clearance partial descriptions to reflect already certified
relative/cross-pin and clearance-sacrifice subsets. Preserve older evidence,
keep comments short and commit only locally.
