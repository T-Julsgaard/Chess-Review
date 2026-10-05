# E001 result: usable development evidence; test exposure recovered

State: complete. Outcome: inconclusive for model improvement (integrity audit,
no candidate comparison). Evidence: exact artifact checks and retrospective
exposure inventory; no new performance confirmation.

Plan: commit `133ae7c`; final audit implementation `c24edc7`. Execution source
hashes and replay output hashes are in [run.json](evidence/run.json).
Node.js `v24.14.1`, Windows x64, 2026-10-05.

| Check | Scope | Result |
| --- | --- | --- |
| Compressed/decoded hashes and sizes | Seven manifest-declared public inputs | All match |
| Normalized IDs / split-player overlap | 2,000 games, 4,000 identities | Zero duplicates or cross-role players |
| SF18 depth binding | 125 games / 400 legal-choice positions / 26,697 searches | Cohort/dataset binding passes; detailed search replay delegated to B000 reproduction |
| SF18 rating integrity | 1,400 games / 2,798 sides | Zero unbound/duplicate sides or invalid audited move/features |
| SF19 rating integrity | 750 games / 1,498 sides | Zero unbound/duplicate sides or invalid audited move/features |
| Rating exclusions | Two missing sides in each engine | Verified eight/nine decisions, below ten-decision threshold |
| Current game folds | Both rating cohorts | Zero player overlap; all components are single games |
| Existing B000 replay | All published numerical models / 250 accuracy sides | Passes |
| Prior local test exposure | Two SF19 studies | Fifty distinct D001 test games already evaluated |
| Deterministic audit replay | Two executions on identical input bytes | Byte-identical JSON |

Evidence: [audit.json](evidence/audit.json),
[baseline-replay.json](evidence/baseline-replay.json),
[full-curve archive](evidence/sf19-quality-archive.json),
[choice-only archive](evidence/sf19-choice-confirmation-archive.json).
Archive snapshots retain protocols, original hashes, model/report and selected
IDs; numerical study reports have not yet been independently replayed. A clean
clone can use these snapshots for exposure inventory when ignored runs are absent.

Supported conclusion: D001 supports reproducible development comparisons with
explicit engine/role restrictions. At least fifty test games are consumed. The
remaining test games have unknown earlier exposure, so no fresh-test claim is
made. Current game grouping is player-disjoint here; that fact must be checked
again on any new dataset. Hash consistency is not proof of measurement validity.

Failure/negative evidence preserved: the two local SF19 studies reported failed
acceptance gates. Do not retry those exact small-cohort recipes as if new. Their
choice-only report showed large development gains but an unresolved test effect;
retrospective numerical verification belongs in a separate experiment.

Deviations: missing-side eligibility was added as a board-only check after the
first audit identified two exclusions. No predictive outcomes or gates changed.
Audit source hash changes across checkout line endings may change run hashes;
byte equality is conditional on identical checkout/input bytes, not a promise
that arbitrary environments have identical source-file bytes.

Finding: [F001](../../findings/F001-evidence-and-exposure.md).
Next action: register a player-disjoint nested development comparison for rating
models on retained training observations; separately replay the archived SF19
studies before treating their numerical effects as established. Fresh numerical
confirmation and independent human category labels still need new evidence.
