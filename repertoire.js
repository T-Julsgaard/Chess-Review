// repertoire.js — Personal Opening Repertoire tracking
// Pure functions, no DOM dependencies — fully testable.

const REPERTOIRE_DB_KEY = "opening-repertoire";

/**
 * Opening entry structure:
 * {
 *   eco, name, color, moveCount, lastPlayed, count, score,
 *   moves: [san, ...],          // user's moves in this opening
 *   bookMoves: [san, ...],      // known book moves (from lichess DB)
 *   gaps: [san, ...],           // book moves not played by user
 *   stats: { win: 0, draw: 0, loss: 0, acc: 0 }
 * }
 */

/**
 * Extract the opening sequence from a game (up to first non-book move or max 15 plies).
 * @param {Object} game - { positions[], classif[], meta }
 * @returns {Array} moves array of SAN strings
 */
export function extractOpeningMoves(game) {
  const { positions, classif } = game;
  const moves = [];
  for (let i = 1; i <= Math.min(15, positions.length); i++) {
    if (classif[i] === "book") {
      moves.push(positions[i].san);
    } else {
      break; // first non-book move ends opening
    }
  }
  return moves;
}

/**
 * Get or create repertoire entry for an opening.
 * @param {Array} repertoire - current repertoire array
 * @param {Object} params - { eco, name, color, moves, result, accuracy }
 * @returns {Object} updated repertoire
 */
export function updateRepertoire(repertoire, { eco, name, color, moves, result, accuracy }) {
  const key = `${eco}-${color}`;
  let entry = repertoire.find(e => e.eco === eco && e.color === color);
  
  const now = Date.now();
  const resultMap = { win: "win", loss: "loss", draw: "draw", "": "draw" };
  const res = resultMap[result] || "draw";
  
  if (!entry) {
    entry = {
      eco,
      name,
      color,
      moveCount: moves.length,
      firstPlayed: now,
      lastPlayed: now,
      count: 0,
      score: 0,
      moves: [],
      bookMoves: [],
      gaps: [],
      stats: { win: 0, draw: 0, loss: 0, acc: [] },
    };
    repertoire.push(entry);
  }
  
  // Update stats
  entry.count += 1;
  entry.lastPlayed = now;
  entry.moveCount = Math.max(entry.moveCount, moves.length);
  entry.stats[res] += 1;
  entry.stats.acc.push(accuracy);
  if (entry.stats.acc.length > 50) entry.stats.acc = entry.stats.acc.slice(-50);
  entry.score = (entry.stats.win + entry.stats.draw * 0.5) / entry.count;
  
  // Track user's moves in this opening
  moves.forEach((san, i) => {
    const existing = entry.moves.find(m => m.ply === i + 1);
    if (existing) {
      existing.count += 1;
      existing.lastPlayed = now;
    } else {
      entry.moves.push({ ply: i + 1, san, count: 1, lastPlayed: now });
    }
  });
  
  return repertoire;
}

/**
 * Update book moves for an entry (from lichess DB).
 */
export function setBookMoves(repertoire, eco, color, bookMoves) {
  const entry = repertoire.find(e => e.eco === eco && e.color === color);
  if (entry) {
    entry.bookMoves = bookMoves;
    updateGaps(entry);
  }
}

/**
 * Compute gaps: book moves not played by user.
 */
function updateGaps(entry) {
  const userMoves = new Set(entry.moves.map(m => `${m.ply}-${m.san}`));
  entry.gaps = entry.bookMoves
    .filter((san, i) => !userMoves.has(`${i + 1}-${san}`))
    .map((san, i) => ({ ply: i + 1, san }));
}

/**
 * Get repertoire for a specific color.
 */
export function getRepertoireByColor(repertoire, color) {
  return repertoire.filter(e => e.color === color)
    .sort((a, b) => b.lastPlayed - a.lastPlayed);
}

/**
 * Get repertoire stats summary.
 */
export function getRepertoireStats(repertoire) {
  const total = repertoire.length;
  const totalGames = repertoire.reduce((s, e) => s + e.count, 0);
  const totalScore = repertoire.reduce((s, e) => s + e.score * e.count, 0) / totalGames || 0;
  const avgDepth = repertoire.reduce((s, e) => s + e.moveCount, 0) / total || 0;
  const totalGaps = repertoire.reduce((s, e) => s + e.gaps.length, 0);
  const byEco = {};
  for (const e of repertoire) {
    byEco[e.eco] = (byEco[e.eco] || 0) + e.count;
  }
  return { total, totalGames, avgScore: totalScore, avgDepth, totalGaps, byEco };
}

