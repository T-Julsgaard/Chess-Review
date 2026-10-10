# E174 — comparative piece improvement and useful outpost entry

2026-10-10. **Prototype; not accepted evidence.** Preregistered fc10de4, parent
E173 160f7c6. Authorized current main checkout; research-only local commit,
no push. Two narrow occurrence scopes C0523 piece improvement and C0533 creating
an outpost. General positional improvement, outpost creation by pawn exchanges,
permanent safety and enduring strategic value remain unresolved.

Default-disabled `improvementTags` wraps E173 exactly. Require genuine legal
history, enemy-pawn `improvementTarget` and distinct quiet same-unit
`improvementAlternative`. Both first moves must be legal noncapture,
nonpromotion, nonchecking moves by an own nonpawn/nonking unit. Missing controls
abstain; malformed/illegal controls reject. Historical terminal roots abstain.
`maxImprovementNodes` is integer 0–50000, default 50000; optional saved
`improvementPanel` receives independent semantic admission.

C0523 requires the original moved unit to have a complete profitable capture
policy after the actual relocation, while its paired alternative fails. Every
live enemy reply must allow that same unit to capture the tracked target and
retain at least one nominal point relative to the original root through every
immediate legal counterreply. Reply/counter inventories must be nonempty and
endpoints live. Another own unit cannot lend its capture to this proof; target
identity follows advances, promotions and actual en-passant victim squares.

C0533 additionally requires a knight arriving from relative rank below four
onto relative rank four to six, with E070's legal pawn support and complete
conservative pre-promotion enemy-pawn reachability proof. Thus the new entry
combines a supported outpost with an independently demonstrated finite benefit.
E024's narrow placement fact, E070's structural proof and E132's prevention
scope are preserved. This does not prove support durability or general outpost
value, and does not discharge broader outpost creation mechanisms.

Authored White Kb1 Nf3 Pc3 Pf4 versus Black Kh8 Pf5: Nd4 instead of Ne1 lets
the original knight capture f5 after every reply, retaining one point through
every counter. Pc3 supplies legal support, and f5 cannot reach a square attacking
d4 before promoting even under occupancy-ignoring pawn routes. Both labels pass.
Removing Pc3 preserves objective improvement but withholds outpost support.
Adding Black Pc6 preserves improvement but exposes future c5 challenging d4,
withholding only the outpost label. Adding Black Be6 retains Bxf5 recapture after
Nxf5 (gain −2 from root), defeating the profitable policy. Nh4 also covers f5,
so that equally effective alternative withholds comparison. Both colors pass.

The collector adapts E153/E156 complete capture machinery, importing neutral
state/material/move utilities and invoking maintained E070 for actual support/
pawn-route proof. Retain complete root/legal/pawn/material inventories, both
ordered variants, every enemy reply, all target capture attempts by all own
units, all counters, failures, flags and claim contexts. E070 full support,
graphs, replies or challenge refutations are retained as applicable; its work
is charged within this wrapper's atomic budget. Its replacement-knight support
counterframe is explicitly hypothetical evidence, not an actual game position
or a legal pass.

Independent admission reconstructs every legal branch and material ledger with
Chess and E070's independent replay, without detector/collector/context/derive
imports. It reconstructs negative support/eligibility and E070 node costs too.
Independent label replay separately derives the two original-unit policies.
Context/history, panel/history, variant/capture/counter work, E070's full work
and three derivation nodes are charged. Atomic exhaustion drops own witness and
events, preserving parent with limit+1 nodes. Any visited genuine continuation's
fifty-move/repetition claim suppresses labels. Priority 191.1,
`qualityClaim:false`, comments at most 24 words; no production/scoring change.

Development evidence:

- 65 focused checks passed in 9.5 seconds, plus two E173 parent representatives.
  First 64 passed; one bishop relocation example was added to verify the general
  nonknight interface, then the focused suite passed again. No full suite ran.
  Other controls cover legal support under an absolute pawn pin, another unit's
  profitable capture, captured nominee, four target promotions, en passant,
  genuine history charged in context/panel/E070, draw claims, exact/short/fresh/
  outpost-stage caps and 25 semantic witness mutations.
- Guarded D001-test authored synthetic pilot: 20 cases, ten witnesses, six
  positive cases and ten unique panels. Initial smoke supplied five White
  panels; initial pilot collected only the five reflected counterparts.
  Final execution reused all ten panels with zero fresh collection.
- Independent saved semantic replay passed every case, material/unit policy,
  outpost proof/refutation, output hash, inherited snapshot, policy receipt
  and 750 normalized recursive dependency/source hashes, including complete
  parent build. Source verification and diff checks passed.

All initial registered hypotheses passed; no adaptive fixture or gate change
was needed. Compressed observations/results total 52,720 bytes; all retained
evidence totals 188,910 bytes, below the 500KB soft target. Standard gzip decodes
the JSON; `code/replay-saved.mjs` replays it independently. Reuse binds exact
history/root, move pair, target, collector/context dependency closure and receipt.
No engine, tablebase, new real games, human review or locked confirmation used.

Accepted evidence stays E082: 378/1,085 entries (34.8%), 328 names. Separate
build coverage is 420 pending entries in 94 ready batches, zero stale;
798/1,085 accepted-or-candidate entries (73.5%), 287 without candidate code.
Narrow candidates do not discharge broader definitions. Full cumulative
regression, exhaustive occurrence/absence/priority/history/budget audits and
changed main/repeat/initially clean reproductions remain deferred to combined
freeze. Real-game precision and teaching usefulness remain unmeasured.

Next: preregister C0538 exchanging a bad piece and C0539 exchanging the opponent's
good piece, reusing E156 objective-relative effectiveness and genuine exchange
history while preserving the broader strategic-quality prerequisites. Do not
count nominal equal exchanges or piece labels alone as evidence of positional value.
