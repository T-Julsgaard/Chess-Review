# Bundled Stockfish engines

All engine code and evaluation networks are bundled. Nothing executable is downloaded at runtime.

| Engine | Purpose | Official files | Release |
| --- | --- | --- | --- |
| Stockfish 18 NNUE | Default; public accuracy model | `stockfish-18-lite-single.js` / `.wasm` | [18.0.0](https://github.com/nmrugg/stockfish.js/releases/tag/v18.0.0) |
| Stockfish 19 Lite | Optional compact alternative | `stockfish-19-lite-single.js` / `.wasm` | [19.0.0](https://github.com/nmrugg/stockfish.js/releases/tag/v19.0.0) |

18's files are named `stockfish-nnue.js` / `.wasm` locally. Both pairs are byte-for-byte
official release assets, with SHA-256 checksums and original download URLs recorded in
[`checksums.json`](checksums.json). Run `npm run verify:engines` to verify them.
`.gitattributes` preserves the original loader bytes.

The single-threaded builds work without cross-origin isolation. The extension already
parallelizes positions across independent workers, so additional multithreaded variants
would duplicate engines and require a different deployment setup. The supported
builds can fall back to each other if startup fails. If neither works, analysis offers Retry.

Stockfish 19 Lite has a smaller network and is weaker than full Stockfish 19. No claim
is made that it is stronger than the bundled 18 NNUE at the same depth. SF18 uses
the public expected-points accuracy model; SF19 uses engine WDL accuracy. Each
build has its own moves-only rating model. See the
[public method](../tools/calibration/PUBLIC_METHOD.md) for search settings and limits.
Saved engine preferences migrate to supported builds and invalidate incompatible
cached evaluations.

## Sources and licenses

Stockfish.js by Nathan Rugg (nmrugg), copyright 2026 Chess.com, LLC, under GPLv3:

- [18 source and build instructions](https://github.com/nmrugg/stockfish.js/tree/v18.0.0)
- [19 source and build instructions](https://github.com/nmrugg/stockfish.js/tree/v19.0.0)
- [Upstream license](https://github.com/nmrugg/stockfish.js/blob/v19.0.0/Copying.txt); included as [`../LICENSE`](../LICENSE)
- [Stockfish contributors](https://github.com/official-stockfish/Stockfish)
- 18 lite network: Linmiao Xu (linrock), `nn-9067e33176e`
- 19 lite network/code: [sscg13](https://github.com/sscg13/Stockfish/tree/sf19-1mb), `nn-61e7af4bb97d`

For AMO, include these exact release and source links in Notes for Reviewers; see
[`../RELEASE.md`](../RELEASE.md). No local engine compilation is needed.
