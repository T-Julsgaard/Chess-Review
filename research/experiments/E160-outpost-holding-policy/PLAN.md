# E160 — bounded outpost holding and actual exchange policy

2026-10-10 prospective batch; parent E159 a6d4b7e. Current main authorized,
research-only local commits, no push. Reuse E070 accepted initial outpost proof
without edits; C0321 general knight scope and C0701 knight-ending scope receive
only the additional bounded holding/exchange candidate. General permanence,
optimality, endgame outcome and real-game usefulness remain unresolved.

Actual move quiet nonchecking knight arrival on c-f relative ranks4-6, complete
true history required. E070 must prove legal pawn support and complete enemy
pre-promotion pawn-route exclusion. Retain its exact certificate/replies and
independently replay with frozen E070 replay.mjs. Its explicitly registered
support counterframe remains initial evidence only; new holding/exchange queries
use actual alternating history exclusively, no artificial turns/piece removals.

For every legal enemy reply retain all legal own moves. If original knight remains
on the outpost, candidate responses are quiet nonpromotion moves by another unit.
Require live response and >=1 original legally supporting pawn still on its
original square, geometrically supporting the outpost. For every legal enemy
counterreply require live position, same original knight on outpost, >=1 original
supporting pawn unchanged/geometrically supporting and own nominal material
balance >= balance before actual quiet knight move. Save every counterreply.
This is retention through two enemy turns, not future invulnerability.

If enemy reply captures original knight on the outpost with N/B/R/Q, candidate
responses are actual legal recaptures by an originally supporting pawn onto that
square, capturing that same enemy piece. Require live response and material
balance >= original baseline; after every enemy counterreply require live,
that recapturing pawn still on outpost and material balance >= baseline. Save all
legal recaptures, successes and failures. No unsupported promise that knight itself
survives an exchange. Both response types require nonempty counter inventories;
claim-rule states anywhere visited withhold whole candidate, not cherry-picked
good branches. All terminal/claim flags and response failure reasons retained.

Each enemy reply must have >=1 successful response. Complete policy witness
retains every enemy reply, own legal inventory, every eligible response and every
enemy counterreply; no truncation or favorable reply sampling. C0321 requires
initial admission and complete policy. C0701 additionally requires all root units
kings/knights/pawns, >=1 knight each side. Its occurrence scope remains distinct.
No standalone relabeling of E070 geometry receives new credit.

Interface default-disabled outpostHoldingTags wraps E159 exactly. Strict optional
maxOutpostHoldingNodes integer0..50000 default50000; optional outpostHoldingPanel
complete raw holding panel. Strict boolean. Missing history reports prerequisite;
wrong current piece, capture/promotion/check, outside c-f rank4-6 or failed initial
outpost admission withholds new finding. Own cap covers wrapper3, exact E070
initial query nodes and raw panel nodes. Initial E070 small query repeats only
to admit exact matching cached initial certificate; raw holding searches reused.
Exhaustion atomic, no new witness/event. Existing inherited flags/caps separate.
Events knight-outpost-holding-policy then knight-ending-outpost-holding-policy,
qualityClaim:false, <=24 words, priority188.6. Text explicitly bounds horizon.

Raw work:1 validate history,1 construct initial position,1 per history ply,
1 root metadata,1 actual move,1 actual metadata, then per enemy reply1 play,
1 metadata,1 own legal inventory; per eligible own response1 play,1 metadata,
1 enemy legal inventory; per counterreply1 play+metadata. Cost5+history length
plus3 per enemy reply+3 per eligible own response+1 per counterreply. Full legal
inventories included in metadata where requested, never charged by hidden search.
Independent verifier imports no collector/derive/detector and reconstructs all
actual histories, flags, material, inventories, policies and event scopes.

Prospective authored base White Ka1 Nd4 Pe4 vs Black Kh8 Ng7 Pa7; actual Nf5.
Expect complete holding and actual ...Nxf5/exf5 policy, both scopes. Add Black
Ra5: ...Rxf5/exf5/Nxf5 refutes pawn retention despite material gain. Replace
Ng7 by Nb7: ...Nd6 threatens Nf5 on next enemy turn, refuting fixed-square hold.
Add own Bb1: general scope only, no knight-ending label. Add Black Re8: ...Rxe4
removes original support. Remove Pa7: no-pawn initial graph explicitly vacuous,
holding still requires actual support. Six white smoke families, 16case both-color
pilot adds missing history and zero budget. Retain failures and dated amendments
before changed evaluations; no weakening policy to obtain a passing fixture.

Guarded D001-test preflight/receipts in all chess entrypoints, explicitly authored
synthetic positions; no acquired games, engine or tablebase. Reuse exact compatible
smoke panels, hash all source/dependency closure including E159 build. Soft500KB
compressed evidence target, storage overruns documented rather than branch/cap
relaxation. Focused strict/disabled/positive/negative/history/budget/mutation checks,
cheap pilot and independent saved replay now. Full cumulative/exhaustive scope/
priority/integration audits and exact main/repeat/initially clean reproductions
deferred to combined freeze. Full catalog goal remains active.
