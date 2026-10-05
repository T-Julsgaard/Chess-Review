# E001: evidence, exposure and measurement audit

Registered 2026-10-05. Track: measurement/datasets. Baseline B000, source revision
`becc0629688ef8814c247f94fa449dc3e4247faf`; scaffold revision `978602b`.

## Question and hypothesis

Can retained evidence support reproducible development experiments, and which
observations may honestly be called fresh? Audit hypothesis: public input hashes,
game/side bindings and engine-specific feature domains are internally consistent.
This is an integrity/coverage audit, not a model-improvement test.

Before this plan, only public schemas, aggregate split counts, configuration,
current public validation and two local archived study plans/reports were inspected.
The archived reports revealed test exposure in `sf19-quality` and
`sf19-choice-confirmation`. Their reported outcomes have been inspected, so any
reevaluation of those studies is retrospective. No new candidate has been fitted.

## Inputs and audit rules

Register existing public files as D001 by reference. Verify all compressed and
decoded hashes against the public manifest, pin model/method source hashes and
retain baseline offline replay output. Audit normalized IDs, player overlap
between roles, engine-evidence coverage, rating-row duplicate keys, target binding,
finite predictors, decision eligibility and context consistency.

Inventory player-connected components and overlap across the current five
game-hashed SF19 peer folds. Do not compute predictive candidate metrics here.
Only inspect train targets to check rating binding. Test records may be read for
IDs/split membership and exposure mapping; do not output test outcomes/ratings.
Metadata access is still recorded. Audit errors are reported, not silently removed.

Inventory the two local archived SF19 studies: hash plan/model/report/evidence,
extract study protocol, selected game/position IDs and consumed test IDs. Preserve
small records in research rather than relying on ignored files for exposure
history. Do not yet claim their numerical reports are reproducible findings.
Study engine evidence may be replayed in a separately registered retrospective
experiment. Check those game IDs against D001; expose all mismatches.

## Gates, uncertainty and cost

Primary gate: zero hash failures, zero duplicate normalized games, zero cross-role
player overlap, zero unbound/duplicate rating rows and zero nonfinite predictors.
Report missing engine sides and their decision counts; zero missingness is not
required if intentional exclusion is demonstrable. Retain category and month
counts but do not claim random representative sampling.

The gate is exact metadata/integrity checking; no inferential interval or sample
size calculation applies. Inventory the complete retained inputs. Record every
failed check and limit conclusions to inspectable artifact consistency.
Unknown earlier test exposure prevents a fresh-confirmation claim even if this
audit finds no named use. No stochastic candidate, tuning or multiplicity applies.

Budget: no engine searches or network collection; under five minutes of local
audit/replay, under 1 MB of retained summaries. Smoke check: decode schemas and
hash one file before auditing all inputs. Deterministic JSON replay should be
byte-identical on Node.js 24; run twice and compare SHA-256.

Commands from repository root (the audit script will be added separately):

```sh
node research/experiments/E001-evidence-audit/code/audit.mjs
node tools/calibration/reproduce-public.mjs
```

Engine configs are inherited exactly from the hash-verified public artifacts;
raw searches are not rerun. Record execution revision, command/environment and
output hashes. Result should route the first numerical experiment and bound
the meaning of accuracy, rating and categories through MEASUREMENT.md.

## Amendments

None at registration.
