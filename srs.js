// srs.js — Spaced Repetition (SM-2) for mistake practice
// Pure functions, no DOM dependencies — fully testable.

const SRS_DB_KEY = "practice-srs";

/**
 * SM-2 algorithm constants
 */
const SM2 = {
  INITIAL_EASE: 2.5,
  MIN_EASE: 1.3,
  INITIAL_INTERVAL: 1,      // days
  SECOND_INTERVAL: 6,       // days
  EASY_BONUS: 1.3,
  HARD_PENALTY: 1.2,
  MAX_INTERVAL: 365,        // days (1 year)
};

/**
 * Grade definitions (SM-2 uses 0-5):
 * 0 - Complete blackout
 * 1 - Incorrect, but recognized answer
 * 2 - Incorrect, hard to recall
 * 3 - Correct, difficult
 * 4 - Correct, easy
 * 5 - Perfect, instant
 */
export const GRADE = {
  AGAIN: 0,
  HARD: 1,
  GOOD: 3,
  EASY: 4,
};

/**
 * Create a new SRS card for a position.
 * @param {Object} pos - { fen, solution, theme, rating, meta }
 * @returns {Object} SRS card
 */
export function createCard(pos) {
  const now = Date.now();
  return {
    id: hashFen(pos.fen) + "-" + now,
    fen: pos.fen,
    solution: pos.solution,
    theme: pos.theme,
    rating: pos.rating,
    meta: pos.meta || {},
    // SM-2 state
    ease: SM2.INITIAL_EASE,
    interval: 0,
    repetitions: 0,
    due: now,
    lastReviewed: null,
    history: [],
  };
}

/**
 * Review a card with a grade (0-5). Returns updated card.
 * @param {Object} card
 * @param {number} grade - 0-5
 * @returns {Object} updated card
 */
export function reviewCard(card, grade) {
  const now = Date.now();
  const updated = { ...card, lastReviewed: now };

  if (grade < 3) {
    // Failed: reset repetitions, interval = 1 day
    updated.repetitions = 0;
    updated.interval = SM2.INITIAL_INTERVAL;
  } else {
    // Passed
    updated.repetitions += 1;
    if (updated.repetitions === 1) {
      updated.interval = SM2.INITIAL_INTERVAL;
    } else if (updated.repetitions === 2) {
      updated.interval = SM2.SECOND_INTERVAL;
    } else {
      updated.interval = Math.round(updated.interval * updated.ease);
    }
    updated.interval = Math.min(updated.interval, SM2.MAX_INTERVAL);
  }

  // Adjust ease factor
  updated.ease = Math.max(
    SM2.MIN_EASE,
    updated.ease + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02))
  );

  // Set next due date
  updated.due = now + updated.interval * 24 * 60 * 60 * 1000;

  // Record history
  updated.history.push({ date: now, grade, interval: updated.interval, ease: updated.ease });
  if (updated.history.length > 50) updated.history = updated.history.slice(-50);

  return updated;
}

/**
 * Get cards that are due for review.
 * @param {Array} cards
 * @returns {Array} due cards sorted by overdue-ness (most overdue first)
 */
export function getDueCards(cards) {
  const now = Date.now();
  return cards
    .filter(c => c.due <= now)
    .sort((a, b) => a.due - b.due);
}

/**
 * Get cards due soon (within days).
 */
export function getUpcomingCards(cards, days = 7) {
  const now = Date.now();
  const limit = now + days * 24 * 60 * 60 * 1000;
  return cards
    .filter(c => c.due > now && c.due <= limit)
    .sort((a, b) => a.due - b.due);
}

/**
 * Get SRS statistics for a card set.
 */
export function getStats(cards) {
  const now = Date.now();
  const due = cards.filter(c => c.due <= now).length;
  const learning = cards.filter(c => c.repetitions < 2).length;
  const reviewing = cards.filter(c => c.repetitions >= 2).length;
  const mature = cards.filter(c => c.interval >= 21).length;
  const avgEase = cards.length
    ? cards.reduce((s, c) => s + c.ease, 0) / cards.length
    : SM2.INITIAL_EASE;
  return { total: cards.length, due, learning, reviewing, mature, avgEase: +avgEase.toFixed(2) };
}

/**
 * Load all SRS cards from IndexedDB.
 */
export async function loadCards() {
  try {
    const { [SRS_DB_KEY]: data } = await browserAPI.storage.local.get(SRS_DB_KEY);
    return data?.cards || [];
  } catch {
    return [];
  }
}

/**
 * Save all SRS cards to IndexedDB.
 */
export async function saveCards(cards) {
  try {
    await browserAPI.storage.local.set({ [SRS_DB_KEY]: { cards, updatedAt: Date.now() } });
  } catch (e) {
    console.warn("SRS save failed", e);
  }
}

/**
 * Add puzzles as new SRS cards (deduplicates by FEN).
 */
export async function addPuzzles(puzzles) {
  const existing = await loadCards();
  const existingFens = new Set(existing.map(c => c.fen));
  const newCards = puzzles
    .filter(p => !existingFens.has(p.fen))
    .map(createCard);
  if (newCards.length) {
    await saveCards([...existing, ...newCards]);
  }
  return newCards.length;
}

/**
 * Remove a card by ID.
 */
export async function removeCard(cardId) {
  const cards = await loadCards();
  await saveCards(cards.filter(c => c.id !== cardId));
}

/**
 * Simple FEN hash for card IDs.
 */
function hashFen(fen) {
  let h = 0;
  for (let i = 0; i < fen.length; i++) {
    h = ((h << 5) - h) + fen.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h).toString(36);
}

/**
 * Convert SRS grade from practice result.
 * practiceResult: "solved" | "failed" | "partial"
 */
export function gradeFromPractice(result) {
  switch (result) {
    case "solved": return GRADE.GOOD;
    case "partial": return GRADE.HARD;
    case "failed": return GRADE.AGAIN;
    default: return GRADE.HARD;
  }
}