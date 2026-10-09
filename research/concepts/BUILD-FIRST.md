# Coach implementation first, combined validation later

User-approved on 2026-10-09: generate the remaining research code in compatible
batches, then cross-check the combined implementation. This replaces per-study
full cumulative acceptance as a prerequisite for continuing coach development.
It applies to coach research only; numerical research and production promotion
are unchanged. The original catalog and accepted evidence remain intact.

## Build stage

Work through the complete remaining catalog, prioritizing a useful common-coach
milestone: tactical causes and warnings, local legal relationships, exchanges,
material and pawn changes, then history, structures and bounded endgame motifs.
Keep strategic and support ideas in scope; this milestone is an ordering choice,
not permission to delete difficult concepts. Use the approved rank as the tie
breaker within compatible families and record prerequisite-driven deviations.

Build larger coherent batches around shared legal-move machinery, inputs and
proof methods, with an explicit scope for each original occurrence. Reuse the
FRIEND implementations when they cover the same scope. Do not regenerate a
candidate merely to give it a new experiment number. A batch may contain many
claims; its limits come from shared dependencies and reviewability, not an
arbitrary concepts-per-study target.

Preregister the batch interface, claims, dependencies and later cross-checks.
Implement actual callable behavior and representative positive/negative, strict
input, disabled-compatibility and affected-dependency checks. Use focused tests,
cheap synthetic pilots, source verification and diff checks. Do not expand every
prototype into a full historical runner/tracker/demo or exhaustive fixture matrix
before moving to the next batch. Retain failures and record unresolved cases.
Never mark a placeholder, copied label or unsupported strategic assertion ready.
If required history, clock, tablebase, alternatives or usefulness evidence is
missing, report the prerequisite and continue independent implementable work.

Commit working batches as provisional research code. Keep them in the existing
isolated research checkout. In INDEX.md use `prototype`, not `complete`; use
RESULT.md for actual build state and remaining validation. Do not advance the
accepted tracker, verified percentage or extension behavior. Report implemented
coverage separately using `npm run research:build-status` and inspect the
remaining grouped work using `npm run research:backlog`.

## Machine-readable build record

Add `build.json` to each code-ready experiment folder. Its format is:

```json
{
  "schema": "coach-build-v1",
  "experiment": "E083",
  "stage": "code-ready",
  "claims": [{"id": "C0001", "scope": "Exact candidate scope"}],
  "inputHashes": {"research/experiments/E083-example/code/example.mjs": "64 lowercase hex characters"},
  "focusedChecks": ["node --test research/experiments/E083-example/code/example.test.mjs"],
  "deferredChecks": ["independent saved replay", "combined regression", "exact reproductions"]
}
```

The example ID and hash above are placeholders for documentation only. Record
real original IDs, scopes, commands that passed and SHA-256 hashes. Text is hashed
after CRLF-to-LF normalization; binary files use their exact bytes. Enumerate the
complete behavioral dependency closure (candidate, shared helpers and parent
detectors), relevant fixture/tests, plan and configuration. Missing or changed
inputs make the build stale, not verified. These fingerprints identify source
compatibility; they do not establish the chess claim or execution success.

Records may overlap in vocabulary; coverage counts each original ID once and
preserves every scope. The implementation percentage means an accepted scope or
an available provisional candidate for an entry, not that its whole definition
is solved. A narrow implementation never discharges a broader occurrence;
RESULT.md must keep the broader work explicit. Support/reference implementations
remain separate from verified detectors. The status command never runs chess
searches or reads game contents.

## Reuse and invalidation

Reuse retained observations and proof trees when the full source/input/config/
engine/history/budget bindings match. Compare actual hashes, not only a previous
passed message or Git HEAD. Use existing saved-proof replayers and manifests;
byte integrity alone is not semantic validation. Do not copy old success into a
new acceptance record or regenerate an unchanged expensive search by default.

Changes to a shared dependency invalidate its dependent builds and observations.
New comment priorities, enabled detectors, schemas or budgets require combined
behavior checks even when individual detector evidence is reusable. Unaffected
components retain their accepted evidence. Record changed dependencies and the
reason for any broad rerun in RESULT.md.

## Combined cross-check stage

When the catalog's implementable batches are code-ready and unavailable ideas
have explicit prerequisite records, freeze the combined research source and
preregister one integration validation plan. Audit every original occurrence,
including duplicate scopes, support routing and unresolved broad claims.

Run the full coach regression, independent saved semantic replay, inherited
behavior/priority/terminal/budget/history checks and exact source/input/output
verification. Run fresh main/repeat/initially clean reproductions for changed
work at this boundary, reusing eligible unchanged historical observations rather
than repeating every historical search in each small batch. The integration plan
must state which searches are fresh, which are reused and why the bindings match.
Failures return affected batches to development; repeat relevant checks after
fixes and repeat the full suite when combined behavior changes invalidate it.
Advance only the scopes whose actual gates pass. Research code availability is
not confirmed real-game precision, usefulness or production readiness.

## Transition from registered studies

Preserve frozen plans, observed failures and previously accepted results. For an
unfinished registered study, append a dated amendment citing this approval,
disclosing already inspected evidence and listing exactly which gates move to
combined validation; never rewrite its old plan or claim those gates passed.
Keep original and revised gate outcomes separately visible in RESULT.md.

Already-running frozen E082 reproductions finish on their fixed source and
inputs; retain their outputs without launching duplicates or mutating checkouts.
Their original acceptance remains conditional on their actual checks. Apply the
build-first workflow at the next safe boundary and reconcile shared main using
the established local procedure. Nothing here authorizes a push or production
promotion.
