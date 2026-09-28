# Contributing to Chess Review

Bug reports, ideas, documentation improvements, and code contributions are welcome.
Search the [existing issues](https://github.com/T-Julsgaard/Chess-Review/issues)
and pull requests first. For large features, engine replacements, or changes to
accuracy and move classification, open an issue to discuss the approach before
starting substantial work.

## Report a problem or suggest a feature

Use the bug report or feature request form when opening an issue. Reproduction
steps, browser and extension versions, and relevant engine settings help us
investigate. For game-specific problems, include a game URL or PGN if you are
comfortable sharing it publicly; remove personal information from screenshots
and logs.

Report suspected security vulnerabilities privately as described in
[SECURITY.md](SECURITY.md).

## Set up locally

1. Fork the repository and clone your fork.
2. Install Node.js 22 or newer and npm, then run `npm ci` from the project folder.
3. Create a branch for your change.
4. In Chrome, open `chrome://extensions`, enable **Developer mode**, click
   **Load unpacked**, and select the project folder. No build step is needed.
5. After editing, reload the extension and refresh any Chess.com or Lichess pages
   used for testing. Reopen the popup or analysis tab as needed.

For Firefox development, run `npm run start:firefox` with Firefox installed.
The minimum Firefox version is specified in `manifest.json`.

## Make and check your change

Follow the surrounding JavaScript, HTML, and CSS style. Keep each pull request
focused and avoid unrelated formatting or generated files.

Run these checks for code changes:

```sh
npm test
npm run lint
```

Add a regression test when fixing behavior that the test suite can exercise.
Manually check the affected flow in a browser too: automated tests do not cover
every extension API, rendering behavior, or interaction with chess websites.
For visual changes, include before/after screenshots and check both wide and
narrow windows. For analysis changes, provide a reproducible game and engine
settings. Note any failed checks or browser testing you could not perform.

Keep game analysis local and respect the privacy promises in
[PRIVACY.md](PRIVACY.md). Explain any new permissions or network requests in
your pull request. When changing bundled engines or third-party assets, include
their source, version, and license information and update
[ATTRIBUTIONS.md](ATTRIBUTIONS.md) and relevant engine documentation.

## Submit a pull request

Open a pull request against `main`. Explain the problem, resulting behavior,
and how you tested it; link a related issue if there is one. Small fixes do not
need an issue first. Documentation-only changes do not need application tests.

Contributions to the project's own code use its existing [GPL-3.0 license](LICENSE).
Bundled third-party assets retain their own licenses and attribution requirements.
Reviews happen as maintainer time allows.
