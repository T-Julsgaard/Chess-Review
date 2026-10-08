// Shared helpers for the temporary FRIEND-* studies. Synthetic fixtures only:
// this module loads no games. Replays must not import detector code; the neutral
// FEN reader and colour reflection here are the only shared board utilities.
import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import os from 'node:os';
import {openResearchData, sha256} from '../../data-policy.mjs';

export const repoRoot = fileURLToPath(new URL('../../../', import.meta.url));

// Minimal independent FEN reader: square -> piece letter (case = colour).
export function readFen(fen) {
  const [placement, turn] = fen.split(' ');
  const board = {};
  placement.split('/').forEach((row, index) => {
    let file = 0;
    for (const ch of row) {
      if (/\d/.test(ch)) file += Number(ch);
      else board['abcdefgh'[file++] + (8 - index)] = ch;
    }
  });
  return {board, turn};
}

export const flip = square => square[0] + (9 - Number(square[1]));
const flipMove = m => flip(m.slice(0, 2)) + flip(m.slice(2, 4)) + m.slice(4);
const swapCase = ch => ch === ch.toLowerCase() ? ch.toUpperCase() : ch.toLowerCase();

// Colour reflection: ranks reversed, colours swapped, side to move swapped.
// Fixtures used with it must have no castling rights or en-passant square.
export function reflect(fixture) {
  const [placement, turn, rights, ep, ...rest] = fixture.fen.split(' ');
  if (rights !== '-' || ep !== '-') throw Error('reflect needs no castling/en-passant state');
  const fen = [placement.split('/').reverse().map(row => row.replace(/[a-zA-Z]/g, swapCase)).join('/'),
    turn === 'w' ? 'b' : 'w', '-', '-', ...rest].join(' ');
  const out = {...fixture, id: fixture.id + '-black', fen, move: flipMove(fixture.move)};
  if (fixture.history) {
    const start = reflect({id: 'h', fen: fixture.history.fen, move: 'a1a2'}).fen;
    out.history = {fen: start, moves: fixture.history.moves.map(flipMove)};
  }
  return out;
}

export function boardFen(pieces, turn = 'w') {
  const rows = [];
  for (let rank = 8; rank >= 1; rank--) {
    let row = '', empty = 0;
    for (const file of 'abcdefgh') {
      const piece = pieces[file + rank];
      if (piece) { if (empty) { row += empty; empty = 0; } row += piece; } else empty++;
    }
    rows.push(row + (empty || ''));
  }
  return rows.join('/') + ' ' + turn + ' - - 0 1';
}

const normalized = async name => {
  const bytes = await readFile(path.join(repoRoot, name));
  return sha256(name.endsWith('.gz') ? bytes : bytes.toString('utf8').replaceAll('\r\n', '\n'));
};
const git = (...args) => execFileSync('git', args, {cwd: repoRoot, encoding: 'utf8'}).trim();

/**
 * Run every fixture through the detector, the independent replay and the
 * disabled-equals-parent guard; write compact results.json and run.json.
 * study: {id, dir, explain, parent, flagKey, limitKey, analysisKey, replay,
 *         fixtures, inputs}
 */
export async function runStudy(study, argv = process.argv.slice(2)) {
  const out = path.resolve(repoRoot, argv[argv.indexOf('--out') + 1] || `research/experiments/${study.dir}/evidence`);
  const started = performance.now();
  const data = await openResearchData(['D001'], {purpose: 'test'});
  const rows = [], counts = {};
  for (const fixture of study.fixtures) {
    const input = {fen: fixture.fen, move: fixture.move, scanReplies: false,
      ...(fixture.history ? {history: fixture.history} : {}),
      ...(fixture.flag === false ? {} : {[study.flagKey]: fixture.flag ?? true}),
      ...(fixture.limit === undefined ? {} : {[study.limitKey]: fixture.limit}),
      ...(fixture.extra || {})};
    let row;
    try {
      const result = study.explain(input);
      const analysis = result[study.analysisKey] ?? null;
      const state = study.replay(fixture, result).state;
      const {[study.flagKey]: _f, [study.limitKey]: _l, ...parentInput} = input;
      const parentResult = study.parent(parentInput);
      row = {id: fixture.id, state, status: analysis?.status ?? 'disabled', result,
        disabledEqualsParent: fixture.flag === false
          ? JSON.stringify(result) === JSON.stringify(parentResult) : undefined,
        parentEventsPreserved: JSON.stringify(parentResult.events) ===
          JSON.stringify(result.events.filter(e => e.id !== study.eventId))};
    } catch (error) {
      row = {id: fixture.id, error: error.message};
    }
    row.expected = fixture.inputError ? 'error' : fixture.expectedStatus;
    row.ok = fixture.inputError
      ? Boolean(row.error && row.error.includes(fixture.inputError))
      : !row.error && row.status === fixture.expectedStatus && row.state === fixture.expectedStatus
        && row.parentEventsPreserved && row.disabledEqualsParent !== false;
    counts[row.error ? 'input-error' : row.status] = (counts[row.error ? 'input-error' : row.status] || 0) + 1;
    rows.push({fixture, ...row});
  }
  const failures = rows.filter(r => !r.ok).map(r => r.id);
  const results = {schema: study.id + '-synthetic-mechanics-v1',
    source: 'authored synthetic fixtures; no real games', cases: rows.length, counts, failures, rows};
  const json = JSON.stringify(results) + '\n';
  await mkdir(out, {recursive: true});
  await writeFile(path.join(out, 'results.json'), json);
  const inputHashes = {};
  for (const name of study.inputs) inputHashes[name] = await normalized(name);
  const run = {schema: 'research-synthetic-run-v1', experiment: study.id, date: new Date().toISOString(),
    codeRevision: git('rev-parse', 'HEAD'),
    workingTreeStatus: git('status', '--porcelain', '--', ':!research/experiments/' + study.dir + '/evidence', ':!research/runs'),
    command: `node research/experiments/${study.dir}/code/run.mjs${argv.length ? ' ' + argv.join(' ') : ''}`,
    config: {flagKey: study.flagKey, limitKey: study.limitKey, seed: null, engine: null},
    environment: {node: process.version, platform: process.platform + '-' + process.arch, os: os.release()},
    eligibilityReceipt: data.receipt,
    inputHashes, outputHashes: {'results.json': sha256(Buffer.from(json))},
    metrics: {cases: rows.length, failures: failures.length, counts, bytes: Buffer.byteLength(json)},
    elapsedMs: performance.now() - started};
  await writeFile(path.join(out, 'run.json'), JSON.stringify(run, null, 2) + '\n');
  console.log(JSON.stringify({passed: failures.length === 0, failures, ...run.metrics, out,
    outputHashes: run.outputHashes}, null, 2));
  if (failures.length) process.exitCode = 1;
}

// Deterministic tamper helper for replay tests: deep clone then mutate.
export const clone = value => JSON.parse(JSON.stringify(value));
