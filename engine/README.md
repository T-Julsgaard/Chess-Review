# Bundled Stockfish Engines

All engines run locally inside Web Workers. The extension does not download external engine executables.

## Engine Structure

The engines are organized into dedicated version folders:

```text
engine/
├── stockfish-19/       # Stockfish 19 (Lite multi-threaded, single-threaded)
├── stockfish-18/       # Stockfish 18 (Lite multi-threaded, single-threaded)
├── stockfish-18-nnue/  # Stockfish 18 NNUE (legacy 7MB neural build)
├── stockfish-10/       # Stockfish 10 (lightweight WASM)
├── engineDetector.js   # Instant browser capability detection
└── uci.js              # Universal Chess Interface worker manager
```

## Auto-Detection Flow

For Stockfish 19 and Stockfish 18, `engineDetector.js` synchronously evaluates browser capabilities before starting the worker:

1. **Lite Multi-threaded**: Selected when WebAssembly, `SharedArrayBuffer`, and `crossOriginIsolated` are all available.
2. **Lite Single-threaded**: Selected when standard WebAssembly is supported (~98% of users). Instant startup with superhuman strength without requiring cross-origin isolation headers.

## Upstream & Licensing

- Stockfish.js ports by Nathan Rugg: https://github.com/nmrugg/stockfish.js
- Stockfish by T. Romstad, M. Costalba, J. Kiiski, G. Linscott and contributors: https://github.com/official-stockfish/Stockfish
- License: GNU General Public License v3 (see [`../LICENSE`](../LICENSE)).
