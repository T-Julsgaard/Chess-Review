# D002: fresh traceable prefix cohort

Acquisition/verification: [E007 result](../../experiments/E007-fresh-evidence/RESULT.md).
Admitted under the shared guard. 900 player-disjoint standard blitz games from
approved CC0 June/July/August2026 archive prefixes:450 train,150 development
validation,300 reserved evaluation. 1,800 distinct lowercase identities; no D001
game/player overlap. No new source or license is assumed.

Archive-prefix sampling is a restricted convenience population. Eligibility,
complete raw-to-normalized lineage and fresh scientific confirmation are separate
requirements. No fit, improvement claim or promotion has been made on this data.
Numeric recorded ratings are retained, but provisional status is unavailable;
do not describe this as established strength or a nonprovisional-only cohort.

## Files and admission

[manifest.json](manifest.json) binds every artifact and dependency. Raw standard
frames are in `raw/`; [sources.json](sources.json) retains exact export requests,
ranges, 12-byte leading metadata and compressed/decoded hashes. `games.json.gz`
contains full normalized histories and per-game raw PGN byte locators;
[exclusions.json](exclusions.json) binds the excluded D001 identities. Selection
and split algorithms are frozen in `research/fresh-format.mjs` by manifest hash.
[run.json](run.json) records exact acquisition/transform revision and environment.

```sh
npm run research:preflight -- D001 D002 --purpose inspect
node research/experiments/E007-fresh-evidence/code/verify.mjs --out research/runs/E007/replay
```

Both IDs are required because admission verifies the D001 exclusion inputs.
Use `readJson()` for normalized/structured records and `readFrame()` for raw
decoded frames after opening the guard. The frozen pipeline is rebuilt on
admission; arbitrary file copies cannot establish eligible origins.

The 300 reserved games are not an activated confirmation set. A later candidate
protocol must freeze scope, methods, sample access, metrics and selection before
evaluation. Structural parsing/identity audit is recorded; model target metrics
and manual reserved cases remain uninspected under this program. Any later
exposure must be appended below; it cannot be undone by renaming a split.

## Exposure ledger

| Date / record | Use | Restriction |
| --- | --- | --- |
| 2026-10-05 E007 registration | Source metadata/terms only | No new game acquired or model evaluated yet. |
| 2026-10-05 E007 complete | Raw retrieval, structural normalization, selection/identity/metadata audit and clean offline reconstruction | All labels parsed structurally; no engine/model evaluation, outcome summaries or manual case inspection. Reserved evaluation not activated. Provisional-status limitation retained. |
| 2026-10-05 E008 registration | 450 train /150 development validation games | SF19 outcome/legal-choice collection and frozen two-candidate screen;300 reserved games excluded from searches/fits. Results not inspected yet. |
| 2026-10-05 E008 development evaluation | 450 train fits /150 development metrics and shortlist | Fixed two-candidate screen: CP passes, WDL fails; development consumed.300 reserved games still excluded. No confirmation/adoption. |
| 2026-10-05 E009 collection |30 train /15 development games, score-blind hash selection | Reuse E00820k cache, collect80k operational stability reference; no human truth or additional candidate tuning. Reserved300 excluded. |
