import {Chess} from './chess.js';
import {Engine} from '../engine/uci.js';
import {publicMoveQuality, publicGameAccuracy} from './public-scoring.js';
import {BUTTON_PREVIEW_VERSION} from './button-preview.js';
import {createImportRequest, checkImport, waitImport} from './import-request.js';

export function finishedPreviewGame(pgn) {
  if (typeof pgn !== 'string' || pgn.length > 150000) throw Error('Game unavailable');
  const game = new Chess(); game.loadPgn(pgn, {strict:true});
  const headers = game.getHeaders();
  if (!/^(1-0|0-1|1\/2-1\/2)$/.test(headers.Result || '')) throw Error('Preview requires a completed game');
  if (headers.FEN || headers.SetUp === '1' || headers.Variant && !/^(standard|chess)$/i.test(headers.Variant)) throw Error('Unsupported preview position');
  const moves = game.history({verbose:true}).map(move => move.lan);
  if (!moves.length || moves.length > 1024) throw Error('Unsupported game length');
  return {moves, players:{w:headers.White || 'White',b:headers.Black || 'Black'}};
}

export class PreviewPositions {
  #commands = new WeakMap();
  constructor(moves, check = () => {}) {
    const game = new Chess(), initialFen = game.fen(), prefix = [], roots = [];
    let bytes = 0;
    for (const played of moves) {
      check();
      const legal = game.moves({verbose:true});
      if (!legal.some(move => move.lan === played)) throw Error('Invalid preview move');
      const fen = game.fen(), history = Object.freeze({initialFen,moves:Object.freeze([...prefix])});
      const command = 'position fen ' + initialFen + (prefix.length ? ' moves ' + prefix.join(' ') : '');
      bytes += command.length * 4;
      if (bytes > 4 * 1024 * 1024) throw Error('Preview too large');
      this.#commands.set(history,{fen,command});
      roots.push(Object.freeze({fen,history,played,color:game.turn(),forced:legal.length === 1}));
      game.move({from:played.slice(0,2),to:played.slice(2,4),promotion:played[4]}); prefix.push(played);
    }
    this.roots = Object.freeze(roots); Object.freeze(this);
  }
  command(fen, history) {
    const entry = this.#commands.get(history);
    if (!entry || entry.fen !== fen) throw Error('Unvalidated preview history');
    return entry.command;
  }
}

class PreviewEngine extends Engine {
  constructor(prepared) {
    super('engine/stockfish-nnue.js');
    this.positionCommands = {get:(fen,history) => prepared.command(fen,history),clear() {}};
  }
  _send(command) {
    if (command === 'ucinewgame') {
      if (this.previewStarted) return;
      this.previewStarted = true;
    }
    super._send(command);
  }
}

// Never persists roots or returns calibrated evidence. One worker, full move
// coverage, bounded lifetime; every result is explicitly an estimate.
export async function analyseButtonPreview(pgn, {signal, createEngine = prepared => new PreviewEngine(prepared), budgetMs = 6000,
  loadCalibration = async () => (await fetch(new URL('../data/calibration.json',import.meta.url))).json()} = {}) {
  const request = createImportRequest(signal,budgetMs), started = performance.now();
  const check = () => {checkImport(request.signal); if (performance.now() - started > budgetMs) throw Error('Preview timed out');};
  const wait = promise => waitImport(promise,request.signal);
  let engine;
  const stop = () => engine?.terminate();
  request.signal.addEventListener('abort',stop,{once:true});
  try {
    check(); const parsed = finishedPreviewGame(pgn), prepared = new PreviewPositions(parsed.moves,check);
    engine = createEngine(prepared); check();
    const calibration = await wait(loadCalibration()); check();
    await wait(engine.setOptions({Hash:16,'Skill Level':20,UCI_LimitStrength:false,UCI_ShowWDL:true,UCI_Chess960:false}));
    const decisions = {w:[],b:[]};
    for (const root of prepared.roots) {
      check();
      if (root.forced) continue;
      const options = {requireExact:true,cold:false,budget:{kind:'depth',value:8}};
      let best;
      try {best = await wait(engine.analyse(root.fen,8,1,root.history,null,options));}
      catch (error) {
        check();
        if (!error.scoringMove) throw error;
        best = await wait(engine.analyse(root.fen,8,1,root.history,null,{...options,searchMove:error.scoringMove}));
      }
      const top = best.bestmove === root.played;
      const played = top ? best : await wait(engine.analyse(root.fen,8,1,root.history,null,{...options,searchMove:root.played}));
      decisions[root.color].push(publicMoveQuality(best.score,played.score,calibration.quality,{top}));
    }
    check();
    return {version:BUTTON_PREVIEW_VERSION,estimated:true,players:parsed.players,
      accuracy:{w:publicGameAccuracy(decisions.w),b:publicGameAccuracy(decisions.b)}};
  } finally {request.dispose(); request.signal.removeEventListener('abort',stop); engine?.terminate();}
}
