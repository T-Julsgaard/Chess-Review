# E161 — comparative queen activity and opposing-army capture objectives

2026-10-10. Prototype, not accepted research. Preregistered4d1bb75, parent E160
573a3f0. Authorized current main, research-only/local commits/no push. Six original
bounded scopes C0360/C0722, C0371/C0884, C0372/C0885. Distinct queen-ending and
strategic-imbalance contexts retained. General queen activity, army superiority,
piece valuation, optimal move, winning endgame outcome and lasting strength remain
unresolved; these candidates do not complete the broader catalog definitions.

Default-disabled queenActivityTags wraps E160 exactly. Strict queenObjectiveTarget
enemy pawn square, queenAlternative distinct legal quiet nonchecking same-queen
UCI and maxQueenActivityNodes integer0..50000 default50000. Optional complete
queenActivityPanels {actual,alternative} independently admitted. Full true history
required; missing history/objective/alternative explicit. Wrong actual piece,
capture/promotion/check gets prerequisite; invalid types/targets and illegal/
capturing/checking/wrong-source alternatives reject. Own global atomic budget
wrapper3+context(3+history length)+both raw panel.nodes; no partial witness/event
on exhaustion. Existing parent flags/budgets remain separate. Parent findings
preserved; qualityClaim:false and all new comments<=24words, priority188.7.

C0360 requires no root legal capture of declared pawn by this queen, new actual
queen contact and complete actual capture policy after EVERY legal enemy reply.
Only that moved queen's capture counts; full legal own inventory and all own
target captures remain raw evidence. Capture and every enemy counter must be live,
counter inventory nonempty, original queen remains on capture destination, and
root-relative nominal material gain>=1 throughout. Alternative from identical true
root/history must fail, with complete defense refutations. Every target move and
promotion retains identity; material includes opponent promotions and all losses.
Any visited fifty/threefold state withholds whole finding. No fake turn, removal
intervention, geometric-only or mobility-count substitute for actual capture proof.

C0722 adds kings/pawns/queens-only root with queens on BOTH sides. C0371/C0884
add exact actorQ versus enemyRR nonpawn armies; C0372/C0885 add actorQ versus
enemyR+N or R+B. Pawn constraints remain explicit. These establish the stated
queen-side plan against the full opposing army and failed alternative, not a
general queen-versus-army value theorem or opposite-side resource comparison.

Frozen E156 collector reused unchanged with one nominated queen. Its search maps
units and collects all captures without cardinality-dependent pruning; projection
changes schema/source label to E161-queen-capture-panel-v1/E156-single-queen-
projection. This is a new contract, not a valid E156 two-equal-unit certificate.
Own independent verifier prospectively adapts full E156 legal replay to exactly
one own queen/new schema; no collector/derive/detector imports. Own independent
checker reconstructs full genuine root context, both legal trees, queen survival/
gain policies, contacts, refutations, ending/army scopes, nodes and events. Whole
witness failures use compact deep-strict diagnostics. Shared Chess semantics remain
a limitation. Full parent build and recursive static/dynamic closure retained.

Three failed authored fixture sets honestly retained. Initial queen-ending case
fails ...Kc2/Qxa3/...b1=Q; one successful ...Kc1 branch cannot hide promotion loss.
Rook/minor cases likewise vacate b1 for promotion. First amendment moves own king
to d3 for queen-ending cases, forcing ...Kc1 and preserving genuine Pb2 pin after
Qxa3; independent rook moves b3->b8 to keep actual legal. Imbalance Pb2->Pb3 avoids
same immediate promotion. Second smoke still refutes Nb1 by ...Nxa3 after target
capture. Moving knight to c1 fixes capture but permits vacated ...a1=Q/...b1=Q.
Third amendment retains rook-knight coverage by restoring Nb1, adding Pa4/Pa5 and
declaring targeta5. Blocked a-pawn stack and target square color then prevent those
specific promotion/recapture failures within stated horizon. Every legal reply/
counter still tested. No policy, material, queen-survival, claim or budget gate
relaxed. Three archives retain all36 failed raw panels, full reports and sources.
These differently authored local positions are not isolated value interventions.

