# E168 — forcing a new isolated pawn weakness

2026-10-10, prospective provisional coach build. Parent E167 d1bb2da. Original
C0429 rank377. Current main authorized for research-only local commits, no push.
Follow BUILD-FIRST.md: focused checks/small synthetic pilot, combined validation
later. Preserve all broader strategic meanings and remaining catalog work.

Question: can a checking move force a previously nonisolated enemy pawn to become
isolated on every legal defense, with a complete target-capture/mate exploitation
policy, whereas a legal quiet same-unit alternative admits structural and
tactical escape? This is bounded forcing of a new structural weakness, not
geometric isolation alone, general pawn weakness value or best-move quality.

Default-disabled forcedWeaknessTags wraps E167 exactly. maxForcedWeaknessNodes
integer0..50000 default50000; weaknessMatePlies integer0..3 default2. Required
actual history, weaknessPawn target square and quiet same-unit weaknessQuiet
alternative UCI. Optional forcedWeaknessPanel supplies complete raw observations.
Missing prerequisites abstain; malformed/illegal supplied inputs reject. Actual
must check, quiet alternative must be distinct/legal/noncapturing/nonchecking.
Target must remain the original enemy pawn at its square through actual move and
defenses. Root isolation (absence of any own pawn on either adjacent file) must
be false. Every actual defense must be a pawn move leaving target newly isolated
and have at least one legal capture of that target forcing mate within declared
H from the genuine capture endpoint. Full legal defense and target-capture
inventories, failures, states, query proof trees and exploration ticks retained.
Alternative must have a live reply retaining target nonisolation and no winning
target capture. No fabricated turn, null move or material-value substitution.

Collector schema E168-forced-weakness-panel-v1, root/history/actor/target/H,
root state and adjacent-file pawn squares; two ordered actual/quiet variants,
played move and state, every legal defensive move with state/adjacent-file pawn
squares/full sorted target capture inventory; every capture endpoint and frozen
E144 tracedQuery (E029 finite mate). All inventories close at terminal/claim.
Any visited fifty/threefold suppresses own label. Genuine historical terminal
roots abstain. Atomic budget exhaustion drops own evidence/events and preserves
parent. No partial positive. Logical cost1 root plus history length,1 variant,
1 defense,1 target capture plus every query tick; derived work1 plus each defense
and capture. Context cost3 plus history length. Independent checker reconstructs
every field, inventory, cost and history from Chess and E144 replayTrace, without
detector/collector/derive imports. Own final labels independently derived.

Prospective UNQUERIED synthetic candidate retained in E167/NEXT.md: White
Ka1 Qg5 Ra5 Rg1 Ne7 Ne4 versus Black Kh8 Pg7 Pf6. Qh6+ versus Qf4. Hypothesis
only ...gxh6, isolating f6; Nxf6 ...h5 Rxh5#. Quiet ...g6 keeps f6 nonisolated
and may escape same H2 target-capture mate policy. Add BlackNg8 to permit ...Nxh6
as a nonpawn structural refutation. White/Black reflection, H0 short bound,
already-isolated root, missing history/target/alternative and zero budget controls.
If any hypothesis fails retain source/raw/error and dated amendment before change.
No results inspected before this plan. No existing identical question/raw proof
found: E167 certifies existing isolated targets, not forced new isolation.

Smoke before pilot; <=16 authored synthetic cases guarded by D001-test loader
and receipt (no real-game contents/new acquisitions). Focused positive/negative,
strict/missing/disabled/history/claim/budget controls and semantic mutations;
two E167 parent representatives. Cache raw panels only under exact full recursive
collector/input/history/H bindings. Build binds full normalized dependencies,
parent build, plan/exposure and own tests. Independent saved replay every retained
witness; inherit parent output exactly. Soft500KB evidence target, retain required
failures even over target. Source verification/diff checks, RESULT and INDEX,
coherent local commit. General weakness value, real-game precision/usefulness,
cumulative/exhaustive original-occurrence/priority/absence/history/budget audits
and changed main/repeat/clean reproductions remain combined-freeze work.

Next approved family C0446/C0868 passive defense rank378 then C0448 counterplay379.
Require actual comparative defensive resources and complete refutations, preserving
their strategic limits rather than counting quiet moves or attacks as quality.
