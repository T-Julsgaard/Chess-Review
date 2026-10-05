# E007: fresh cohort acquisition and reconstruction pass

Completed 2026-10-05. Outcome: **improved provenance infrastructure**, not a scoring
improvement or scientific confirmation. D002 is admitted for declared research
uses under its limitations. No engine search, model fit or model evaluation ran.

900 games, 1,800 distinct players; no D001 game/player overlap. Per month 300:
150 train,50 development validation,100 reserved test. Totals 450/150/300. Both
colors remain together. All selected games have legal standard histories,
numeric recorded ratings 400–3500, 20–400 plies and >=10 nonforced decisions per
side. Selection/splits use the committed hash rules; no outcome summaries or
manual case inspections informed them.

Three complete first standard frames are retained: 4,703,281 /4,688,096 /4,624,942
compressed bytes, about 13.37 MiB total. Each follows 12 bytes of skippable metadata;
that metadata and exact archive/extraction offsets are recorded. HTTPS206 request/
response records, prefix/frame/decoded hashes, raw PGN byte locators, normalized
moves and source/code revision make the retained subset reconstructible.
The complete successful acquisition/normalization took 22.13 seconds.

Complete records available per frame:14,173 /14,339 /14,117. Metadata rejects:
25,863 non-blitz games. Candidates considered before each monthly target was
filled rejected 34 for normalization/length/decision eligibility, 45 repeated
players/games and 25 D001 overlaps. The combined eligibility category includes
parse and decision/length failures; no more granular breakdown is claimed.
The trailing record in each frame is conservatively discarded because it can
span the next frame. Later hash-ranked candidates are not needed/normalized.

## Failures and limits retained

- Default sandbox denied the first network connection before bytes arrived.
  The authorized elevated request then downloaded 8 MiB but stopped because
  the initial parser did not handle the archive's skippable header.
- A 32-byte metadata probe established the format. The committed correction
  handles official skippable headers and preserves offsets. Actual total network
  use, including failure, is 32 MiB+32 bytes; the amended plan records this.
- Selected PGNs have numeric Elo/rating-difference fields but no explicit
  provisional-status tag. The planned exclusion of every provisional rating is
  **unverifiable**, not achieved. Numeric/unknown-string filtering is achieved.
  Later candidate protocols must acknowledge unknown provisional status.
- Prefixes are a convenience population, not representative monthly/global
  sampling. Only retained frame bytes are hashed; no whole-archive checksum or
  cryptographic publisher signature is claimed. TLS retrieval receipts establish
  the recorded acquisition; checksums establish retained byte identity.
- Reserved labels were structurally parsed. No model has evaluated them under
  this program, but reserved membership alone is not scientific confirmation.
  Candidate freeze/access ownership and appropriate untouched evidence remain
  requirements of the later protocol. Do not manually inspect reserved cases.

## Verified evidence and replay

[Verification](evidence/verification.json) reconstructs selection, splits,
compressed normalized bytes and every selected raw PGN locator. It checks unique
identities, prior exclusions and acquisition hashes. Shared guarded admission
rebuilds the same frozen pipeline before every D002 use; opening D001 is required
to verify the exclusion dependency. Unknown sources, altered raw bytes or changed
normalizations remain prohibited.

[Clean replay](evidence/clean-replay.json) used a Git archive of committed files
at 51d49c0, without Git metadata, ignored inputs, Node packages or network. The
complete verifier output matches the live verification **byte-for-byte**.
Synthetic tests include complete 900-game reconstruction and rejection of altered
rating metadata, along with truncation/corruption, identity and permission checks.
All 25 research tests and maintained-source checks pass. CI now includes D002.
[Metadata audit](evidence/metadata-fields.json) records available tag names only.

```sh
npm run research:preflight -- D001 D002 --purpose inspect
node research/experiments/E007-fresh-evidence/code/verify.mjs --out research/runs/E007/replay
node research/experiments/E007-fresh-evidence/code/metadata.mjs
```

The metadata command writes its canonical audit; use it deliberately and update
its registration before subsequent reuse if bytes change. Verification `--out`
preserves the earlier record. Current receipt hashes can change as registrations
grow; selected games, raw frames and compressed normalized bytes must not change.
Do not rerun collection unnecessarily; retained raw data supports offline replay.
For a missing frame, its exact export URL/range and SHA are in D002 sources.json;
reacquisition must pass the source guard and match the retained hash.

Next: register a distinct human-outcome/legal-choice calibration experiment,
freeze its comparators and access rules, then collect reusable engine observations
on development roles. Reserved evaluation stays unactivated until its protocol
and candidate are frozen. Human category annotations remain pending under E005.
