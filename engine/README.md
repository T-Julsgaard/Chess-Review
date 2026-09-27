# Bundled Stockfish engines

All engines run locally. The extension does not download executable engine updates.

## Stockfish 19

`stockfish-19-nnue.js` and `stockfish-19-nnue.wasm` are the full single-threaded
build from [Stockfish.js 19.0.0](https://github.com/nmrugg/stockfish.js/releases/tag/v19.0.0),
released by Nathan Rugg. Copyright 2026 Chess.com, LLC. Based on Stockfish by
T. Romstad, M. Costalba, J. Kiiski, G. Linscott and the Stockfish contributors,
including the upstream neural-network contributors.

- Original names: `stockfish-19-single.js` and `stockfish-19-single.wasm`.
- Corresponding source and build instructions: https://github.com/nmrugg/stockfish.js/tree/v19.0.0
- Stockfish engine revision: https://github.com/official-stockfish/Stockfish/commit/edb0d9d
- License: GNU GPL version 3, included in [`../LICENSE`](../LICENSE).
- Upstream license: https://github.com/nmrugg/stockfish.js/blob/v19.0.0/Copying.txt

The WASM is unchanged. The JavaScript executable content is unchanged; only
line endings in its header differ. The local filenames were changed for this app.

SHA-256 of the WASM (99,102,793 bytes):

```text
8725c26572762617fd96b2ea83ff130e6640b85815890d682bf8c49db0820721
```

SHA-256 of the JavaScript after normalizing CRLF to LF (matching upstream):

```text
72772f8bdd7353e4e24245d946bb831f56bcccf02fa16a779c1b92a6c00e5cc2
```

Stockfish 19 is the default for new settings. Existing engine preferences are
retained. This full build requires more memory and loading time than the bundled
Stockfish 18 lite build. If startup fails, the extension tries the lighter bundled
builds and identifies the fallback in the engine panel.

## Older builds

`stockfish-nnue.{js,wasm}` is the lighter Stockfish 18 NNUE build.
`stockfish.{js,wasm}` and `stockfish.asm.js` are Stockfish 10 fallbacks.
See [`../ATTRIBUTIONS.md`](../ATTRIBUTIONS.md) for credits and licensing.
