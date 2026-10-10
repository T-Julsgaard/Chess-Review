# E153 — new second-target pressure and complete defensive choices

2026-10-10, before implementation/evaluation. Parent E1523276fbd. Authorized
current main, research-only/local commits/no push. D001-test preflight passed.
BUILD-FIRST focused checks/tiny authored pilot; no cumulative or lengthy tests.

Original scopes C0287 creating a second target to overload defense and C0288
attacking several weaknesses across the board. Build a causal comparison, not
another preexisting-duty label or single-piece checking fork. Two designated
enemy isolated pawns are structural targets; isolation is absence of any enemy
pawn on either neighboring file, not proof of strategic weakness. They must
lie on opposite wings (files a-c versus f-h). The actual quiet nonpawn/nonking
relocation is nonchecking, uses a unit distinct from the old target's attacker,
retains that stationary attack and creates contact with the other pawn. There
must be no root legal capture of the new target by any own unit. A legal quiet
same-source alternative must leave the new target unattacked and old attack
intact. Creation means newly attacking an existing isolated pawn; structural
creation of a new weak pawn, long-term switching and positional superiority
remain explicitly unresolved. Never mark the broad principle solved.

Use actual full history. Root legal old-pawn captures identify all stationary
old attackers. After each real actual/alternative move, retain geometric actor
attacker sets for both targets, correctly labeled as contact descriptors. Do
not fabricate an actor turn to claim immediate legal captures. Actual legal
capture evidence comes from the complete genuine opponent-response tree below.
Root full pawn inventory establishes isolation. Target order is old,new.

For BOTH actual and alternative, retain every legal opponent reply, state and
complete actor legal inventory. Track designated pawn identities through an
opponent pawn advance/promotion; after each reply enumerate ALL legal actor
captures of either surviving designated identity, by ANY own unit. For every
capture retain full state, nominal actor balance and ALL legal opponent
counterreplies with balance and terminal flags. No early pruning, no omitted
failed options. p1/n3/b3/r5/q9/k0; gain measured from true BEFORE actual root,
including opponent reply losses and capturing-unit recaptures.

A target-capture option succeeds only if after-capture and all counterreply
states are live, nonempty counters, and every balance exceeds root baseline
by at least one nominal point. Mate/draw branches are outside this metric;
visited fifty-move/threefold claim contexts globally suppress labels. This is
a bounded capture gain, not engine quality, a whole-game win or indefinite gain.

Actual must have a successful target capture after EVERY legal opponent reply.
Each target alone must fail on at least one actual reply; retain full per-target
success/failure maps and exclusive replies demonstrating that BOTH targets are
necessary for coverage. Alternative must fail even with both designated target
choices. Full legal defenses are retained for success and refutation alike.
C0287 gets this causal newly attacked second-target/all-defense capture-policy
scope; C0288 gets distinct attackers and both-wing target necessity under the
same operational isolation/gain definition. No claim a single defender has two
recapture duties unless separately witnessed. Existing E049 remains unchanged.

Interface: default-false weaknessTags wraps E152. Strict maxWeaknessNodes
integer0..50000 default50000. Required weaknessTargets [old,new] exactly two
distinct algebraic squares and weaknessAlternative distinct legal quiet
same-source nonpawn/nonking move. Missing history/targets/alternative yields
explicit prerequisite; invalid supplied types/targets/alternative rejected.
Unsupported actual is reported without new labels. Optional weaknessPanel is
untrusted and independently admitted. Exact disabled parent behavior; exhaustion
atomically drops all new findings/witness. Events qualityClaim:false, <=24words.

Raw schema E153-complete-target-panel-v1: root FEN/history/actor/baseline/legal/
pawns/targets, root capture contacts; sorted two variants with descriptor/state/
checking/target geometric contacts; every opponent descriptor/state/updated target
identity/legal actor moves/all designated target captures; every capture state/
complete legal counters/counter states. Claims include all visited paths. Logical
cost:3wrapper +1context+history length+1root inventory+1root pawn/target snapshot;
per variant1move+1state/contact+1enemy inventory; per opponent reply1move+1state/
target tracking+1actor inventory; per target capture1move+1state+1counter inventory;
per counterreply1move/state. Same cached/fresh cost, exact/one-short atomic tests.

Prospective authored hypotheses (not results): White Kb1 Ra1 Re1 versus Kh8 Nd4
Pa7 Ph6. Actual Re1h1, alternative Re1f1. Old legal Rxa7 exists, new h6 capture
absent root. ...Nb5 can hold a7 but should leave h6 capturable; ...Nf5 can hold
h6 but should leave a7 capturable. No other reply should save both, through all
immediate counterreplies. Second family moves h6 pawn to f6, actual Re1f1 versus
Re1g1. Add Black Rd7 as independent old-target defender: ...Nf5 should refute
first family's two-target policy. Both colors, reversed actual/alternative and
missing-prerequisite/zero-cap controls. Preserve all failed hypotheses/source.

Smoke first, then <=16 authored/reflected cases. Hash-bound smoke/raw reuse.
Focused strict/disabled/parent/history/terminal/claim/EP/promotion/identity/
material/policy/inventory/geometry/isolation/wing/cache/budget and mutation checks.
Independent saved replay imports neither detector, collector nor policy helpers.
Guard all chess/evidence entrypoints, retain receipt/revision/full source closure/
environment/command/null engine+seed/output hashes. Soft compressed target400KB;
no branch omission or costly optimization solely for storage. Source verification
and diff checks. Defer combined full regression, original-occurrence/absence/
priority/history/budget audits, exact main/repeat/initially-clean reproductions,
broad strategic principle and real-game precision/usefulness. Accepted tracker,
production/numerical/shared policy unchanged. Full catalog goal remains open.
