# D001: retained public baseline evidence

Registered 2026-10-05. Frozen data and normalization are retained at B000 revision
`becc0629688ef8814c247f94fa449dc3e4247faf` in `tools/calibration/public/`.
Use those files by reference; do not overwrite them or copy them into a new role.
Machine-readable hashes/counts/configurations are in
[E001 audit.json](../../experiments/E001-evidence-audit/evidence/audit.json).

## Population, selection and provenance

2,000 normalized standard-start public blitz games from June-August 2026
Lichess archives: 1,400 train, 300 validation, 300 test; 4,000 unique recorded
player identities. Selection balanced five focal-rating bands and used retained
archive byte-range frames, rather than sampling the whole blitz population.
Both colors stay together; no player crosses roles (E001 check). Rating targets
are the game's recorded platform rating, not FIDE Elo or independently measured
strength. No rating-deviation, clock or longitudinal-strength evidence is retained.

Sources/license: [CC0 archives](https://database.lichess.org/), recorded URLs,
retrieval dates, ranges and frame hashes in
[sources.json](../../../tools/calibration/public/sources.json). Whole-archive
checksums were not verified. Existing normalized schema contains game ID,
source/month, focal band/color, role, deterministic order, player ID/rating/color,
result, time control/category/date and UCI mainline. Raw provenance is public;
IDs are needed for overlap checks. No private account data is being collected.

Rebuild by retrieving the retained files at the pinned repository revision and
checking compressed/decoded hashes against the public manifest. This guarantees
replay inputs. The full original normalization/selection pipeline is not being
claimed to have been reconstructed by E001; metadata alone cannot establish
whole-population representativeness or original test secrecy.

## Retained search coverage

| Evidence | Games | Player sides / decisions | Role |
| --- | --- | --- | --- |
| SF18 depth16 | 125 | 250 sides; 400 selected all-legal-choice positions; 26,697 searches | 100 train / 25 validation games |
| SF18 fixed-node rating | 1,400 | 2,798 sides | train only |
| SF19 fixed-node rating | 750 | 1,498 sides | train only |

Two black sides are missing in each rating artifact: `HsowT6Qd` has nine
nonforced decisions and `4eLPtn5c` has eight, below the maintained ten-decision
threshold. E001 replayed their legal mainlines to verify this reason.
No cross-role overlap, duplicate side, invalid predictor or inconsistent retained
move record was detected by the declared checks. Current five game-hashed folds
also happen to be player-disjoint in these cohorts: every player occurs once.

Search identity: SF18 depth16/Hash16 and engine-specific 20,000-node/Hash32 rating
observations. Exact build/network/options/reset/history/config hashes are in the
linked audit. Do not use one cohort's WDL or quality transform as the other's
calibrated statistic. No new engine searches were performed for E001.

## Exposure and reuse ledger

| Date / record | Role / use | Exposure and restriction |
| --- | --- | --- |
| Before registration, B000 | Training, development validation and fitting folds | Consumed by published fitting and earlier development; development only for new candidates. |
| 2026-10-04 local SF19 full-curve study | 100 train / 25 validation / 25 test games | Test evaluated; archive protocol/report preserved by E001; gate failed. |
| 2026-10-04 local SF19 choice-only study | Same train/development, different 25 test games | Test evaluated; gate failed. Both studies' outcome reports inspected during E001 registration. |
| 2026-10-05 E001 | Full metadata/identity/hash audit; train-target binding; offline B000 replay | All files decoded. No new test prediction/target comparison. Fifty known consumed test IDs retained in audit.json. Remaining 250 have unverified historical exposure and are not certified fresh. |
| 2026-10-05 E002 (complete) | Retained train rating sides, nested outer/inner folds | Full candidate results and subgroup diagnostics inspected; development only, no validation/test scoring. Nonlinear candidate misses practical gates. |
| 2026-10-05 E003 (registered) | Two prior SF19 outcome/choice cohorts, including known consumed fifty test games | Retrospective replay of already inspected reports; no new independent confirmation or test selection. |

Original source metadata saying `finalTestEvaluated: false` predates these later
local studies; it does not override observed exposure. Keep those public files
unchanged and use this ledger for future research. Confirmation must use a newly
registered, locked cohort with documented access; renaming/resplitting D001 does
not create independent evidence. Append each later reuse here.
