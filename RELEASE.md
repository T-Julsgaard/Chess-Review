# Release 0.2.1

This maintenance update improves commit descriptions and retires obsolete
experiments, superseded tooling and discarded design work from repository history.
Contributors using older clones should start from current `main` and port their
reviewed changes individually, as described in CONTRIBUTING.md.

## Packages and verification

Run `npm ci`, `npm test`, `npm run verify:engines`, and `npm run build`.
Each build creates a new `web-ext-artifacts/release-0.2.1-<unique>/` directory.
It preserves `chess-review-0.2.1-chrome.zip`, `chess-review-0.2.1-firefox.zip`, and
`chess-review-0.2.1-source.zip`, alongside staged copies. Existing packages are
never overwritten. `release-record.json` records SHA-256 checksums, source-file
hashes, the Git HEAD and working-tree status, Node version, and build time.
`web-ext-artifacts/latest-release.json` points to the newest completed record;
older records remain in their original directories. `release-sizes.json` is also
stored in each release directory.

The source snapshot contains the extension's readable code, assets, manifests,
dependency lockfile, tests, build scripts, repository guides and current calibration
fitting/evidence/reproduction files. It excludes Git history and local
dependencies. Engine upstream source/build references remain in engine/README.md;
the snapshot does not itself contain the upstream engines' complete build sources.
Only Cburnett and Merida pieces enter the browser/source ZIPs. Include
`content-button.css` in the source and browser packages, as enforced by the
build allowlist. Current asset credits are in ATTRIBUTIONS.md.
Build from a stable working tree. A dirty build is explicitly recorded and must
not be described as identical to its HEAD commit. Preserve the submitted source
snapshot and checksums with the actual store-upload record; do not invent tags
or reconstruct older releases from today's source.

Then run `npm run test:browsers` for real engine startup and completed reviews in
headless Chrome and Firefox. The script defaults to their standard Windows install
paths; override with CHROME_PATH and FIREFOX_PATH where needed. It uses isolated
profiles and test-only extension copies with a loopback reporting endpoint; the
store ZIPs are never modified. It checks a fresh default-18 review and migration
from the old full-19 preference to Lite. Results are saved in
`browser-smoke-results.json` in the latest release directory.

Validate the actual Firefox ZIP with:

```sh
npx web-ext lint --source-dir=web-ext-artifacts/release-0.2.1-<unique>/chess-review-0.2.1-firefox.zip
```

Chrome uses an MV3 module service worker. Firefox uses an MV3 module event page.
Store packages omit the other browser's background declaration. The development
manifest includes both so the project can be loaded directly in either browser.

Before uploading, confirm 0.2.1 is greater than the latest uploaded version in both
store dashboards. Keep the existing Chrome item and Firefox extension ID; do not
create replacement listings. This repository does not authenticate to or publish
to either store during build. Check that current screenshots match the two engine
choices, and use PRIVACY.md as the basis for the hosted privacy-policy URL.
STORE_LISTING.md contains prepared listing/privacy copy. It has not been submitted
to either store. Update the published description and privacy declarations together;
do not retain the unsupported numerical-agreement claims.

## Distribution review

Exact offline reproduction of the current numerical calibration is documented in
tools/calibration/PUBLIC_METHOD.md. This establishes reproducibility from bundled
evidence, not platform permission, independently validated move labels or rights
to third-party assets. ATTRIBUTIONS.md records current asset provenance and limitations. Platform integration and applicable terms still need review;
a generated ZIP is not legal clearance. The Chrome store download checked on
October 3, 2026 was version 0.2.0. Version 0.2.1 is prepared for the maintainer's
store upload; the Firefox public listing was unavailable at that check.

## Reviewer notes

Chess Review analyzes public chess games locally. For a review requested by the
user, public player usernames or game identifiers go directly to api.chess.com or
lichess.org. There is no developer backend, telemetry, remote executable code,
or account/login service. Firefox's browsingActivity and websiteContent declarations
cover those requests; desktop minimum 140 and Android minimum 142 support the
built-in data consent. Android compatibility still needs device testing before
claiming Android support in the listing.

Permissions: storage and unlimitedStorage hold settings and game/analysis caches;
activeTab reads the selected game URL; host permissions add the review controls
and fetch public games. Update the Chrome privacy form to match PRIVACY.md; do not
claim that no lookup identifiers ever leave the device.

### Bundled libraries

Both engine pairs are original release assets from Nathan Rugg's Stockfish.js:

- 18 release: https://github.com/nmrugg/stockfish.js/releases/tag/v18.0.0
- 18 readable source/build instructions: https://github.com/nmrugg/stockfish.js/tree/v18.0.0
- 19 release: https://github.com/nmrugg/stockfish.js/releases/tag/v19.0.0
- 19 readable source/build instructions: https://github.com/nmrugg/stockfish.js/tree/v19.0.0

Exact original asset URLs and SHA-256 values are in engine/checksums.json. The 18
pair is renamed to stockfish-nnue locally; file contents are unchanged. Networks
are embedded in WASM. No engine compilation or minification is performed here.
Stockfish 18 NNUE is the default; 19 Lite is optional. Saved engine preferences
migrate to supported builds. The engine tooltips disclose the Lite tradeoff.

lib/chess.js is derived from `dist/esm/chess.js` in Jeff Hlywa's chess.js **1.0.0**
official npm package:

- Original distribution: https://registry.npmjs.org/chess.js/-/chess.js-1.0.0.tgz
- Readable upstream source: https://github.com/jhlywa/chess.js/blob/v1.0.0/src/chess.ts
- Release/build instructions: https://github.com/jhlywa/chess.js/tree/v1.0.0

The initial bundled file matches that distribution after normalizing line endings.
Local changes replace every PGN comment brace and remove a no-op newline masking
helper while preserving regular-expression separators. The modified readable
JavaScript is included in the submitted source and copied without compilation or
minification during the extension build. Its BSD 2-Clause license notice is retained.
All other asset credits are in ATTRIBUTIONS.md.

### Functional checks

No test account is needed. Open the popup away from a chess site and:

1. Paste `1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 *` into Manual setup and review it.
2. Verify 18 NNUE is selected by default; switch to 19 Lite and re-analyze.
3. Verify the popup offers game review only; a position-only PGN is rejected.
   Review a game and verify alternative moves, engine output, and navigation.
4. On a finished public Chess.com/Lichess game, launch through the popup, keyboard
   shortcut, and in-page review button. A missing content script should produce
   a username prompt or use the saved username, never a TypeError.
5. Switch tabs during a retry: the review must remain attached to the original game.

Automated tests cover the API failures, retry tab identity, preference migration,
cache invalidation, and fallback in both directions. Run browser smoke checks
against the staged store packages, including real WASM startup and a completed review.

### Validator warnings

The combined development manifest deliberately contains both background types;
Firefox reports the ignored service_worker field. The Firefox ZIP omits it.
HTML/SVG assignments in analysis.js are limited to bundled icon/handle markup and
locally generated evaluation graph markup. Player names and PGNs use text nodes.
The remaining UNSAFE_VAR_ASSIGNMENT warning points to the shared `el()` helper's
`html` attribute. Its callers only pass the bundled icons/handles/brand and numeric,
locally generated graph markup. Arrows and injected review buttons now use DOM
nodes and attributes instead. The warning is documented, not globally suppressed.

Store references:
- https://developer.chrome.com/docs/webstore/update
- https://extensionworkshop.com/documentation/publish/third-party-library-usage/
- https://extensionworkshop.com/documentation/develop/firefox-builtin-data-consent/
