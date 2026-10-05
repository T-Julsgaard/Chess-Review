# E007: fully traceable fresh game cohort

Registered 2026-10-05 before downloading new games. This is acquisition and
pipeline validation, not a candidate-method evaluation. No accuracy/rating
improvement or confirmation claim arises from constructing D002.

## Source and bounded sampling

Use only the already-approved June/July/August2026 Lichess standard rated CC0
exports. Publisher terms rechecked at [the database](https://database.lichess.org/)
on2026-10-05; the retained permission note remains applicable. Fetch the first
8 MiB of each exact export using HTTPS Range, requiring206 and exact Content-Range.
Retain the first complete Zstandard frame byte-for-byte, with request/response
metadata, extraction offsets, compressed/decoded hashes and a rebuild command.
No arbitrary domain/source fallback. Budget24 MiB network,20 MiB retained raw
frames, five minutes normalization. Stop if the prefix lacks a complete frame.

This is a convenience sample of archive prefixes, not a representative month or
global blitz population. No whole-archive hash is claimed. Frame boundaries use
the [official Zstandard format](https://github.com/facebook/zstd/blob/dev/doc/zstd_compression_format.md)
and Node24's decoder; corrupt/truncated input must fail.

Select300 games per month by SHA-256 `D002-select-v1:` plus game ID, ascending
ordinal hash. Metadata eligibility: Rated Blitz game, standard initial position,
valid site/date/result, integer ratings400–3500, identities, supported base+
increment control. Exclude provisional/unknown ratings and nonstandard setup.
Exclude every D001 game/player, and repeated players within D002 (lowercase IDs).
Both players must have >=10 nonforced decisions; 20–400 plies; legal PGN/history.
Count all rejection reasons. These restrictions define the cohort's domain.

After selection, separate each month's300 games by SHA-256 `D002-split-v1:` plus
game ID: first150 train, next50 development validation, last100 reserved test.
Both colors remain together; all players are disjoint by construction. Result
labels are parsed for structural normalization but no outcome/rating fit, metric
or manual case inspection is permitted during collection. Reserved evaluation
ownership/activation requires a later candidate protocol and freeze; do not call
the reserved cohort confirmed or untouched merely because it was assigned a role.

## Provenance and admission

Every selected game keeps source URL/month and decoded-frame byte start/end,
raw PGN hash, parser/normalizer revision, full UCI moves and eligibility counts.
Retain raw frames, source receipts, normalized data, exclusion ID hashes, split/
selection seeds, code hashes and environment. A separate verifier must reconstruct
selected records from their raw byte locators and verify selection/splits and
exclusion identities. Guarded admission rejects unknown origins, changed metadata,
unbound locators and mixed/unknown sources, even if someone updates a file hash.

Acquisition needs a source-level bootstrap guard before a dataset manifest can
exist: exact registered URL/purpose and hash-bound publisher permission first.
It does not authorize arbitrary staged files or using an unfinished dataset.
Normalizations in the registered acquisition pipeline remain guarded by their
source receipts/hashes. The final shared loader must validate the complete
dataset before any research model can use it. Preserve D001's stricter legacy
limitations and its exposure ledger; do not silently upgrade it.

Use authored synthetic Zstandard/PGN fixtures to check truncation, corrupt
descriptors, normalization, identity, legality, split separation and tampered
origins. No real game content goes into model context. Smoke before full work;
commit plan/code before collection. Keep current extension/public evidence intact.

## Next step and stopping

Create D002 only if the complete provenance and eligibility checks pass. Run a
clean offline reconstruction and retain exact equality/hashes. If acquisition or
sample-size assumptions fail, document the failure and amend before collecting
additional bytes; do not quietly broaden sampling. Later register a distinct
calibration hypothesis and its development/locked-confirmation access rules.
