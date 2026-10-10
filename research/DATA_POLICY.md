# Public data and verifiable provenance

Policy version: `public-data-v1`, adopted 2026-10-05.

Computed-tablebase addendum, 2026-10-10: [TABLEBASE_DATA_POLICY.md](TABLEBASE_DATA_POLICY.md)
defines a separate, explicitly registered namespace for generated endgame tables.
This is a policy revision for those non-game artifacts only. Their permission,
exact exports and origin format must pass `openResearchTablebases()`; a game-data
receipt cannot admit them. Existing `public-data-v1` game registry/validator,
origins and archived receipt meanings remain unchanged. Requirements below for
game-derived data continue unchanged. The old document fingerprint remains part
of historical evidence; do not rewrite archived receipts to hide this addendum.

## Mandatory eligibility rule

Research may collect, inspect or use real games and game-derived data only from
sources explicitly published as public, free-to-use data under documented terms
permitting the intended use. Public visibility, a working API, free downloading,
an account owner's permission or prior use does not establish eligibility.
Missing, ambiguous, incompatible or unverifiable permission prohibits use.

This applies to analysis, training, tuning, validation, testing, examples and
reuse, including positions, labels, engine observations, caches and fitted
parameters. Every contributing source in a mixture must qualify. Renaming,
anonymizing, transforming or copying data does not remove these requirements.
There is no override flag. Never substitute an unapproved source to continue a
goal. Record the reason and continue only work independent of prohibited inputs.
Authored synthetic mechanics fixtures must be identified as synthetic, must not
incorporate unapproved real games and cannot support claims about real players.

## Starting, resuming and running research

Before starting or resuming an automated research goal, read this policy and run:

```sh
npm run research:preflight -- D001 --purpose inspect
```

Use the actual dataset IDs and purpose. Check before any game content is opened,
downloaded or processed, and again when sources or inputs change. Source metadata
and publisher terms may be inspected to establish eligibility. Eligibility is
separate from permission to inspect locked confirmation labels: the protocol
and exposure ledger still govern that access.

Every research entry point must call `openResearchData()` before loading inputs
and use its `readJson()` loader for registered files. It verifies the source
registry, terms evidence, manifest, dependency chain and exact file bytes before
returning content. Keep its compact `receipt` in the run record. Direct calls to
the maintained calibration loader do not enforce this research policy.
Generated results used in later work must be registered as derivatives with
their hashes and parent artifacts before being loaded again. Commit updated
records before decisive evaluation. CI checks the retained registry and inputs.

New acquisition uses `openResearchSource()` to verify an exact registered export,
purpose and hash-bound publisher terms before the first request. This bootstrap
permits only the registered acquisition/normalization pipeline while hashes are
being established; it does not admit unfinished datasets for model use. Retain
source receipts and enforce exact HTTPS responses, ranges and bounded byte sizes.

The `lichess-prefix-v1` format for D002 retains complete Zstandard frames and
decoded per-game byte locators. Its guarded admission rebuilds the exact frozen
PGN normalization, exclusions, selection and splits. Open both D001 and D002
because the fresh cohort's exclusion identities depend on D001's verified bytes.
Raw frame artifacts use the guarded `readFrame()` decoder, not `readJson()`. Current
origin-checker bytes are bound to the manifest and eligibility receipt; a changed
checker requires an explicit provenance revision/reconstruction. D001 has a
separate historical-frame reconstruction record and per-game locator inventory.
Offline admission checks their bindings and pinned method/dependencies; explicit
`D001-public-baseline/reconstruct.mjs` replay rechecks all original raw fragments.

For checks that should preserve historical run records, the retained verifier
and replay accept separate output directories:

```sh
node research/experiments/E002-nonlinear-rating/code/verify.mjs --out research/runs/policy-check/E002
node research/experiments/E003-sf19-archive-replay/code/replay.mjs --out research/runs/policy-check/E003
```

These checks protect the maintained research entry points. They are not an OS
sandbox: arbitrary new scripts can bypass them. Agent instructions and review
must require the same loader for every future input path. No research goal is
created or resumed merely by installing this policy.

## Registering a source and dataset

Only sources in `datasets/approved-sources.json` are eligible. Approval names the
exact export URLs, license, public/free-use status, permitted purposes, publisher
terms URL, verification date and a hash-bound local evidence note. A domain-wide
allowlist is insufficient. Initially only the three recorded CC0 Lichess standard
game exports are approved. Other licenses require an explicit policy revision
after checking compatibility and obligations; never infer permission from a name.
Reverify publisher terms before new acquisitions or changed exports, and retain
dated evidence. Offline replay uses the retained terms for the acquired version.

Each `D###-name/manifest.json` must list all source IDs, exact artifact paths,
compressed/decoded SHA-256 hashes, byte sizes, kinds and parent dependencies.
Source records identify approved export URLs and acquisition ranges/checksums.
Normalized game records retain game IDs, source URLs and archive identity.
Derived observations and reports must trace back to these inputs. The checker
rejects missing parents, cycles, changed files and games with unknown origins.

For new datasets, retain raw retrieval evidence and a per-game locator into a
hash-verified raw artifact (record index or byte range), plus the exact parser,
normalizer, selection and split commands, revisions, dependencies and seeds.
Retain exclusion counts/reasons and hashes at every transformation. Store large
inputs outside Git only with immutable accessible retrieval or rebuild recipes.
Document provenance in the dataset record and reuse/exposure in its ledger.
Adding a dataset requires an origin validator for its format and targeted tests;
unsupported formats are rejected rather than guessed.

## Evidence and scientific claims

File integrity, source permission, acquisition provenance, pipeline reproduction
and scientific validity are separate checks. A checksum proves byte identity;
it does not prove honest metadata, representative sampling or a useful model.
Evidence must make each claimed step independently checkable. Do not describe
an undocumented step as reproduced or a development result as confirmed.

D001's original selection/normalization and every selected game's raw-frame
membership now have an exact retained reconstruction. Its manifest pins the
method/dependencies, input hashes, report and locators. Full replay retrieves
hash-matched fragments from the recorded ranges or uses the verified local cache;
preflight does not download or replay those bulk fragments automatically.
Whole-archive checksums and regenerated engine observations are not claimed.
Existing sampling, rating-metadata and development/test-exposure limits remain:
the reconstruction cannot make D001 new scientific confirmation. Frozen origin
summaries are preserved for historical pack replay;
`gameOrigin(id, {current: true})` exposes updated provenance and its raw locator.

Experiment plans still require predeclared claims, metrics, thresholds, splitting,
leakage controls, uncertainty, stopping rules and evaluation access. Confirmation
requires untouched appropriate evidence and an independent clean replay under
`PROTOCOL.md`. Findings and promotions must link the eligibility receipt, data
lineage, exact method, results and remaining limitations. Auditable research
provides evidence for a bounded claim, not universal mathematical proof.

## Cost and context discipline

Hashing and provenance validation run locally in Node.js without model calls,
network requests or new engine searches. Their cost is file I/O, CPU and manifest
storage. Keep bulk games and provenance ledgers out of chat; show the compact
receipt and failures only. Read this policy once per research session, then only
changed records. Reuse verified bytes within a run and recheck on a new run.
New-source verification and writing complete methods add some agent context;
routine runs should add little token usage. No fixed percentage or bill estimate
is justified without measuring the actual sessions.
