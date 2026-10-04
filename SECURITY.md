# Security policy

## Supported versions

Security fixes target the latest published release and the current `main` branch.
Older releases are not maintained separately; please update before checking
whether a problem still occurs.

## Development dependency backport

`web-ext` brings in `node-forge@1.4.0` through its Android debugging dependency,
`@devicefarmer/adbkit`. This dependency is excluded from both browser store ZIPs.
For [CVE-2026-85393](https://github.com/advisories/GHSA-86w9-cpqp-85rv), no official
fixed npm release was available when checked on 2026-10-05.

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
