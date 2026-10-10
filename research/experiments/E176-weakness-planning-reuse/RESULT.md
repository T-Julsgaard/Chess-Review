# E176 — proof-backed weakness planning reuse

2026-10-10. **Prototype, not accepted evidence.** Preregistered e7099b7,
parent E175 b515900. Authorized current main checkout; research-only local
commit, no push. Original strategic-planning occurrences C0541/C0542/C0543.

The audit found genuine reusable implementations, so no duplicate detector or
new coaching label was generated. `code/evaluate-scope.mjs` provides explicit
research-only `evaluateScope(id,input)`: enable the selected origin flag, retain
the complete original result, then independently admit the exact scope.
`code/inspect-scope.mjs` accepts existing results without recollecting chess
observations. Original budgets remain integer 0–50000. Genuine legal history is
mandatory for scoped admission; missing history/witness abstains, altered proofs
and malformed IDs/history/budgets reject. No runtime integration or new priority.

| Occurrence | Actual reused behavior | Boundary |
| --- | --- | --- |
| C0541 fixing weaknesses | E116 causal enemy-pawn restraint AND same-color bishop profitable exploitation after every legal reply, including all immediate capture counters | Mere blockade is insufficient; blocker-removal counterfactual is explicit; enduring fixation/value unresolved |
| C0542 inducing weaknesses | E168 check forces new isolation of an originally supported pawn on every defense and complete target-capture finite-mate exploitation; quiet same-unit alternative permits escape | General induction, longer plans and durable weakness value unresolved |
| C0543 creating a second weakness | E153 adds pressure to a previously unattacked isolated pawn; complete profitable capture policy requires both opposite-wing targets and beats the quiet alternative | Creates exploitable pressure on an existing defect; new structural defects, permanence and long-term strategy unresolved |

The original category contexts and broader claims remain open. Mapping is based
on independently replayed joint proofs, not similar names or copied labels.

Development evidence:

- 31 focused checks passed in 22.4 seconds, including both colors, fixation
  conjunction separating negatives, nonpawn isolation defense, insufficient mate
  bound, independent target defender, strict/coerced IDs, genuine history,
  budget/receipt/witness mutations and source-result preservation. E168 and E153
  explicit routing exactly reproduced their original results from saved panels;
  E116 zero-budget routing abstained. Origin implementations were unchanged.
- Guarded D001-test pilot: 18 cases, eight scoped positives. Fourteen original
  results reused from E116/E168/E153 with exact input/result/archive/run hashes.
  Four fresh E116 no-bishop/capturable-blocker negatives used explicit empty
  histories and all withheld C0541. Initial pilot retained; final execution
  reused all 18 results with zero fresh collection.
- Independent saved replay passed every selected and fresh proof, original
  archive/source checks, current receipts, the initial collection binding and
  780 normalized recursive source/dependency hashes including full E175 parent
  build. Replay imports no detector, evaluator, collector, context or derivation.
  Shared legal-move semantics remain a limitation. Source and diff checks pass.

Initial archive admission failed before any new chess evaluation because E116's
policy-document fingerprint predates the E141 tablebase addendum. Commit ea1e96e
explicitly preserves game receipt meanings. The dated amendment permits only
that exact old/current document-hash pair and requires every other receipt field
and original source hash unchanged. Original receipts are preserved; future
unrecognized changes fail. Failed sources, build, dependency closure and actual
error log are retained under `evidence/failed-historical-receipt-equality/`.
This compatibility audit does not relax a chess or data-permission gate.

After the first successful 30 checks/replay, ID coercion was tightened and receipt
mutations added. The initial pilot archive/run are retained under
`evidence/initial-pilot/`. Final results bind that archive and reuse its four
fresh results only with exact inputs/receipt/archives and unchanged complete
E116 collector closure, followed by new semantic admission. No scientific gate
or authored fixture changed. Standard gzip decodes the archived JSON.

Final compressed result is 45,889 bytes; all retained evidence is 426,307 bytes,
below the 500KB soft target. Old proof trees stay in their original archives;
only hash-bound references and the four new negative results are retained here.
No engine, tablebase acquisition, new real games, annotation or locked
confirmation. Production and numerical behavior remain unchanged.

Accepted evidence remains E082: 378/1,085 entries (34.8%), 328 names. Separate
build coverage: 425 pending entries in 96 ready batches, zero stale;
803/1,085 accepted-or-candidate entries (74.0%), 282 without candidate code.
These are bounded candidate scopes, not complete strategic definitions.
Combined cumulative regression, exhaustive occurrence/absence/priority/history/
budget audits and changed main/repeat/initially clean reproductions remain
deferred. Real-game precision and teaching usefulness remain unmeasured.

Next: audit C0545 preparing a favorable endgame and C0546 preventing counterplay
against conversion, endgame and attack/counterplay proofs, then preregister the
remaining compatible scopes. C0519 long-term planning and all broader strategic
requirements remain explicit work; do not infer favorable endings from material
alone or absence of counterplay from one unselected enemy line.
