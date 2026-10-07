# E057: rook checking direction and immediate distance

2026-10-07. Research only; numerical goal paused, cutoff/shutdown cancelled.
No extension changes, pushes or external games. Original list unchanged.

The opt-in rookCheckTags profile names actual direct rear/side rook checks
in a K/R/P ending with one rook per side and an advanced enemy passer beyond
its king on the king's file. Exact checking rays and the complete eligible
pawn set are independently reconstructed. Distance comments require at least
three clear intervening squares and no immediate legal capture of the checker.
Complete legal evasions, including captures and interpositions, remain in
evidence. No draw, perpetual-check or future-safety claim. Closer/capturable
checks may receive the neutral direction label but never distance assurance.
Default-disabled and exhausted profiles preserve frozen parent facts exactly.

Selected examples:

- “Rook check from behind: Re6+ checks king e3 along the e-file, behind pawn e2.”
- “Rook check from the side: Rc3+ checks king e3 along rank 3, beside pawn e2.”
- “Checking distance: Ra3+ leaves 3 clear squares between rook and king; no immediate legal reply captures the rook.”

Initial mechanics runs at61f405b matched and independently replayed, but selected
side comments were hidden by inherited rook-lift geometry. SELECTION.md records
the preregistered correction: priorities76.3/76.4/76.5 above lift76, below stronger
patterns and urgent warnings. Full initial outputs retained as an exposed pilot
in research/runs/E057/selection-pilot. Authored corrections and mistaken added
test expectations are recorded in EXPOSURE.md. New certificate definitions,
reply sets, budgets and word limits did not change. The pawn-capture warning
remains selected; an already-attacked rook has no new frozen hanging warning,
but its complete legal capture witness suppresses the distance assurance.

Final target103 tests; cumulative E020–E0572,336 tests, all pass. Maintained
source verification and diff checks pass. Final full run:2,132 cases,2,066
with facts,48 abstentions,18 refused illegal moves; selected comments<=19 words.
Cumulative independent replay:4,247 certificates,288 finite queries,13,083
reply/history edges and33,648 leaves. New classification968 nodes; inherited
trap checks4 on new cases. No engine evaluation or human-outcome measurements.

Final main/repeat/initially clean local clone all exit0 and match source9421697,
normalized input hashes, deterministic outputs and metrics. Clean status empty;
194–196 seconds each. Saved-JSON verifier also hashes actual physical inputs
and outputs, checks selected texts, independently reconstructs68 new labels:
16 rear,28 side,24 distance on44 positive rows;384 legal evasion references,
eight checker captures, eight full-history references. All48 legal negative
rows/four illegal moves checked. Pawn/rook capture, rook interposition and
outside-context promotion blocking are physically executed. Promotion blocking
cannot lie on the eligible ray with its advanced passer beyond its king; this
is an exercised negative context, not a positive proof claim. Moved rooks reset
EP availability. All2,036 ordered inherited full-result fingerprints match
E056 and original-list hash is unchanged. Full evidence2,769,105 bytes<3MB.

Coverage:280 verified names/320 original occurrences,76 partial,689
unimplemented. New names Checking from behind, Checking from the side,
Checking distance, Rook checking distance within the stated geometry and
immediate legal-reply scope. Real-game precision, human learning and extension
readiness remain unmeasured.

[Demo](evidence/demo.html), [tracker](evidence/concept-status.md),
[results](evidence/results.json), [main](evidence/run.json),
[repeat](evidence/repeat-run.json), [clean checkout](evidence/clean-run.json).
Reproduce: `node research/experiments/E057-rook-checking-distance/code/run.mjs --out research/runs/E057/reproduction`.
Guarded D001 test receipts retained; full proofs preserved.

Next:E058 investigate wrong-colored bishop and wrong rook pawn with exact pure
K/B/P-vs-K material, bishop/promotion-square colors, legal corner access and
all immediate responses. Teach the verified promotion-square limitation;
do not infer a drawn ending from geometry alone.
