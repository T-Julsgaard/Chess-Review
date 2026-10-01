// tests/terminalScore.test.js - Tests for terminalScore function
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { __testInternals } from '../analysis.js';

const { terminalScore, setTestS } = __testInternals;

describe('terminalScore', () => {
  beforeEach(() => {
    // Set up S state for terminalScore to find positions
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
    // Reset S to minimal state
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