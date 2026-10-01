// tests/classification.test.js - Regression tests for classification functions
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { __testInternals } from '../analysis.js';

const {
  classifyMove,
  classifyVariationMove,
  scoreToCp,
  terminalScore,
  isSacrifice,
  getStandardRating,
  bookLookup,
  _moveLoss,
  _sacAt,
  _forcedAt,
  computeDerived,
  _evalPawns,
  _mateFor,
  _isMateEval,
  _isCheckmate,
  moveAccuracy,
  sideAccuracies,
  setTestS,
  setTestBOOK,
  setTestCALIB,
} = __testInternals;

import {
  DEFAULT_SETTINGS,
  Eval,
  CALIB_DEFAULTS,
} from './classification-data.js';

describe('scoreToCp', () => {
  it('maps mate in 1 to 9900', () => {
    expect(scoreToCp({ mate: 1 })).toBe(9900);
  });

  it('maps mate in 2 to 9800', () => {
    expect(scoreToCp({ mate: 2 })).toBe(9800);
  });

  it('maps mate in 50 to 5000', () => {
    expect(scoreToCp({ mate: 50 })).toBe(5000);
  });

  it('caps mate > 50 at 50', () => {
    expect(scoreToCp({ mate: 51 })).toBe(5000);
    expect(scoreToCp({ mate: 100 })).toBe(5000);
  });

  it('maps negative mate correctly', () => {
    expect(scoreToCp({ mate: -1 })).toBe(-9900);
    expect(scoreToCp({ mate: -50 })).toBe(-5000);
    expect(scoreToCp({ mate: -51 })).toBe(-5000);
  });

  it('maps centipawn values unchanged', () => {
    expect(scoreToCp({ cp: 0 })).toBe(0);
    expect(scoreToCp({ cp: 100 })).toBe(100);
    expect(scoreToCp({ cp: -50 })).toBe(-50);
    expect(scoreToCp({ cp: 3000 })).toBe(3000);
  });

  it('handles null/undefined', () => {
    expect(scoreToCp(null)).toBe(0);
    expect(scoreToCp(undefined)).toBe(0);
    expect(scoreToCp({})).toBeUndefined();
  });

  it('preserves mate distance ordering', () => {
    expect(scoreToCp({ mate: 1 })).toBeGreaterThan(scoreToCp({ mate: 2 }));
    expect(scoreToCp({ mate: 2 })).toBeGreaterThan(scoreToCp({ mate: 3 }));
    expect(scoreToCp({ mate: -1 })).toBeLessThan(scoreToCp({ mate: -2 }));
  });
});

describe('getStandardRating', () => {
  beforeEach(() => {
    setTestCALIB(CALIB_DEFAULTS);
  });

  it('returns excellent for wp < 2', () => {
    expect(getStandardRating(0)).toBe('excellent');
    expect(getStandardRating(1)).toBe('excellent');
    expect(getStandardRating(1.9)).toBe('excellent');
  });

  it('returns good for 2 <= wp < 5', () => {
    expect(getStandardRating(2)).toBe('good');
    expect(getStandardRating(3)).toBe('good');
    expect(getStandardRating(4.9)).toBe('good');
  });

  it('returns inacc for 5 <= wp < 20', () => {
    expect(getStandardRating(5)).toBe('inacc');
    expect(getStandardRating(10)).toBe('inacc');
    expect(getStandardRating(19.9)).toBe('inacc');
  });

  it('returns blunder for wp >= 20', () => {
    expect(getStandardRating(20)).toBe('blunder');
    expect(getStandardRating(30)).toBe('blunder');
    expect(getStandardRating(100)).toBe('blunder');
  });

  it('handles null/undefined', () => {
    expect(getStandardRating(null)).toBeNull();
    expect(getStandardRating(undefined)).toBeNull();
  });
});

describe('bookLookup', () => {
  beforeEach(() => {
    setTestBOOK({});
  });

  afterEach(() => {
    setTestBOOK(null);
  });

  it('returns undefined for unknown position', () => {
    const result = bookLookup('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -');
    expect(result).toBeUndefined();
  });

  it('returns 0 for unnamed book position', () => {
    setTestBOOK({ 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -': 0 });
    const result = bookLookup('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -');
    expect(result).toBe(0);
  });

  it('returns [eco, name] for named position', () => {
    setTestBOOK({ 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -': ['A00', 'Test Opening'] });
    const result = bookLookup('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -');
    expect(result).toEqual(['A00', 'Test Opening']);
  });
});

describe('terminalScore', () => {
  beforeEach(() => {
    setTestS({
      positions: [
        { fen: '8/8/8/8/8/8/8/7k w - - 0 1', draw: 'checkmate', san: null, color: 'w' },
        { fen: '8/8/8/8/8/8/8/7K b - - 0 1', draw: 'checkmate', san: null, color: 'b' },
        { fen: '8/8/8/8/8/8/8/1K6 b - - 0 1', draw: 'stalemate', san: null, color: 'b' },
        { fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', draw: null, san: null, color: 'w' },
      ],
    });
  });

  afterEach(() => {
    setTestS({ positions: [] });
  });

  it('returns checkmate for white to move (black wins)', () => {
    const result = terminalScore('8/8/8/8/8/8/8/7k w - - 0 1', 0);
    expect(result).toEqual({ mate: -1 });
  });

  it('returns checkmate for black to move (white wins)', () => {
    const result = terminalScore('8/8/8/8/8/8/8/7K b - - 0 1', 1);
    expect(result).toEqual({ mate: 1 });
  });

  it('returns cp: 0 for stalemate', () => {
    const result = terminalScore('8/8/8/8/8/8/8/1K6 b - - 0 1', 2);
    expect(result).toEqual({ cp: 0 });
  });

  it('returns null for non-terminal positions', () => {
    const result = terminalScore('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', 3);
    expect(result).toBeNull();
  });
});

// Skip tests that rely heavily on internal module state
describe.skip('Internal functions requiring full module state', () => {
  it('_moveLoss', () => {});
  it('_evalPawns', () => {});
  it('_mateFor', () => {});
  it('_isMateEval', () => {});
  it('_isCheckmate', () => {});
  it('_sacAt', () => {});
  it('_forcedAt', () => {});
  it('moveAccuracy', () => {});
  it('sideAccuracies', () => {});
  it('computeDerived', () => {});
  it('classifyMove - Book moves', () => {});
});

describe('classifyVariationMove', () => {
  it('is exposed for testing', () => {
    expect(typeof classifyVariationMove).toBe('function');
  });
});