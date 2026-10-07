# E054 result: causal attraction, decoy and blocking combinations

Research only. Usage cutoff and shutdown remain cancelled; numerical-rating
research stays paused. No extension changes or push. [Sources](SOURCES.md)
provide definition metadata only. Fixtures reuse exposed authored E030/E043
seeds and add authored variations, histories and color/file reflections; no
external boards, games, FENs or example sequences copied. Original 1,085-entry
list unchanged.

Opt-in `namedDecoyTags` adds three short combination labels, requiring the
existing `decoyTags` causal certificate and complete mateDepth2 mating-offer
proof. A positive nominal offer must permit mate on the next own move after
EVERY legal enemy defense. Attraction additionally requires legal king
acceptance, changed king square, and the SAME before-legal nonmating move
becoming actual mate. Decoy requires that king-attraction role or a nonking
self-blocking role; mere defensive-duty deflection is insufficient here.
Blocking requires a nonking acceptance on an adjacent king flight, actual
mate, and a counterfactual removing ONLY that capturer that restores a legal
king escape onto its square. That removal is explicitly artificial, not a
claimed legal played move.

Example: “Blocking combination: if ...Rxg8, Nf7# mates with g8 blocked; every
legal defense permits mate next move.” Another example identifies attraction
with “if ...Kxg7, Ne6#”. Acceptance is conditional, while the full continuation
proof covers every defense. Comments have `qualityClaim` false and do not claim
a unique best move or player intention. More urgent inherited warnings and
actual mating/unique-defense facts retain priority.

Full mating-decoy certificates remain in each result. New events contain
same-row references, exact eligible-role keys and the selected key, original
and actual FEN/move/color, nominal cost and complete defense keys. Independent
replay requires resolving the full same-row parent certificate and revalidates
its all-defense mate and exact complete causal roles. It rejects absent,
foreign or ambiguous proofs, omitted branches or roles, falsified causal
counterfactuals, changed text and mismatched histories/counters. Compact demo
cards link full results.json; new labels do not duplicate bulk mate trees.

The [plan](plan.md) retains meaningful positive and negative observations.
Adding white Ne7 leaves the deflection mate intact but makes g8 unsafe even
without the accepted rook, so self-blocking labels disappear. With Rd8,
adding black Ne7 produces two acceptors, each self-blocking and mating. With
Rf8, the alternative Nxg8 instead permits Nf7+ Rxf7 and refutes the full mate
claim, despite Rxg8 allowing the named line. A quiet mating pawn offer has
legal declined defenses but no eligible causal role; adding Rh4 permits the
declining countercheck Rh6+, after which no legal own reply mates immediately.
Equal trade, missing helper/acceptance, disabled and exhausted prerequisites
also prevent names. No proof gate was weakened.

Capturing offers are included: rook5 minus captured bishop3, and bishop3 minus
captured pawn1, each has nominal cost2 and passes the unchanged full proofs.
The exposed 72-case development pilot predates these eight reflected cases;
final targeted/cumulative and decisive evaluations use all 80 new cases.

Validation: 87 new and 2,033 cumulative E020–E054 tests pass. Maintained-source
and diff checks pass. Evaluation covers 1,848 authored/reflected cases: 1,794
with facts, 44 abstentions and ten invalid moves refused. Selected comments
remain at most 19 words. Replay verifies 3,799 certificates, 216 mate queries,
11,651 replayed reply/history edges and 31,852 leaves. New classification uses
364 nodes; parent causal checks use 296 and finite mate queries 702 nodes on
new cases, with 44 inherited trap nodes. No new engine or registered game
analysis. Synthetic mechanics only; real-game precision and human learning
benefit remain unmeasured.

Coverage reaches 271 verified names and 307 original occurrences, with 76
partial and 702 unimplemented. New names: **Attraction combination**, **Decoy
combination**, **Blocking combination**, within the stated mating-offer and
escape-blocking scope. Checked status is not general strategic correctness
or extension readiness.

Main, repeat and initially clean local checkout match source revision
`2471253`, every normalized input hash, deterministic output hash and metric.
All finish in 169–173 seconds; clean working-tree status is empty. Saved-JSON
replay verifies 64 new labels: eight attraction, 32 decoy and 24 blocking,
across 32 positive rows. Their 88 role references resolve to 32 complete parent
certificates containing 56 causal roles and 36 complete enemy-defense branches.
Four positive rows retain full histories. It checks all 48 names-absent cases
and physically executes both mating acceptances, the defender recapture
refutation, declined-offer mate, and declining countercheck. All 1,768 inherited
full-result fingerprints match E053 in fixture order; original-list hash is
unchanged. Full retained evidence totals 2,753,435 bytes, below 3 MB.

[Demo](evidence/demo.html), [tracker](evidence/concept-status.md),
[results](evidence/results.json), [main](evidence/run.json),
[repeat](evidence/repeat-run.json), [clean checkout](evidence/clean-run.json).
Reproduce with `node research/experiments/E054-causal-mating-combinations/code/run.mjs --out research/runs/E054/reproduction`.
Guarded D001 test receipts retained. Default-disabled and exhausted
classification profiles preserve frozen parent facts exactly.

Next: E055 investigate intermediate sacrifices using a history-confirmed last
enemy capture, an originally legal recapture, a different actual sacrifice
offer and complete all-defense mating proof. Distinguish verified timing from
ordinary sacrifice offers; preserve frozen evidence and keep commits local.
