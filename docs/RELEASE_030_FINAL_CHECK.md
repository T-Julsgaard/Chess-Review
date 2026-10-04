# Final desktop release check — 0.3.0

Checked October 4, 2026 on Windows with Node.js 24.14.1. The desktop
release checks pass. Export Chrome, Firefox and corresponding project-source
ZIPs with the existing packaging script; version 0.3.0 already matches across
the manifest, package metadata and dependency lockfile.

## Verification

- `npm test`: 303 passed, zero failures, cancellations or skips.
- `npm run verify:engines`: all four bundled engine files match their recorded
  SHA-256 checksums.
- `npm run verify:source` and `npm run verify:history`: passed.
- `node tools/calibration/reproduce-public.mjs`: all 13 checks passed offline.
- `npm run test:browsers`: Chrome and Firefox passed real startup and completed
  reviews with both bundled engines, numeric badges, both rating modes,
  persistence/reanalysis, responsive layouts and review reloads.
- The same browser smoke checks verified the one-time 0.3.0 settings/layout
  reset, preservation of usernames, games, favorites and analyses, coordination
  between background and review pages, retention of later customizations and
  recovery when update handling was missed.
- `npm run test:layout`: all 20 Chrome layout cases passed, together with
  expanded popup sizing, narrow settings bounds, custom-layout reload/reset,
  legacy preference migration and concurrent library writes. Representative
  1366×768 and 320×640 screenshots were visually inspected.
- Firefox ZIP lint: zero errors, zero notices, one `UNSAFE_VAR_ASSIGNMENT`
  warning at the existing HTML helper in `analysis.js`. The helper's callers
  use bundled markup and locally generated SVG; see RELEASE.md. The warning
  remains visible rather than being suppressed.
- ZIP inspection confirmed version 0.3.0, browser-specific background manifests,
  absence of development/test files, and package/source checksums. The packaged
  source inputs matched their recorded hashes.

## Audit tooling correction

Sandboxed Chrome initially timed out before loading the isolated test extension;
the browser checks completed with local browser access. The layout audit also
exposed a fixed-delay startup race: the audit page could be evaluated before its
module initialized the storage API. The audit now waits for storage API and popup
readiness with a bounded timeout. The corrected audit passed; this change affects
test tooling only.

## Export provenance and remaining limits

The packaging script preserves a unique release directory, browser/source ZIPs,
SHA-256 hashes and `release-record.json` under `web-ext-artifacts/`.
`web-ext-artifacts/latest-release.json` identifies the final export. Browser
results and layout measurements/screenshots are retained beside that record.

The existing uncommitted `analysis.js` badge-settings layout change is included
in the tested export but is not included in the audit commits. The release record
explicitly records the dirty working tree; the ZIPs must not be described as an
exact export of Git HEAD alone. Preserve the source ZIP and release record with
the actual upload.

These results establish desktop technical readiness within the coverage above.
They do not establish a store-delivered update, oldest-supported-browser or
Android compatibility. No store dashboard was authenticated, listing changed,
package uploaded or Git changes pushed. Before uploading, confirm that 0.3.0
exceeds the versions already submitted in both store dashboards and follow the
distribution and listing notes in RELEASE.md.
