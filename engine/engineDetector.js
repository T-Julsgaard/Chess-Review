/**
 * engine/engineDetector.js
 * 
 * Instant browser feature detection to select the best Stockfish flavor
 * (Lite Multi-threaded or Lite Single-threaded) without trial-and-error.
 */

/**
 * Detect browser capabilities synchronously without network requests.
 */
export function detectCapabilities() {
  const hasWasm = typeof WebAssembly === 'object' && typeof WebAssembly.validate === 'function';
  const hasSharedArrayBuffer = typeof SharedArrayBuffer !== 'undefined';
  const isCrossOriginIsolated = typeof window !== 'undefined' ? window.crossOriginIsolated === true : false;

  return {
    hasWasm,
    hasSharedMemory: hasWasm && hasSharedArrayBuffer && isCrossOriginIsolated,
  };
}

/**
 * Returns the best engine configuration for a given engine key.
 * Supported keys: "sf19", "sf18", "nnue", "wasm"
 * 
 * Returns { script, wasm, supportsThreads, label, key }
 */
export function getEngineConfig(key) {
  const caps = detectCapabilities();

  if (key === 'sf19') {
    if (caps.hasSharedMemory) {
      return {
        key: 'sf19',
        flavor: 'multi',
        script: 'engine/stockfish-19/stockfish-19-lite.js',
        wasm: 'engine/stockfish-19/stockfish-19-lite.wasm',
        supportsThreads: true,
        label: 'Stockfish 19 (Multi-threaded)',
      };
    }
    // Fallback to single-threaded if no shared memory
    return {
      key: 'sf19',
      flavor: 'single',
      script: 'engine/stockfish-19/stockfish-19-lite-single.js',
      wasm: 'engine/stockfish-19/stockfish-19-lite-single.wasm',
      supportsThreads: false,
      label: 'Stockfish 19',
    };
  }

  if (key === 'sf18') {
    if (caps.hasSharedMemory) {
      return {
        key: 'sf18',
        flavor: 'multi',
        script: 'engine/stockfish-18/stockfish-18-lite.js',
        wasm: 'engine/stockfish-18/stockfish-18-lite.wasm',
        supportsThreads: true,
        label: 'Stockfish 18 (Multi-threaded)',
      };
    }
    // Fallback to single-threaded if no shared memory
    return {
      key: 'sf18',
      flavor: 'single',
      script: 'engine/stockfish-18/stockfish-18-lite-single.js',
      wasm: 'engine/stockfish-18/stockfish-18-lite-single.wasm',
      supportsThreads: false,
      label: 'Stockfish 18',
    };
  }

  if (key === 'nnue') {
    return {
      key: 'nnue',
      flavor: 'nnue',
      script: 'engine/stockfish-18-nnue/stockfish-nnue.js',
      wasm: 'engine/stockfish-18-nnue/stockfish-nnue.wasm',
      supportsThreads: false,
      label: 'Stockfish 18 NNUE',
    };
  }

  if (key === 'wasm') {
    return {
      key: 'wasm',
      flavor: 'wasm',
      script: 'engine/stockfish-10/stockfish.js',
      wasm: 'engine/stockfish-10/stockfish.wasm',
      supportsThreads: false,
      label: 'Stockfish 10',
    };
  }

  // Default fallback to Stockfish 19
  return getEngineConfig('sf19');
}

/**
 * Returns an ordered array of candidate engine configurations for a key.
 * If the primary detected build fails to load (e.g. CSP or Worker restrictions),
 * the next configuration in the list is tried.
 */
export function getCandidateConfigs(key) {
  const primary = getEngineConfig(key);
  const candidates = [primary];

  if (key === 'sf19') {
    if (primary.flavor === 'multi') {
      candidates.push({
        key: 'sf19',
        flavor: 'single',
        script: 'engine/stockfish-19/stockfish-19-lite-single.js',
        wasm: 'engine/stockfish-19/stockfish-19-lite-single.wasm',
        supportsThreads: false,
        label: 'Stockfish 19',
      });
    }
  } else if (key === 'sf18') {
    if (primary.flavor === 'multi') {
      candidates.push({
        key: 'sf18',
        flavor: 'single',
        script: 'engine/stockfish-18/stockfish-18-lite-single.js',
        wasm: 'engine/stockfish-18/stockfish-18-lite-single.wasm',
        supportsThreads: false,
        label: 'Stockfish 18',
      });
    }
  }

  return candidates;
}
