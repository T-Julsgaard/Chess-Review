# Security policy

## Supported versions

Security fixes target the latest published release and the current `main` branch.
Older releases are not maintained separately; please update before checking
whether a problem still occurs.

## Development dependency alerts

All three packages below are transitive development dependencies of `web-ext`
and are excluded from the browser store ZIPs. Checked on 2026-10-08:

- Dependabot #10, [shell-quote command injection](https://github.com/advisories/GHSA-pqg4-j6r4-53mv):
  upgraded from 1.10.0 to 1.12.0 (fixed in 1.11.0). An npm override is needed
  because `fx-runner@1.6.0` pins 1.10.0. Remove the override once its dependency
  accepts a fixed version.
- Dependabot #9, [source-map-js denial of service](https://github.com/advisories/GHSA-68fv-2mgg-jv7q):
  upgraded from 1.2.1 to the patched 1.2.2 within `css-tree`'s existing range.
- Dependabot #8, `node-forge`: the temporary backport below remains necessary.

`tests/dependency-security.test.mjs` checks rejection of the shell-quote attack
inputs and excessive indexed source-map offsets, alongside valid input behavior.
After the updates, `npm audit` reports no critical vulnerabilities and only the
known node-forge advisory (also counted against `adbkit` and `web-ext`).

### node-forge backport

`web-ext` brings in `node-forge@1.4.0` through its Android debugging dependency,
`@devicefarmer/adbkit`. This dependency is excluded from both browser store ZIPs.
For [CVE-2026-85393](https://github.com/advisories/GHSA-86w9-cpqp-85rv), no official
fixed npm release was available when checked on 2026-10-08.

`npm ci` and `npm install` apply `scripts/patch-node-forge.mjs` automatically.
The temporary backport adds the nested DigestAlgorithm element-count check
proposed in [the upstream fix](https://github.com/digitalbazaar/forge/pull/1152).
It verifies the entire RSA source file before patching and fails on unexpected
source or versions. Regression tests reject nested extra elements while accepting
valid RSA signatures, including AlgorithmIdentifiers with or without NULL.

If installing with `--ignore-scripts`, run `npm run patch:dependencies` before
using development tools, then run `npm test`. The security tests fail against an
unpatched installation. Keep the Dependabot alert open to track the official fix:
the lockfile honestly retains version 1.4.0, so version-based scanners still report
it despite the local backport. Once a fixed release is available, update the
dependency and remove the override and installation patch together.

## Report a vulnerability privately

Use GitHub's **[Report a vulnerability](https://github.com/T-Julsgaard/Chess-Review/security/advisories/new)**
form to send a private report to the maintainer.

If you cannot use GitHub's reporting form, email
**[Thomas@Julsgaard.dev](mailto:Thomas@Julsgaard.dev)** with the subject
**Chess Review security report**. Please do not open a public issue or pull
request containing vulnerability details.

Include, where available:

- The affected extension version or commit, browser version, and operating system.
- A description of the vulnerability and its potential impact.
- Reproduction steps or a minimal proof of concept.
- Relevant logs or screenshots, with personal information and credentials removed.

Please test only with accounts and data you control. Keep details private while
we investigate and coordinate a fix and disclosure with you. Reports are reviewed
as maintainer time allows; there is no guaranteed response or resolution time.

For ordinary bugs, analysis disagreements, and feature requests, use
[GitHub issues](https://github.com/T-Julsgaard/Chess-Review/issues).
For information about data handling, see [PRIVACY.md](PRIVACY.md).
