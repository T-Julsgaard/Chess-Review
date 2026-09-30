import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { hashFile } from './io.mjs';

export async function engineConfig(enginePath, budget) {
  const loaderSha256 = await hashFile(enginePath), wasmSha256 = await hashFile(enginePath.replace(/\.js$/, '.wasm'));
  if (loaderSha256 !== '2278005057f381491f1c9bb3e44c9f5920b3a00bef9759e33cc6582769a1f1fe' ||
      wasmSha256 !== 'a8fbc05ec6920b56d7485826dcb02c5ffd2826bcbf751cf973046f237a9096f1')
    throw Error('Unvalidated build/network; only exact bundled SF18 Lite hashes accepted');
  return { version: 'Stockfish 18 (identity verified at UCI startup)', build: 'stockfish.js lite single-threaded',
    network: 'nn-9067e33176e8.nnue', loaderSha256, wasmSha256,
    budget, options: { Threads: 1, Hash: 32, MultiPV: 1, 'Skill Level': 20,
      UCI_LimitStrength: false, UCI_ShowWDL: true, UCI_Chess960: false },
    reset: 'ucinewgame + Clear Hash + isready before every search',
    tablebases: 'none', perspective: 'side to move at root', position: 'startpos with full move history' };
}
export class Engine {
  constructor(file) {
    this.child = spawn(process.execPath, [fileURLToPath(new URL('./engine-host.cjs', import.meta.url)), path.resolve(file)],
      { windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
    this.lines = []; this.waiter = null; this.failure = null;
    createInterface({ input: this.child.stdout }).on('line', line => {
      this.lines.push(line);
      if (this.waiter?.predicate(line)) this.waiter.finish();
    });
    this.child.stderr.on('data', data => { this.stderr = (this.stderr || '') + data; });
    const fail = error => { this.failure = error; this.waiter?.finish(error); };
    this.child.on('error', fail);
    this.child.on('exit', code => fail(Error(`Engine exited ${code}: ${(this.stderr || '').slice(-500)}`)));
    this.child.stdin.on('error', fail);
  }
  send(command) { if (this.failure) throw this.failure; this.child.stdin.write(command + '\n'); }
  until(predicate, timeout = 60000) {
    if (this.failure) return Promise.reject(this.failure);
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { this.waiter?.finish(Error('Engine timeout')); this.close(); }, timeout);
      this.waiter = { predicate, finish: error => {
        clearTimeout(timer); this.waiter = null;
        const lines = this.lines; this.lines = [];
        error ? reject(error) : resolve(lines);
      } };
      if (this.lines.some(predicate)) this.waiter.finish();
    });
  }
  async init(config) {
    this.send('uci');
    const lines = await this.until(l => l === 'uciok');
    this.identity = lines.find(l => l.startsWith('id name '))?.slice(8);
    if (!/^Stockfish 18\b/.test(this.identity || '')) throw Error(`Unsupported identity: ${this.identity}`);
    for (const [name, value] of Object.entries(config.options)) {
      // Single-threaded builds may not expose Threads; record its enforced build value.
      if (name === 'Threads' && !lines.some(l => l.startsWith('option name Threads '))) continue;
      if (!lines.some(l => l.startsWith(`option name ${name} `))) throw Error(`Missing UCI option: ${name}`);
      this.send(`setoption name ${name} value ${value}`);
    }
    this.send('isready'); await this.until(l => l === 'readyok');
    return { identity: this.identity, uci: lines };
  }
  async search(moves, played, budget) {
    this.send('ucinewgame'); this.send('setoption name Clear Hash');
    this.send('isready'); await this.until(l => l === 'readyok');
    this.send('position startpos' + (moves.length ? ' moves ' + moves.join(' ') : ''));
    const started = performance.now();
    this.send(`go ${budget.kind} ${budget.value}` + (played ? ` searchmoves ${played}` : ''));
    const lines = await this.until(l => l.startsWith('bestmove '));
    const info = lines.filter(l => /^info .* score /.test(l) && !/\b(lowerbound|upperbound)\b/.test(l) && /\bpv /.test(l)).at(-1);
    if (!info) throw Error('Missing exact score from engine');
    const score = /\bscore (cp|mate) (-?\d+)/.exec(info);
    const wdl = /\bwdl (\d+) (\d+) (\d+)/.exec(info);
    if (!score || (!wdl && score[1] !== 'mate')) throw Error('Missing WDL/score');
    return { score: { [score[1]]: Number(score[2]), ...(wdl ? { wdl: wdl.slice(1).map(Number) } : {}) },
      bestmove: lines.at(-1).split(' ')[1], pv: info.split(' pv ')[1],
      depth: Number(/\bdepth (\d+)/.exec(info)?.[1]), nodes: Number(/\bnodes (\d+)/.exec(info)?.[1]),
      elapsedMs: performance.now() - started, rawInfo: info,
      finalSearchInfo: lines.filter(l => /^info depth /.test(l)).at(-1) };
  }
  close() { this.child.kill(); }
}
