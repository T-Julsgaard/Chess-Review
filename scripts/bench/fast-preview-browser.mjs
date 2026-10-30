import {Engine} from '../../engine/uci.js';
import {Chess} from '../../lib/chess.js';
import {publicMoveQuality, publicGameAccuracy} from '../../lib/public-scoring.js';

// Experimental, standard-start whole-game preparation. No production scorer uses
// this adapter. Only exact histories validated during this replay are admitted.
export class PreparedGame {
  #commands = new Map();
  constructor(moves) {
    if (!Array.isArray(moves) || !moves.length) throw Error('Missing game moves');
    const chess = new Chess(), initialFen = chess.fen(), prefix = [], roots = [];
    for (const played of moves) {
      if (typeof played !== 'string' || !/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(played)) throw Error('Invalid move');
      const fen = chess.fen(), legal = chess.moves({verbose: true});
      if (!legal.some(move => move.lan === played)) throw Error('Illegal game move');
      const history = Object.freeze({initialFen, moves: Object.freeze([...prefix])});
      const command = 'position fen ' + initialFen + (prefix.length ? ' moves ' + prefix.join(' ') : '');
      this.#commands.set(JSON.stringify([fen, initialFen, history.moves]), command);
      roots.push(Object.freeze({fen, history, played, color: chess.turn(), legalChoices: legal.length}));
      chess.move({from: played.slice(0, 2), to: played.slice(2, 4), promotion: played[4]});
      prefix.push(played);
    }
    this.roots = Object.freeze(roots);
  }
  command(fen, history) {
    const command = this.#commands.get(JSON.stringify([fen, history?.initialFen, history?.moves]));
    if (!command) throw Error('History was not validated for this game');
    return command;
  }
}

export class PreviewEngine extends Engine {
  constructor(path, prepared) {
    super(path);
    this.positionCommands = {get: (fen, history) => prepared.command(fen, history), clear() {}};
  }
  _send(command) {
    if (command === 'ucinewgame') {
      if (this.previewGameStarted) return;
      this.previewGameStarted = true;
    }
    super._send(command);
  }
}

export async function runFastPreview({games, calibration}) {
  const results = [], post = async (type, value) => {
    const response = await fetch('/record', {method: 'POST', body: JSON.stringify({type, ...value})});
    if (!response.ok) throw Error(await response.text());
  };
  for (let trial = 0; trial < 3; trial++) for (const game of games) {
    const key = 'nnue-8-preview-' + game.id + '-' + trial;
    await post('begin', {key, game: game.id, trial, depth: 8});
    const started = performance.now(), prepared = new PreparedGame(game.moves);
    const preparationMs = performance.now() - started;
    const engine = new PreviewEngine('/engine/stockfish-nnue.js', prepared);
    const observations = []; let searches = 0, recoveries = 0;
    try {
      await engine.setOptions({Hash: 16, 'Skill Level': 20, UCI_LimitStrength: false, UCI_ShowWDL: true, UCI_Chess960: false});
      const startupMs = performance.now() - started, searchStarted = performance.now();
      for (const root of prepared.roots) {
        const search = searchMove => {
          searches++;
          return engine.analyse(root.fen, 8, 1, root.history, null,
            {requireExact: true, cold: false, budget: {kind: 'depth', value: 8}, searchMove});
        };
        let best;
        try { best = await search(null); }
        catch (error) { if (!error.scoringMove) throw error; recoveries++; best = await search(error.scoringMove); }
        const top = best.bestmove === root.played, actual = top ? best : await search(root.played);
        const quality = publicMoveQuality(best.score, actual.score, calibration.quality, {top, forced: root.legalChoices === 1});
        observations.push({ply: observations.length + 1, color: root.color, played: root.played, bestmove: best.bestmove,
          best: best.score, actual: actual.score, bestDepth: best.lines[0]?.depth, actualDepth: actual.lines[0]?.depth,
          legalChoices: root.legalChoices, top, ...quality});
      }
      const searchMs = performance.now() - searchStarted, totalMs = performance.now() - started;
      const accuracy = Object.fromEntries(['w', 'b'].map(color => [color, publicGameAccuracy(observations.filter(move => move.color === color))]));
      const result = {key, build: 'nnue', depth: 8, trial, cold: false, fastPreview: true, game: game.id,
        identity: engine.identity, plies: observations.length, searches, recoveries, preparationMs, startupMs, searchMs, totalMs, accuracy,
        decisions: Object.fromEntries(['w', 'b'].map(color => [color, observations.filter(move => move.color === color && move.eligible).length]))};
      if (result.plies !== game.moves.length) throw Error('Incomplete preview');
      await post('result', {...result, observations}); results.push(result);
    } finally {engine.terminate();}
  }
  return {userAgent: navigator.userAgent, hardwareConcurrency: navigator.hardwareConcurrency, results};
}
