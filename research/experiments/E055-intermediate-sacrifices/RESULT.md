# E055: verified intermediate sacrifices

2026-10-07. Research only; numerical research remains paused. Cutoff and
shutdown cancelled. No extension changes or pushes. Original list unchanged.

The opt-in intermediateSacrificeTags profile emits a brief timing explanation
only after full history confirms the last enemy capture and every original
legal recapture is enumerated. The different actual positive-cost offer must
have a complete same-row mating-sacrifice proof against every legal defense.
No original move may already checkmate. Capturer promotion and EP victim
identity are tracked explicitly; no eventual recapture, surprise or best-move
claim. Default-disabled and exhausted profiles preserve frozen parent facts.

Example: “Intermediate sacrifice: Rg8+ skips an available recapture on f8 and
forces mate within 2 moves.” The independent replay checks exact histories,
original legal move sets, every recapture, no immediate mate, move records,
costs, full parent proof and exact text. Tampered or detached proofs fail.
All positive new fixtures exercise mateIn2; inherited mateIn3 certificate
support is implemented but has no new positive timing fixture here.

Authored development corrections and exposure are recorded in EXPOSURE.md.
Final target passes 81 tests; E020–E055 cumulative suite passes 2,114 tests.
Maintained source verification and diff checks pass. Full run: 1,924 cases,
1,870 with facts, 44 abstentions and 10 refused illegal moves; selected comments
are at most 19 words. Independently replayed: 4,003 certificates, 284 finite
queries, 12,099 reply/history edges and 32,520 leaves. New timing analysis uses
1,320 nodes; inherited intermediate/mate checks use 194/588 on new cases.
No engines, acquisitions or human-outcome measurements.

Coverage reaches 272 verified names and 308 original occurrences, with 76
partial and 701 unimplemented. Intermediate sacrifice is checked only within
the stated history/recapture/positive-offer/mating-proof scope.

Main, repeat and initially clean local checkout match source 7875b91, every
normalized input hash, deterministic output hash and metric; all finish in
179–181 seconds. Clean status is empty. Saved-JSON replay confirms 28 new
certificates with 40 legal recaptures, 32 history plies and 28 complete parent
defense branches. It checks all 48 names-absent cases and physically executes
the immediate-mate alternative and illegal pinned-recapture attempt. All
1,848 ordered inherited full-result fingerprints match E054; original-list
hash is unchanged. Full retained evidence: 2,542,019 bytes, below 3 MB.

[Demo](evidence/demo.html), [tracker](evidence/concept-status.md),
[results](evidence/results.json), [main](evidence/run.json),
[repeat](evidence/repeat-run.json), [clean checkout](evidence/clean-run.json).
Reproduce: `node research/experiments/E055-intermediate-sacrifices/code/run.mjs --out research/runs/E055/reproduction`.
Guarded D001 test receipts retained. Real-game precision and human teaching
value remain unmeasured; this is not extension readiness.

Next: E056 investigate new pawn blockades, their squares, knight and king
blockaders with exact legal enemy move sets and explicitly limited immediate
forward restraint. Do not imply permanence or strategic superiority.
