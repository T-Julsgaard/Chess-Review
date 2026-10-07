# E053 result: legal cross-checks and complete check evasions

Research only. Usage cutoff and PC shutdown stay cancelled, numerical-rating
research stays paused, and no extension integration or push occurred. Sources
provide [definition/rule metadata](SOURCES.md) only. All fixtures and color/file
reflections are authored synthetic positions; no source games, FENs or example
sequences were copied. Original 1,085-entry list unchanged.

Opt-in `crossCheckTags` identifies a legal response to check that also checks
the enemy king. It separately certifies interposition on an original checking
ray, capture of a checking piece (including the off-destination EP victim), or
king escape uncovering check. Direct, discovered and double counterchecks,
all four promotion types, and actual mating counterchecks are included.
Exact before and after king/checker identities and clear, correctly typed
checking rays are retained. Every legal enemy check evasion is saved and
independently replayed, with canonical FEN, nominal material delta and terminal
state. Illegal double-check interpositions never receive explanations.

Example: “Cross-check: Ne4+ blocks their check and gives check back.” Nine words.
Checker-capture wording names the captured piece; king escapes say they escape
check. These are neutral facts with `qualityClaim` false, not praise, safety,
material-win or best-move claims. A retained legal example allows Re8xe4,
losing the cross-checking knight. Stronger inherited tactical warnings, mate
and unique-defense comments retain priority.

Checkmate takes precedence at the 100-halfmove clock boundary. Starting at 99,
a quiet mating block remains a cross-check even though chess.js also reports
isDraw(); an ordinary checking block at that boundary is excluded. This rule
is checked separately in detector and independent replay. Full histories,
canonical counters, actual legality and terminal-root guards remain strict.

The [plan](plan.md) records exposed failures and corrections. The first
checker-capture king was off the resulting bishop ray; its correction then
reached K+B versus K and was correctly refused as drawn. Retaining an authored
black pawn produces the intended live checking capture. A no-before-check
negative also needed a pawn to keep its root live. The frozen file mirror
discarded EP rights, making reflected EP moves illegal; a local E053 wrapper
now reflects that field without changing earlier code. The initial 96-case
pilot predates the four clock-boundary cases. Final checks use 100 new cases.

An initial exact main/repeat/clean match at c7f1c28 passed proof replay but
failed retention at 3,090,979 bytes. Full certificates were duplicated inside
demo cards. A local display adapter now keeps boards, comments, highlights
and concept summaries, linking results.json for canonical full proofs. The
display contract test checks that rendering does not mutate the result.
Failed observations, sizes and original outputs remain under
`research/runs/E053/oversize/`; canonical results.json is byte-identical across
the display-only correction. No certificate or retention gate was weakened.

Validation: 107 new and 1,946 cumulative E020–E053 tests pass; maintained-source
and diff checks pass. Evaluation covers 1,768 authored/reflected cases: 1,714
with facts, 44 abstentions and ten invalid moves refused. Selected comments
remain at most 19 words. Independent replay checks 3,439 certificates, 140
mate queries, 10,771 reply/history edges and 28,840 leaves. New classification
uses 476 nodes, with eight inherited trap nodes on new cases. No new engine
search or registered game analysis.

Coverage reaches 268 verified names and 304 original occurrences, with 76
partial and 705 unimplemented. Both original **Cross-check** occurrences are
checked within the explicit legal-mechanism scope. Checked status still means
synthetic mechanics, not independently measured real-game precision, human
learning benefit or extension readiness.

Final main, repeat and initially clean checkout match source revision
`a9fdfb9`, every normalized input hash, deterministic output hash and metric.
Runs finish in 166–168 seconds; clean working-tree status is empty. Separate
saved-JSON replay verifies 72 new certificates: 60 interpositions, eight
checker captures and four king discoveries. It replays 384 exact legal
evasions, eight actual mates, 16 promotions, four EP removals and four full
histories. It checks 24 negative cases plus four newly refused illegal moves
and explicitly executes checker capture, reflected EP, checking draw and
illegal double-check block. All 1,668 inherited full-result fingerprints match
E052 in fixture order, and the original list hash is unchanged. Full retained
evidence totals 2,757,305 bytes, below 3 MB.

[Demo](evidence/demo.html), [tracker](evidence/concept-status.md),
[results](evidence/results.json), [main](evidence/run.json),
[repeat](evidence/repeat-run.json), [clean checkout](evidence/clean-run.json).
Reproduce with `node research/experiments/E053-cross-checks/code/run.mjs --out research/runs/E053/reproduction`.
Guarded D001 test receipts are retained. Default-disabled and exhausted
profiles preserve frozen parent facts exactly.

Next: E054 investigate short attraction, decoy and blocking combination labels
using the existing all-defense mating-offer proofs and independent causal-role
witnesses. Require both the full continuation proof and the named mechanism;
preserve frozen evidence, keep production separate and commits local.
