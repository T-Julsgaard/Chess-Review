# E081 prospective direct-contact attack batch

2026-10-08. Register before implementation or position evaluation. Approved
queue ranks28-30: C0404 Direct attack, C0410 Attack on a pawn, C0411 Attack on a
piece. Shared completed E080 parent at5f3b18f; canonical372 occurrences/322 names,
76partial/637unimplemented/713remaining,61 completed coach studies. Existing
E080 pending inputs/evidence frozen; both local repositories clean and same HEAD.
No preregistered study displaced. One compatible batch, separate occurrence gates.

## Bounded claim and interface

Research-only directAttackTags wrapper on exact E080 explainMove/priority.
Strict boolean default only undefined to false; disabled exact E080 including
ignoring new budgets. Enabled maxDirectAttackNodes safe integer0..50000,
undefined-only default50000. Neither explicit null input silently defaults.
Reuse actual history, legalPosition and foundation refusal semantics. Root and
played position must be live; root actor and played opponent must not be in
check for this initial bounded contact claim. Check-only, terminal or unavailable
cases retain parent and abstain. Never broaden Attack/king attack/forced gain/
initiative/good-move labels or duplicate broader occurrence scopes.

Actual moved piece on its destination (promotion identity included) must have
new direct contact with an enemy nonking target. Same piece's original square
must not geometrically attack that target before the move. Complete inventories,
actual transition and root legal moves retained. Pawn/knight/king contact follows
exact capture offsets; B/R/Q requires complete clear direct interior ray.
Require a legal capture by that moved piece of the occupied target on a complete
hypothetical actor-turn played snapshot; clear EP on turn change. This is a
threat model, never an actual second move/pass/history state. En passant capture
of an unoccupied destination is excluded from direct occupied-target contact.
Pinned or otherwise illegal capture contact abstains; defended and recapturable
targets are valid attacks but never called free, profitable or forced captures.
Already existing contact, discovered attack by another piece only, friendly/king
targets, blockers and no legal capture do not qualify. For castling, actual king
is the moved piece; never silently attribute the rook's secondary relocation.

Collect every qualifying target sorted by square and every corresponding legal
capture (including all promotion choices if relevant). New direct-attack event
at priority38, plus attack-on-pawn / attack-on-piece events at priority37 if
that category has qualifying targets. Events carry complete same witness and
explicit category target subset. Parent priorities/tie ordering unchanged;
higher warnings remain selected. Text names category, attacker and one first
sorted target; <=24words, qualityClaimfalse. Untested template: Direct attack
on a piece: your bishop on b5 attacks knight c6. Other targets stay in evidence.
No unqualified best/win/gain/enduring-threat claim. Category event wording may
start Attack on a pawn/piece. Separate positive and negative tracker gates.

## Exact work and independent replay

Charge one tick before root load, each actual history ply, root legal enumeration,
actual transition, each full before/after inventory, each after enemy nonking
candidate geometry scan (including unchanged/noncontact), actor-turn snapshot,
complete hypothetical legal-move enumeration, each contact-to-legal-capture
filter, and each new event attachment. If candidate contact set is empty, avoid
snapshot work. Charge before work; nodeslimit+1 on exhaustion; atomically discard
all new witness/events, exact parent text remains. No source budget/depth/order
changes. Save status/nodes/limit, complete inventories/contact rows and ray cells,
all legal capture UCIs, actual legal moves/history and hypothetical snapshot.

Replayer imports Chess/assert and exact E080 parent/priority, no new detector or
geometry helpers. Enumerate64 squares, derive scalar offsets and interior rays,
reconstruct actual history/played/promotion/castling/EP identity, complete actor
legal set, new-contact difference, target categories, witness/events/text/priority/
selection and exact work separately. Reject forged inventory omissions/target
identity/friendly or king target/pin/capture/ray/blocker/snapshot/history/illegal
edge/status/nodes/event/category/quality/priority/text/selection, including valid
storage with recomputed physical hash. Disabled and exact/one-less budgets replay.

## Prospective gates and retained evidence

Both colors, all six moved piece families with legal candidates (promoted piece
identity separate), all enemy target families p/n/b/r/q, pawn diagonals/knight
jumps/king adjacency/slider diagonal and orthogonal rays, literal file mirrors;
require positives or retain inability without silently forcing coverage. Both
colors require separate pawn and nonpawn category positives before their row
advances. Defended/recapturable target positive, complete multiple targets,
existing unchanged attack, discovered other-piece attack, blocked slider,
pinned attacker, friendly/king targets, actual capture/new contact, promotion,
EP, castling, checking and root/actual terminal/foundation refusal, valid /
malformed/mismatched/illegal history/FEN/UCI, strict flags and budgets,
zero/exact/one-less, default/disabled compatibility and higher-warning selection.
All failed roots and original observations retained; corrected roots added.
No selecting or reordering moves after seeing outcomes to force labels.

D001 preflight and guarded loader before inputs in every runner/test/probe.
Authored synthetic positions only, no new external game acquisition. These are
exposed mechanics, not independent human usefulness or real-game precision.
FIDE Articles3.1.2-3.1.3 distinguish attack geometry from king-safe movement;
this detector conservatively requires both contact and legal capture, and does
not claim pinned pieces never attack squares. Primary rule source metadata:
https://handbook.fide.com/chapter/e012023 (read2026-10-08, no game data acquired).

Cheap guarded core pilot/focused tests before costly collection. Final cumulative
coach suite/source/diff before freeze; three fresh exact cumulative runs including
initially clean detached checkout, independent saved semantic replay, every
ordered5312 E080 fingerprint and original-list hash unchanged. OnlyC0404/C0410/
C0411 may advance;1082 outside rows unchanged. Counts from research:status.
Around900-1100s/run and8MB soft planning targets based on E080; complete lossless
inherited codec/retrieval retains proofs/branches/history/failures/provenance.
No source/HEAD/input mutation during decisive runs. No gate weakening/pruning.
Reuse existing branch/checkouts, reconcile clean main at safe boundaries, import
completed evidence only by existing local FF research/main procedure. No agents,
extension integration, push, numerical resumption, usage cutoff or shutdown.

Next: implement bounded wrapper and independent replay; author guarded small
pilot with both-color pawn/nonpawn contacts and explicit refusal before expansion.