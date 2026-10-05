# Dataset records

Follow [the mandatory data policy](../DATA_POLICY.md). Register exact public,
free-to-use exports in `approved-sources.json`, with publisher permission evidence,
before acquisition. Use hash-bound `manifest.json` artifact/parent inventories
and the guarded loader. Unsupported origins, missing permission and unregistered
inputs are prohibited. An existing file or prior experiment is not approval.

Create `D###-short-name/README.md` and a machine-readable manifest when collecting
or registering data. Link it from the index and consuming experiments. Existing
public calibration evidence stays at its current path; register a reference
rather than copying it or resetting its evaluation history.

Each record must contain:

- Purpose, population, rating pool/time control and target definitions.
- Source URLs/versions, acquisition date/commands, license and redistribution
  status; identities needed for leakage checks and any privacy handling.
- Selection/exclusion rules, counts, sampling seed and normalized-data schema.
- Raw and normalized SHA-256 hashes, engine/configuration hashes where relevant,
  and an accessible immutable location or full retrieval/rebuild recipe.
- Per-game raw-artifact locators, original source/game IDs and exact acquisition,
  parser, normalization, selection and split commands/revisions/dependencies;
  hash-bound lineage for every derivative and dated eligibility receipts. Preserve
  explicit limitations for legacy evidence; never invent missing provenance.
- Split assignments and hashes, unit of separation, duplicate/player-overlap
  checks (including B000), and selection/split freeze revision.
- Confirmation access policy, exposed fields/labels and dated exposure ledger.
- Append-only reuse table: experiment ID, date, split, purpose (fit/tune/test),
  whether outcomes were inspected, and resulting consumption/restrictions.

Track label provenance, reviewer blinding and disagreements for human datasets.
Keep bulk raw inputs in `research/runs/`; retain compact manifests and necessary
evidence. Use LF-normalized structured text before hashing. Do not claim fresh
confirmation simply because an existing dataset has been renamed or resplit.

Registered: [D001 public baseline evidence](D001-public-baseline/README.md).
