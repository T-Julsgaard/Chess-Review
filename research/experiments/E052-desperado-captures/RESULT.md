# E052 result: finite desperado capture comparisons

Research only. Usage cutoff and shutdown remain cancelled. The numerical-rating
goal stays paused; no extension changes or push. [Sources](SOURCES.md) supply
definition metadata only. All positions, moves and color/file reflections are
authored synthetic mechanics, with no copied external games or examples.
The original 1,085-entry list remains unchanged.

Opt-in `desperadoTags` labels a threatened knight, bishop, rook or queen taking
its maximum available nominal capture before a conditional unit recapture.
Every legal noncapturing alternative by ANY own unit must admit an enemy
capture of the threatened unit that loses at least its full value immediately
and through EVERY legal own response. Enemy capture delivering checkmate is
recorded explicitly as a terminal loss. A safe quiet retreat, king defense,
castling relocation or response that recovers the material prevents the label.

For the actual capture, EVERY legal enemy capture of the moved unit must leave
a live position. Its nominal gain relative to BEFORE the actual move equals
captured value minus unit value, and EVERY next own response must preserve at
least that balance without a terminal result. Quiet and actual comparisons
both cover three plies. The comment is conditional on recapture and compares
only quiet alternatives; other own captures, best overall move and eventual
game outcome remain outside scope. `qualityClaim` is false.

Example: “Desperado queen: captures 5 points before recapture; every quiet
alternative loses at least 9.” This comment has 15 words. Nominal material is
p1/n3/b3/r5/q9. Full certificates retain canonical FENs, move records, attacked
unit identity, maximum original capture sets, ALL quiet alternatives, explicit
mate losses, ALL actual unit recaptures and ALL own responses. Independent
replay reconstructs this without detector or material helper imports and
verifies the exact comment text against the certified values.

The [plan](plan.md) retains authoring failures: a removed rook did not make Nb8
safe because another rook could capture it; a same-color bishop root was
already dead and was refused by the inherited terminal guard. The corrected
negative uses a safe Nb4, and the terminal-capture case uses mutually attacking
knights. Another retained negative proves an actual-response draw via
Qa8xb8 Rc8xb8 Ka7xb8. No proof rule was weakened. The initial development pilot
predates that added negative and is exposed/stale; final pilot and decisive
runs use the complete fixture set. Orthodox castling is color/rank reflected
but not file reflected, because a d-file king cannot claim orthodox rights.

Validation: 64 new and 1,839 cumulative E020–E052 tests pass, including tampered
certificates, limits, terminal branches, histories and exact comment values.
Maintained-source and diff checks pass. The evaluation covers 1,668
authored/reflected cases: 1,618 with facts, 44 abstentions and six invalid moves
refused. Selected comments remain at most 19 words. Independent replay checks
2,995 certificates, 140 mate queries, 10,147 reply/history edges and 28,420
leaves. New classification uses 429 nodes, with 2,021 inherited trap nodes on
the new fixtures. No new engine search or registered game analysis.

Coverage reaches 267 verified names and 302 original occurrences, with 76
partial and 707 unimplemented. New names are **Desperado** and **Desperado
combination**, within the explicit finite scope above. Checked status means
verified synthetic mechanics, not real-game precision or human learning value.

Main, repeat and initially clean local checkout match source revision
`86d4d2a`, every normalized input hash, deterministic output hash and metric.
All finish in 136–138 seconds; clean working-tree status is empty. Separate
saved-JSON replay verifies 16 new certificates, four each for N/B/R/Q, 28
complete quiet-loss branches (12 enemy mates), 24 quiet-response records, 28
actual recapture branches and 28 actual-response records. It checks all 42
negative cases and explicitly executes safe retreat, material recovery,
castling relocation, missing quiet alternatives and terminal draw witnesses.
All 1,610 inherited full-result fingerprints match E051 in fixture order, and
the original-list hash is unchanged. Retained evidence totals 2,206,239 bytes,
below 3 MB, with full new certificates readable in results.json.

[Demo](evidence/demo.html), [tracker](evidence/concept-status.md),
[results](evidence/results.json), [main](evidence/run.json),
[repeat](evidence/repeat-run.json), [clean checkout](evidence/clean-run.json).
Reproduce with `node research/experiments/E052-desperado-captures/code/run.mjs --out research/runs/E052/reproduction`.
Guarded D001 test receipts are retained. Default-disabled and exhausted
profiles preserve frozen parent facts exactly. Human usefulness and real-game
precision remain unmeasured.

Next: E053 investigate cross-checks with a legally proven before-check ray,
actual interposition and simultaneous countercheck; distinguish the geometric
fact from stronger independently certified defensive or mating benefits.
Keep frozen evidence intact, production separate and commits local.