Corrected queen-ending base White Kd3 Qf6 vs Black Kb1 Qa1 Pa2 Pb2 Pa3. Actual
Qa6 versus Qf7, targeta3; ...Kc1/Qxa3 retains gain1 through all counters. Adding
own Na8 preserves general activity but excludes queen-ending scope. Black Rb8
supplies ...Rb3+ and other complete refutations. Alternative Qd6 also covers
objective, correctly withholding contrast. Two-rook root White Kh8 Qf6 vs Kh1
Ra1 Rb1 Pa2 Pa3 Pb3, targeta3, with10 actual defenses. Rook-knight root replaces
Rb1 by Nb1 and adds Pa4/Pa5, targeta5, with6 actual defenses. Both imbalance roots
have balance-4, so nominal material lead cannot supply success. Focused bishop
counterpart uses Bb1 and targeta3, passes same policy; extra own knight disqualifies
exact army label while preserving general queen-activity finding.

Six final white smoke families pass. Twelve both-color comparisons/24 panels,
costs30/30/30/30/284/284/36/36/266/266/135/135. Six smoke comparisons/12 panels
reused after exact source/input binding; only six reflected comparisons/12 panels
freshly collected. All collection witnesses independently checked. Guarded D001-
test receipt retained; all positions authored synthetic, no acquired games/engine/
tablebase. Existing different-position observations not substituted. Original
single-queen contract and frozen collector source/dependencies explicit throughout.

52 focused checks pass5.5seconds, plus2 representative E160 parent checks.
Both colors, default-disabled/strict, fresh/cache, exact/one-short atomic caps,
single-unit contract, genuine same-root alternative, extra knight/general-only,
independent checking defender, both-successful negative, exact RR/RN/RB scopes,
negative baseline, missing inputs/wrong targets/alternatives/checking actual,
already-available root capture refusal, true4ply prefix charged+12, all four tracked
target promotions, other-unit EP victim retained but not queen success, claim
suppression,20 independent history/inventory/identity/policy/army/cost mutations
and caller/event metadata. No cumulative suite or lengthy reproduction attempted.

Guarded16case pilot passes:8 positives,12 witnesses, two each missing history/
zero cap. First saved replay exposed copied legacy maxOutpostHoldingNodes option
in its zero-cap assertion; source/error/original run manifest retained in
replay-cap-field-failure.json. Corrected only to maxQueenActivityNodes; no detector
or chess-data change. Metadata/pilot refreshed to bind corrected replayer; no raw
search recollection. Current independent replay passes all24 full legal panels,
contexts/policies/scope gates, inherited snapshots, six exact smoke fingerprints,
receipts, commands/environment and536 normalized source/dependency hashes. Pilot
output and replay process rows incrementally. Canonical pilot copies byte-identical
to replayed run, replay passes there too:
node research/experiments/E161-queen-activity-objectives/code/replay-saved.mjs
Source verification/diff checks pass; full E160 build and behavioral closure bound.

Evidence bytes: observations61,341, smoke34,426, results86,201(1,192,973plain),
three failure archives60,573/58,055/58,837, run.json76,779, replay repair84,204;
total520,416. Compressed artifacts359,433bytes within500KB soft target. All branches,
failed hypotheses and harness repair preserved; no gate/storage cap relaxed.

Accepted E082 unchanged:378/1085(34.8%),328 names,63 accepted studies. Build389
provisional entries,81 ready/0 stale batches;767 accepted-or-candidate(70.7%),
318 without ready code. Production, numerical work, accepted tracker and shared
policy unchanged. Combined cumulative/exhaustive occurrence/absence/priority/
history/budget audits and exact main/repeat/initially clean reproductions remain
deferred to combined freeze. General activity, Q-versus-army strength, outcome,
opposite-side plans and real-game precision/human usefulness remain unresolved.
Full catalog goal stays active; earlier prerequisite work not deleted.

Next approved compatible ranks: C0375 exposed queen, C0379 queen domination of
weak squares, then C0383 exposed king and C0386/C0603 king activation. Audit
existing complete threat/objective/alternative proofs for reuse; require actual
consequences and distinct ending scopes, not geometric exposure alone.
