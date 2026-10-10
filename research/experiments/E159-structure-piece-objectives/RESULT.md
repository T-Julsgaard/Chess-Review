# E159 — pawn structure and bishop/knight capture objectives

2026-10-10. Prototype, not accepted research. Preregistered de1e84b, parent
E158 1c80b51. Authorized current main; research-only, local commits, no push.
Four original provisional scopes C0319/C0329/C0338/C0339. Specific complete
capture objectives under recorded pawn structure, not general piece strength,
best placement, strategic intent, endgame outcome or durable positional value.

Default-disabled structurePieceTags wraps E158 exactly. Strict opened-bishop or
closed-knight mode; two distinct own source squares ordered bishop then knight;
two opposite-wing enemy pawn targets in opened mode, one in closed mode. Opened
mode requires a legal quiet prior bishop alternative from the same source.
maxStructurePieceNodes integer0..50000, default50000; optional four/one complete
E156 panels independently admitted. Missing history/mode/objectives/alternative/
exchange/piece move reports prerequisites. Invalid types, source units, target
counts/ownership and illegal prior alternatives reject. Full genuine histories;
no fake turns, removal interventions, engine or tablebase. Global atomic cap
includes context and every policy; exhaustion retains no partial proof/event.
Parent events preserved, qualityClaim:false and every new comment <=24 words.

Opened comparison requires recorded own pawn captures enemy pawn, then enemy
nonpawn/king recaptures it on that square. Exactly two pawns removed, nominal
balance unchanged, both original units and targets retained. Actual quiet bishop
placement follows a diagonal previously blocked solely by the exchanged own
pawn; that move was illegal before the trade and legal now. C0319 requires
complete all-defense bishop capture policy on both targets now, and failure on
both under the true prior alternative. C0338 additionally requires equal-value
knight failure on both targets with complete refutations. C0329 labels only this
explicitly objective-limited knight. Separate available policies never promise
sequential capture of both pawns or general bishop superiority.

Closed comparison requires every in-board bishop diagonal exit blocked by an
own pawn rammed against an immediately opposing enemy pawn. After every legal
enemy reply the bishop has no legal move; tracked target lies on its diagonal
with precisely one blocker, an own ram pawn. C0339 additionally requires complete
knight capture policy and failed bishop policy. All legal replies, counterreplies,
terminal/claim flags, targets, rays, blockers and rams remain in the witness.
Later ram breaks, alternative plans and lasting knight strength remain open.

Context cost3+full history length; wrapper3 plus exact E1563+panel.nodes per
comparison. Independent context verifier reconstructs every history snapshot,
legal inventory, army, pawn count, material, flag and prior context without the
builder. Independent comparison checker uses frozen E156 semantic replay, with
its own geometry/rams and event derivation rather than importing the candidate.
Shared Chess rule semantics remain a limitation. Actual checking moves and
visited claim-rule prerequisites withhold E159 findings.

Initial closed positive failed: White Kh8 leaves Bf1 undefended. After ...Kg1,
Nxb5/Kxf1 loses3 for pawn1, correctly defeating the knight policy despite ram
geometry. All six initial complete comparisons retained with original sources,
hashes, full raw panels and errors in failure-undefended-bishop.json.gz. Dated
AMENDMENT moves only closed-family own king to e1, protecting Bf1, before the
corrected tiny smoke. No definition, threshold, detector or gate relaxed. Both
closed negatives and all opened hypotheses were retained.

Corrected opened base: White Kh8 Bf1 Na1 Pe2 Pf6 Pa5; Black Kg4 Pf3 Pf7 Pa6.
Recorded exf3+/Kxf3, actual Bc4 versus true prior Bg2, targets a6/f7. Pawn count
6->4 and balance6 unchanged; cleared f1-e2-d3-c4 diagonal enables both bishop
capture policies while Na1 fails both. Add Black Na8: ...Nc7 and ...Nxa6 defeat
the bishop objective. Replace own Kh8/Na1 with Kg8/Nh8: knight covers f7, keeping
only the opening benefit while suppressing both-wing/limited-knight findings.

Corrected closed base: White Ke1 Bf1 Nd1 Pe2 Pg2 Pb4; Black Kh1 Pe3 Pg3 Pb5.
Actual Nc3, target b5; e2/e3 and g2/g3 rams block Bf1, while knight covers every
defense. Add Black Ra5: knight policy fails. Remove enemy Pe3: knight policy
still passes, but missing ram correctly vetoes the closed label.

Six corrected white smoke families pass. Twelve complete comparisons/30 panels,
costs290/290/407/407/634/634/31/31/169/169/31/31. Six white comparisons/15 panels
reused with exact kernel/input hashes; only six reflected comparisons/15 panels
freshly collected. Frozen E156 collector and independent verifier reused without
changes. Guarded D001-test receipt retained; all positions explicitly authored,
no acquired games. Existing different-position proofs were not substituted.

54 focused checks pass in5.7seconds, plus2 representative E158 parent checks.
Positive/negative both colors, strict/default-disabled, fresh/cache equality,
exact/one-short atomic caps, legal opening ray, checking historical capture,
independent defender, one-wing knight, full closed rams, nonram veto, missing
prerequisites, wrong source/target/alternative, genuine four-ply prior prefix
charged+20, fifty-move abstention, 24 independent witness mutations and caller/
event metadata admission. No cumulative suite or lengthy reproduction.

Guarded16case pilot:6 positive,12 witnesses, two each missing history and zero
cap. Independent saved replay checks full contexts, all30 legal panels, child
policies, comparison admission, inherited snapshots, six-smoke reuse, receipts,
environment/commands and494 normalized source/dependency hashes. Canonical
pilot copies byte-identical to replayed outputs; replay passes there too:
node research/experiments/E159-structure-piece-objectives/code/replay-saved.mjs
Source verification and diff checks pass. Full parent build and recursive static/
dynamic behavioral dependency closure included; text LF-normalized, binary exact.

Evidence bytes: observations61,406, smoke50,695, results115,837(1,680,364 plain),
failure74,092, run.json70,773; total372,803. Compressed evidence302,030bytes is
within the prospective500KB soft target. Complete failures and branches retained
losslessly; no scientific or runtime gate changed to save storage.

Outpost audit retains E070's accepted C0268/C0558/C0269 conservative pawn-route/
support proof. C0321/C0701 have distinct knight/knight-ending scopes and missing
future exchange/permanence work. OUTPOST-AUDIT.md documents genuine reuse and
receives no new credit. Batching compatible C0329/C0338/C0339 with preceding
C0319 was preregistered; no catalog entry or outpost follow-up was deleted.

Accepted E082 unchanged:378/1085(34.8%),328 names,63 accepted studies. Build381
provisional entries,79 ready/0 stale batches;759 accepted-or-candidate(70.0%),
326 without ready code. Production, numerical work, accepted tracker and shared
policy unchanged. Combined cumulative/exhaustive occurrence/absence/priority/
history/budget audits and exact main/repeat/initially clean reproductions remain
deferred to the combined freeze; real-game precision/usefulness and all broad
strategic scopes remain open. Full catalog goal continues.

Next: return to C0321/C0701. Reuse E070 initial outpost admission and preregister
a bounded complete holding/exchange policy with retained support/safety evidence;
do not duplicate old labels or infer permanence from pawn-route geometry alone.
