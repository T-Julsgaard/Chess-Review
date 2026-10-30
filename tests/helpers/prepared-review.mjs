// Isolated acceptance-test candidate. No production code imports this module.
import {Chess} from '../../lib/chess.js';
import {Engine} from '../../engine/uci.js';

export class PreparedReview {
  #commands = new WeakMap();
  constructor(moves, {initialFen = new Chess().fen(), maxBytes = 4 * 1024 * 1024} = {}) {
    if (!Array.isArray(moves) || !Number.isSafeInteger(maxBytes) || maxBytes < 1) throw Error('Invalid prepared review');
    const chess = new Chess(initialFen), initial = chess.fen(), prefix = [], roots = [];
    let bytes = 0;
    for (let index = 0; index <= moves.length; index++) {
      const fen = chess.fen(), history = Object.freeze({initialFen: initial, moves: Object.freeze([...prefix])});
      const command = 'position fen ' + initial + (prefix.length ? ' moves ' + prefix.join(' ') : '');
      // Bound stored command and prefix text, including UTF-16 string storage.
      bytes += 2 * (command.length + initial.length + prefix.reduce((sum, move) => sum + move.length, 0));
      if (bytes > maxBytes) throw Error('Prepared review exceeds memory budget');
      const legal = chess.moves({verbose: true}), played = moves[index] ?? null;
      const terminal = chess.isCheckmate() ? {mate: fen.split(' ')[1] === 'w' ? -1 : 1}
        : chess.isDraw() ? {cp: 0} : null;
      this.#commands.set(history, {fen, command});
      roots.push(Object.freeze({fen, history, played, color: chess.turn(), legalChoices: legal.length,
        terminal: terminal && Object.freeze(terminal)}));
      if (index === moves.length) break;
      if (typeof played !== 'string' || !/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(played)
          || !legal.some(move => move.lan === played)) throw Error('Illegal prepared move');
      chess.move({from: played.slice(0, 2), to: played.slice(2, 4), promotion: played[4]});
      prefix.push(played);
    }
    this.initialFen = initial;
    this.roots = Object.freeze(roots);
    this.bytes = bytes;
    Object.freeze(this);
  }
  command(fen, history) {
    const entry = this.#commands.get(history);
    if (!entry || entry.fen !== fen) throw Error('Unvalidated prepared history');
    return entry.command;
  }
}

export class PreparedReviewEngine extends Engine {
  constructor(path, prepared, {retainState = false} = {}) {
    super(path);
    this.positionCommands = {get: (fen, history) => prepared.command(fen, history), clear() {}};
    this.retainState = retainState;
  }
  _send(command) {
    if (this.retainState) {
      if (command === 'setoption name Clear Hash') return;
      if (command === 'ucinewgame') {
        if (this.preparedGameStarted) return;
        this.preparedGameStarted = true;
      }
    }
    super._send(command);
  }
}