/**
 * Get recommendations: openings with most gaps / least played.
 */
export function getRecommendations(repertoire, limit = 10) {
  return repertoire
    .filter(e => e.gaps.length > 0 || e.count < 5)
    .sort((a, b) => (b.gaps.length - a.gaps.length) || (a.count - b.count))
    .slice(0, limit)
    .map(e => ({
      eco: e.eco,
      name: e.name,
      color: e.color,
      gaps: e.gaps.length,
      count: e.count,
      score: e.score,
      topGap: e.gaps[0]?.san,
    }));
}

/**
 * Load repertoire from IndexedDB.
 */
export async function loadRepertoire() {
  try {
    const { [REPERTOIRE_DB_KEY]: data } = await browserAPI.storage.local.get(REPERTOIRE_DB_KEY);
    return data?.repertoire || [];
  } catch {
    return [];
  }
}

/**
 * Save repertoire to IndexedDB.
 */
export async function saveRepertoire(repertoire) {
  try {
    await browserAPI.storage.local.set({ [REPERTOIRE_DB_KEY]: { repertoire, updatedAt: Date.now() } });
  } catch (e) {
    console.warn("Repertoire save failed", e);
  }
}

/**
 * Build repertoire from all games in library.
 * @param {Array} library - array of game records
 * @param {Function} getBookMoves - async function (eco, color) => bookMoves[]
 */
export async function buildRepertoireFromLibrary(library, getBookMoves) {
  const repertoire = [];
  
  for (const game of library) {
    if (!game.pgn || !game.meta) continue;
    
    // Parse PGN to get positions/classif - we need the game analyzed
    // This is a simplified version - in practice we'd use the stored analysis
    const moves = extractOpeningMoves(game);
    if (moves.length === 0) continue;
    
    const eco = game.eco || "A00";
    const name = game.opening || "Unknown";
    const color = game.meSide;
    const result = game.result;
    const accuracy = game.myAcc || 0;
    
    updateRepertoire(repertoire, { eco, name, color, moves, result, accuracy });
  }
  
  // Fetch book moves for each entry
  for (const entry of repertoire) {
    if (entry.bookMoves.length === 0) {
      try {
        const bookMoves = await getBookMoves(entry.eco, entry.color);
        setBookMoves(repertoire, entry.eco, entry.color, bookMoves);
      } catch {
        // book moves unavailable
      }
    }
  }
  
  await saveRepertoire(repertoire);
  return repertoire;
}

/**
 * Add a single game to repertoire incrementally.
 */
export async function addGameToRepertoire(game, getBookMoves) {
  const repertoire = await loadRepertoire();
  const moves = extractOpeningMoves(game);
  if (moves.length === 0) return repertoire;
  
  const eco = game.eco || "A00";
  const name = game.opening || "Unknown";
  const color = game.meSide;
  const result = game.result;
  const accuracy = game.myAcc || 0;
  
  updateRepertoire(repertoire, { eco, name, color, moves, result, accuracy });
  
  if (repertoire.find(e => e.eco === eco && e.color === color)?.bookMoves?.length === 0) {
    try {
      const bookMoves = await getBookMoves(eco, color);
      setBookMoves(repertoire, eco, color, bookMoves);
    } catch {}
  }
  
  await saveRepertoire(repertoire);
  return repertoire;
}

/**
 * Get opening tree for UI display (nested structure).
 */
export function getOpeningTree(repertoire, color) {
  const entries = getRepertoireByColor(repertoire, color);
  const tree = {};
  
  for (const entry of entries) {
    let node = tree;
    for (const m of entry.moves) {
      if (!node[m.san]) {
        node[m.san] = { 
          san: m.san, 
          count: 0, 
          stats: { win: 0, draw: 0, loss: 0 },
          children: {},
          isGap: false,
        };
      }
      node[m.san].count += m.count;
      node = node[m.san].children;
    }
    // Add gaps as special nodes
    for (const gap of entry.gaps) {
      if (!node[gap.san]) {
        node[gap.san] = { san: gap.san, count: 0, stats: {}, children: {}, isGap: true };
      }
      node[gap.san].isGap = true;
    }
  }
  
  return tree;
}