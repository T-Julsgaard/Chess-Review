# E174 — comparative piece improvement and useful outpost entry

2026-10-10 prospective provisional batch, parent E173 160f7c6. Authorized current
main checkout, research-only local commits/no push. BUILD-FIRST focused checks,
small authored synthetic pilot, combined validation later. Queue C0523 piece
improvement rank391 and C0533 creating an outpost rank394; intervening entries
already have candidate scopes. Full original catalog and broader scopes remain.

E024 already covers a narrow new pawn-supported knight placement. E070 proves
legal pawn support and conservative absence of any current enemy pawn's future
pre-promotion challenge; E132 addresses preventing immediate enemy outpost entry.
E156 compares two equal-value pieces after one move against a declared capture
objective. Reuse these mechanics, rather than reimplementing their labels.
New question: does relocating the SAME piece enable a complete profitable capture
policy that its paired alternative lacks, and does a new supported outpost supply
that independently demonstrated finite benefit?

## Interface and distinct gates

Default-disabled `improvementTags` wraps E173 exactly. Require full legal
`history`, enemy-pawn `improvementTarget` square and `improvementAlternative`,
a distinct legal quiet nonchecking nonpawn/nonking move by the same original
unit making the actual move. Actual move has the same restrictions. Missing
inputs abstain; malformed/illegal supplied controls reject. Historical terminal
roots abstain. `maxImprovementNodes` integer0..50000, default50000. Optional
complete `improvementPanel` independently admitted. Atomic exhaustion drops own
witness/events preserving parent, nodes=limit+1. Claim exposure on any visited
genuine continuation suppresses own labels. Priority191.1, qualityClaim:false,
comments at most24 words; no best-move or private-intent claim.

Both variants retain the complete legal enemy reply inventory. For EVERY live
reply, the original relocated unit must have a legal capture of the tracked
target yielding >=1 nominal point against the ROOT material baseline, retaining
that gain through EVERY immediate legal counterreply. Captured unit cannot be
replaced by another own unit. Target identity follows genuine pawn movement,
en-passant victim semantics and promotion. Require nonempty reply/counterreply
inventories and live endpoints. Retain all actor capture attempts by every own
unit, not just chosen successful ones, and all failed responses/counters.

- C0523: actual original-unit policy passes and paired alternative policy fails.
  This is objective-relative improvement; general positional improvement remains
  unresolved. Two equally successful relocations withhold the label.
- C0533: C0523 plus actual unit is a knight arriving from relative rank<4 onto
  relative rank4..6, with E070 legal support and complete conservative pawn-route
  proof. This certifies a newly occupied supported outpost with demonstrated
  finite objective benefit. It does not establish permanent safety, creation
  by pawn exchanges, support durability or universal outpost value. Original
  broader Creating an outpost scope remains open.

Reuse E153 neutral state/material/record utilities and adapt the E156/E153
complete legal capture collector to a paired single target. Source-bind the
actual E070 outpost proof/negative admission and charge all its reported work
within the same atomic budget. Its fresh replacement-knight support counterframe
is explicitly hypothetical support evidence, never a genuine game continuation
or legal pass. Preserve its complete graphs/replies/refutations as applicable.
Independent verifier uses Chess, E070's independent replay for positive/refuted
proofs, and independent support/eligibility/node reconstruction for all statuses;
no detector/collector/context/derive imports. Independently recompute both
original-unit policies, exact material, claim exposure, costs and separate labels.

## Unqueried hypotheses and evidence budget

White Kb1 Nf3 Pc3 Pf4 versus Black Kh8 Pf5, White to move. Nd4 versus Ne1.
Pc3 supports d4; f4 blocks the target pawn's forward move. Hypothesis: after
every Black reply, original Nd4 can take f5 and retain >=1 point through every
counter, while Ne1 cannot. The f5 pawn cannot reach a square attacking d4 before
promotion even under E070's occupancy-ignoring route superset. Both labels.
Remove Pc3: same objective improvement but no supported outpost, C0523 only.
Add Black Pc6: future ...c5 can challenge d4, but target capture may still pass,
again C0523 only. Add Black Be6: ...king move retains Bxf5 recapture, defeating
the complete profitable policy. Replace alternative with Nh4: both knights may
capture f5, withholding comparative improvement. These are authored hypotheses,
not observations. Smoke first; retain failures and amend before adaptive changes.

At most20 authored pilot cases, both colors, exact legal history-derived reflected
counters. Guard D001 test loader/receipt; no engine/tablebase/new real games,
human review or confirmation. Focused strict/missing/disabled/history/terminal/
draw/budget/identity/support/pawn-route/material/semantic mutation checks, two
E173 parent representatives, independent saved replay, source and diff checks.
Cache only exact history/root/pair/target/collector dependency/receipt matches;
never repeat eligible searches. Soft500KB evidence target, not scientific gate.
Retain source closure, full parent build, revision/environment/command and outputs.

Full cumulative regression, exhaustive occurrence/absence/priority/history/budget
audits and changed main/repeat/initially clean reproductions remain deferred to
the combined freeze. Accepted tracker and production unchanged. General piece
quality, broader outpost creation, strategic durability, real-game precision
and teaching usefulness remain unresolved. Next compatible exchange family:
C0538 exchanging a bad piece/C0539 exchanging the opponent's good piece.
