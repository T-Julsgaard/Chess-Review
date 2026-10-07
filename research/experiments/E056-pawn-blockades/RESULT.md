# E056: occupied-square pawn blockades

2026-10-07. Research only; numerical goal paused. Cutoff and shutdown cancelled.
No extension changes, pushes or external game acquisitions. Original list
unchanged. Local authored development exposures retained in EXPOSURE.md.

The opt-in blockadeTags profile names the actual moved nonpawn piece that
occupies the square immediately ahead of an unchanged enemy pawn. King,
knight, bishop, rook and queen supported; captures onto the blockade square
allowed. Full legal enemy replies certify no straight pawn advance while
retaining pawn captures and blocker removals. Comments describe only current
restraint, without permanence, superiority or strategic outcome. Pawn rams,
stationary blockers, merely controlled squares and terminal positions excluded.
Priority stays below check/evasions, urgent warnings and stronger patterns.
Disabled and exhausted profiles preserve frozen parent facts exactly.

Example: “Knight blockade: Ne5 occupies e5 directly ahead of pawn e6,
preventing its straight advance.” Full move/FEN/identity evidence and every
legal reply independently replay. Fabricated squares, pieces, captures, omitted
replies, altered histories/counters and changed teaching text are rejected.
Starting double-push and promotion-step restraint are verified. Legal EP is
exercised on a negative pawn move; moved nonpawns reset EP availability, so no
positive blockade-with-EP-reply claim is made.

Final target: 119 tests; cumulative E020–E056: 2,233 tests. Maintained source
verification and diff checks pass. Full run: 2,036 cases, 1,974 with facts,
48 abstentions and 14 refused illegal moves. Selected comments <=19 words.
Independent cumulative replay: 4,135 certificates, 288 finite queries,
12,595 reply/history edges and 33,148 leaves. New blockade analysis uses 524
nodes; inherited timing/trap/mate checks use 116/105/28 on new cases. The
inherited E055 regression now physically verifies its direct-recapture guard
when the actual recapture is itself a positive-cost all-defense mating offer.

Coverage reaches 276 verified names and 315 original occurrences, with 76
partial and 694 unimplemented. New names: Blockade, Blockade square, Knight
blockade, King blockade, each only within the immediate occupied-square scope.
This does not establish real-game precision, human learning or extension
readiness. No engine evaluations or human-outcome measurements.

Main, repeat and initially clean local checkout match source 0856eed, every
normalized input hash, deterministic output hash and metric. All terminate
successfully in 186–189 seconds; clean status is empty. Saved-JSON verifier
also hashes the actual current inputs and physical output files, not merely
their declared manifests. It independently reconstructs 52 new certificates:
32 knight, four king, eight rook, four bishop and four queen; 332 legal enemy
replies, eight pawn captures, four blocker captures and four full histories.
All 56 legal names-absent cases and four unsafe king moves are checked;
diagonal captures, EP, blocker removal, mate/stalemate and direct recapture
are physically executed. All 1,924 inherited full-result fingerprints match
E055 in order; original-list hash unchanged. Full evidence totals 2,807,558
bytes, below 3 MB; complete proofs retained, no bulk-proof compression.

[Demo](evidence/demo.html), [tracker](evidence/concept-status.md),
[results](evidence/results.json), [main](evidence/run.json),
[repeat](evidence/repeat-run.json), [clean checkout](evidence/clean-run.json).
Reproduce: `node research/experiments/E056-pawn-blockades/code/run.mjs --out research/runs/E056/reproduction`.
Guarded D001 test receipts retained.

Next: E057 investigate rook checks from behind and from the side, with exact
checking rays, pawn-direction context and complete legal evasions. Measure
checking distance explicitly; any claim about useful distance must additionally
exclude immediate legal captures of the checker. Do not infer a drawn ending,
perpetual check or long-term safety from one legal reply layer.
