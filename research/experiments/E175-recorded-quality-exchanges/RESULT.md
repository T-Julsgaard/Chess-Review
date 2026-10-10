# E175 — recorded exchanges of objective-relative weak/active minors

2026-10-10. **Prototype, not accepted evidence.** Preregistered e617e23, parent
E174 d894558. Authorized current main checkout; research-only local commit,
no push. Separate occurrence scopes C0538 exchanging a bad piece and C0539
exchanging the opponent's good piece. General piece quality, optimal exchange,
positional compensation and lasting strategic value remain unresolved.

Default-disabled `exchangeQualityTags` wraps E174 exactly. Require genuine legal
history and four square controls: `exchangeQualityOwnTarget`,
`exchangeQualityEnemyTarget`, `exchangeQualityOwnComparator`,
`exchangeQualityEnemyComparator`. Targets are surviving opposing/own pawns;
comparators are surviving equal-value own/enemy minors. Missing controls abstain;
malformed/illegal controls reject. Historical terminal roots abstain.
`maxExchangeQualityNodes` is integer 0–50000, default 50000; optional complete
`exchangeQualityPanel` receives independent semantic admission.

Final four recorded plies must be own quiet preparation, enemy quiet waiting,
own capture of an equal-valued enemy B/N and enemy N/B/R/Q recapture of that
mover on the exchange square. Waiting is nonpawn and cannot move either enemy
nominee; recapturer differs from the enemy comparator. No promotion or en passant
in the exchange. Checking captures are permitted. Target/comparator identity,
pawn placement and nominal balance agree across the proof frames and root.
Broader histories, rook/queen trades and strategic interpretations remain open.

Three genuine frames are reconstructed from full legal prefixes:

- Own quality immediately before its exchange capture, with own side to move.
- Enemy quality immediately before the recorded waiting move, with enemy to move.
- Actual root, where the current move must capture the original own target using
  the surviving own comparator.

Each frame retains all legal target captures by every unit and every immediate
counterreply. A nominated minor has a resource when one of its own target
captures reaches a live position and preserves nonnegative nominal gain against
that frame's baseline through every nonempty live counterreply. This registered
non-loss resource is distinct from E156's stricter profitable future policy.
Other pieces cannot lend their capture to a nominee's proof. No FEN turn swap,
null move or manually removed unit supplies a genuine proof frame.

C0538 requires the removed own minor to lack its pre-trade resource while the
equal-value survivor had it and retains the actual current capture resource.
C0539 independently requires the removed enemy minor to have its resource on
its earlier genuine turn while the enemy comparator lacked it, plus current own
resource preservation. Enemy quality is historical; it is not asserted unchanged
after the waiting move. Neither label proves that trading beats declining it.

Authored initial White Kc1 Bc4 Nf3 Pe3 Pe4 versus Black Kh8 Rg8 Bg5 Na8 Pf7,
history Kb1 Kh7 Nxg5+ Rxg5, current Bxf7. Own Nf3 lacks the f7 capture; Bc4 has
it with minimum gain zero before the trade. Enemy Bg5 has Bxe3 with minimum
gain zero on its earlier actual turn, while Na8 lacks it. Current Bxf7 retains
one point. Both labels pass. A d4 target/Bc3 case makes both own nominees effective,
emitting only C0539. A second enemy bishop on g1 with White Kc1 makes both enemy
nominees effective, emitting only C0538. Extra Black Be8 answers current Bxf7
with Bxf7 (gain −2), withholding both. Both colors pass.

A separately preregistered focused isolator uses White Bc2, removes Pe4 and moves
the Black target to f5. Both historical quality contrasts still pass, but after
the recorded recapture the rook on g5 answers current Bxf5+ with Rxf5. The shared
preservation gate correctly withholds both labels. Its complete saved panel is
independently replayed alongside the pilot.

Raw evidence retains the full four-ply certificate, original unit identities,
exact prefix timestamps, actors, targets, nominees, pawn/material inventories,
all legal target captures/counters, failed states, terminal/draw flags, claims
and node ledger. Independent reconstruction and label checking import no
detector, collector, context or derivation code. Shared Chess semantics remain
a limitation. Context/history, every frame reconstruction, captures/counters
and four derivation nodes are charged. Exhaustion atomically discards own
events/witness and preserves parent with limit+1 nodes. Visited genuine draw
claims suppress labels; captures correctly reset clocks rather than inheriting
pre-capture quiet counts. Priority 191.3, qualityClaim:false, comments <=24 words.

Development evidence:

- 71 focused checks passed in 12.3 seconds, plus two E174 parent representatives.
  Checks include both separating labels, current preservation failure, unequal
  victim/history prerequisites, temporal/comparator identity, real clock reset,
  terminal history/repetition, exact/short/fresh budgets, 29 semantic mutations
  and parent-compatible FEN spelling. No cumulative suite ran.
- Guarded D001-test authored pilot: 20 cases, eight witnesses, six positive cases,
  eight unique panels. Corrected smoke supplied four White panels; initial pilot
  collected only four reflected counterparts. Final execution reused all eight
  with zero fresh collection.
- Independent saved replay passed the entire pilot plus four extra witnesses
  (three retained initial smoke rows and current-preservation isolator), output
  hashes, policy receipts, inherited snapshots and 767 normalized recursive
  source/dependency hashes, including full parent build. Source and diff checks pass.

Two development failures are preserved. The original Be6 negative blocked Bc4–f7
and was rejected before collecting its panel; three earlier panels were already
checkpointed and reused. Original sources, error and complete partial smoke are
under `evidence/initial-blocked-capture-hypothesis/`. The amended Be8 input permits
the intended losing capture. A later interface check incorrectly assumed the
parent normalizes its returned `before` text; E020 preserves caller spelling.
Failed source variants, log and dependency bindings are retained under
`evidence/failed-fen-normalization-assumption/`. Final behavior preserves parent
text while independently verifying its canonical historical position and both
parent endpoints. The dated amendment records timing; no scientific gate changed.

Compressed observations/results total 55,966 bytes; all retained evidence totals
282,853 bytes, below the 500KB soft target. Standard gzip decodes JSON;
`code/replay-saved.mjs` semantically replays pilot and extra saved witnesses.
Reuse binds exact full history/root/move/targets/comparators, collector/context
closure and receipt. No engine, tablebase, new real games, human review or locked
confirmation used. Production/numerical behavior and accepted tracker unchanged.

Accepted evidence remains E082: 378/1,085 entries (34.8%), 328 names. Separate
build coverage: 422 pending entries in 95 ready batches, zero stale;
800/1,085 accepted-or-candidate entries (73.7%), 285 without candidate code.
Narrow scopes do not discharge the broader definitions. Full cumulative
regression, exhaustive occurrence/absence/priority/history/budget audits and
changed main/repeat/initially clean reproductions remain deferred to combined
freeze. Real-game precision and teaching usefulness remain unmeasured.

Next: audit C0541–C0543 fixing/inducing/creating a second weakness against existing
forcing and second-target proofs, then preregister the remaining compatible
scopes. Preserve original occurrence context; do not transfer coverage by name alone.
