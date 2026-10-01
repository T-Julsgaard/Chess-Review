// tests/classification-data.js - Test fixtures for classification tests

/**
 * Standard starting position FEN
 */
export const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

/**
 * Evaluation objects (white-relative)
 */
export const Eval = {
  equal: { cp: 0 },
  whiteAdvantage: { cp: 100 },
  whiteClearAdv: { cp: 250 },
  whiteLargeAdv: { cp: 500 },
  blackAdvantage: { cp: -100 },
  blackClearAdv: { cp: -250 },
  whiteMateIn1: { mate: 1 },
  whiteMateIn2: { mate: 2 },
  whiteMateIn50: { mate: 50 },
  whiteMateIn51: { mate: 51 },
  blackMateIn1: { mate: -1 },
  blackMateIn2: { mate: -2 },
  blackMateIn50: { mate: -50 },
};

/**
 * Standard move objects
 */
export const Move = {
  e4: { from: 'e2', to: 'e4', promotion: '', captured: '', color: 'w', san: 'e4' },
  e5: { from: 'e7', to: 'e5', promotion: '', captured: '', color: 'b', san: 'e5' },
  Nf3: { from: 'g1', to: 'f3', promotion: '', captured: '', color: 'w', san: 'Nf3' },
  Nc6: { from: 'b8', to: 'c6', promotion: '', captured: '', color: 'b', san: 'Nc6' },
};

/**
 * Best search results
 */
export const BestSearch = {
  bestE4: {
    bestmove: 'e2e4',
    score: { cp: 20 },
    pv: 'e2e4',
    lines: [{ score: { cp: 20 }, pv: 'e2e4' }],
  },
  bestE5: {
    bestmove: 'e7e5',
    score: { cp: -20 },
    pv: 'e7e5',
    lines: [{ score: { cp: -20 }, pv: 'e7e5' }],
  },
};

/**
 * Default settings from analysis.js
 */
export const DEFAULT_SETTINGS = {
  clsClearAdv: 2.0,
  clsMistakeLoss: 1.2,
  clsMissTol: 0.5,
  accExcellent: 90,
  accGood: 70,
  accInacc: 30,
  accMiss: 30,
  accMistake: 20,
  accBlunder: 0,
};

/**
 * Calibration defaults
 */
export const CALIB_DEFAULTS = {
  winK: 0.00368208,
  moveAcc: { a: 103.1668, b: 0.04354, c: 3.1669 },
  clsWp: { good: 2, inacc: 5, blunder: 20, mistake: 10 },
};

/**
 * Creates a minimal S state for testing classifyMove
 * @param {Object} overrides
 * @returns {Object}
 */
export function createMinimalS(overrides = {}) {
  return {
    positions: [
      { fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', san: null, color: 'w' },
      { fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', san: 'e4', color: 'w' },
    ],
    evals: [{ cp: 0 }, { cp: 0 }],
    bests: [{ bestmove: 'e2e4', score: { cp: 0 }, pv: 'e2e4', lines: [] }],
    classif: [null, null],
    accMove: [null, null],
    _sacCache: [undefined, undefined],
    _forcedCache: [undefined, undefined],
    settings: {
      clsClearAdv: 2.0,
      clsMistakeLoss: 1.2,
      clsMissTol: 0.5,
      accExcellent: 90,
      accGood: 70,
      accInacc: 30,
      accMiss: 30,
      accMistake: 20,
      accBlunder: 0,
    },
    players: { w: { rating: null }, b: { rating: null } },
    meSide: 'w',
    total: 1,
    idx: 1,
    bookCount: 0,
    opening: null,
    openingHeader: null,
    _sacCache: [undefined, undefined],
    _forcedCache: [undefined, undefined],
    variation: null,
    analysisMode: false,
    ...overrides,
  };
}

/**
 * Expected classification results for known scenarios
 * These are derived from the current implementation logic
 */
export const EXPECTED = {
  // Book moves (first 8 plies, position in book)
  BOOK_PLY_3: 'book',
  BOOK_PLY_9: null, // Beyond 8-ply window
  
  // Forced moves
  FORCED_MOVE: 'best',
  
  // Engine top move
  TOP_MOVE: 'best',
  
  // Excellent: loss < ~0.4 pawns, not top, not mate-related
  EXCELLENT: 'excellent',
  
  // Good: loss ~0.4-0.8 pawns
  GOOD: 'good',
  
  // Inaccuracy: loss ~0.8-1.2 pawns, no clear advantage lost
  INACCURACY: 'inacc',
  
  // Mistake: loss >= 1.2 AND lost clear advantage (eval drops from >=2.0 to <2.0)
  MISTAKE_LOST_ADV: 'mistake',
  
  // Mistake: loss >= 1.2 AND gave clear advantage (eval goes from >-2.0 to <-2.0)
  MISTAKE_GAVE_ADV: 'mistake',
  
  // Blunder: walked into mate
  BLUNDER_MATE: 'blunder',
  
  // Miss: threw away forced mate
  MISSED_MATE: 'miss',
  
  // Miss: failed to punish blunder
  MISSED_PUNISH: 'miss',
  
  // Great: punished opponent's mistake
  GREAT: 'great',
  
  // Brilliant: sound sacrifice that punishes opponent's slip
  BRILLIANT_SAC: 'brilliant',
  
  // Brilliant: sacrifice starts forced mate
  BRILLIANT_MATE: 'brilliant',
};

/**
 * Book positions for testing (EPD format -> [eco, name])
 */
export const BOOK_POSITIONS = {
  START: {
    fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -',
    eco: '',
    name: '',
  },
  E4_E5: {
    fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3',
    eco: 'C20',
    name: "King's Pawn Game",
  },
};

/**
 * Sacrifice test cases
 */
export const SACRIFICE_CASES = {
  // Queen sacrifice for mate
  QUEEN_SAC_MATE: {
    before: 'r1bq1rk1/ppp2ppp/2np1n2/4p3/2P5/1PN1P3/P2P1PPP/R1BQKBNR w KQkq -',
    after: 'r1bq1rk1/ppp2ppp/2np1n2/4p3/2P5/1PN1P3/P2P1PPP/R1BQKBNR w KQkq -',
    move: { from: 'd1', to: 'h5', color: 'w', captured: '', promotion: '' },
  },
  
  // Not a sacrifice (recapture)
  RECAPTURE: {
    before: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3',
    after: 'rnbqkbnr/pppppppp/8/8/4p3/8/PPPP1PPP/RNBQKBNR w KQkq e6',
    move: { from: 'e7', to: 'e5', color: 'b', captured: 'p', promotion: '' },
  },
};

/**
 * Creates a position object for testing
 * @param {Object} params - Position parameters
 * @returns {Object}
 */
export function createPosition(params = {}) {
  return {
    fen: params.fen || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    san: params.san || null,
    eval: params.eval || { cp: 0 },
    best: params.best || { bestmove: '', score: { cp: 0 }, pv: '', lines: [] },
    color: params.color || 'w',
    draw: params.draw || null,
    ...params,
  };
}

/**
 * Creates an evaluation object for testing
 * @param {Object} params - Evaluation parameters
 * @returns {Object}
 */
export function createEval(params = {}) {
  return {
    cp: params.cp ?? 0,
    mate: params.mate ?? null,
    ...params,
  };
}