import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {maintainedTools, verifyClaims, verifyDesign} from './verify-source.mjs';

const retiredFunctions = {
  calWinK: 'return NaN;', calMoveAcc: 'return {};', calAccMult: 'return 1;', calAccBias: 'return null;',
  winPct: 'return NaN;', moverWin: 'return NaN;', moveAccuracy: 'return null;',
  sideAccuracies: 'return { w: null, b: null };', estimateElo: 'return null;', estimateEloFromAcc: 'return null;',
  stdev: 'return 0;', harmonicMean: 'return null;', weightedMean: 'return null;',
  powerMean: 'return null;', learnedAccuracy: 'return null;',
};

function verifyHistoryPath(name) {
  if (name.startsWith('tools/calibration/') && !maintainedTools.has(name.slice('tools/calibration/'.length))) {
    throw Error('Retired research in reachable history: ' + name);
  }
  if (/^(?:tools\/dataset|design\/icon-explorations|backup|\.git_sf19_cloud_backup|boards-img|pieces-img\/(?:kaneo|kaneo_midnight|kbyte_gambit|johnpablok)|calibration-runs|scratch|web-ext-artifacts)\//.test(name)) {
    throw Error('Retired or generated directory in reachable history: ' + name);
  }
  if (name === 'docs/DESIGN_HISTORY.md') throw Error('Retired documentation in reachable history: ' + name);
  if (name === 'tests/fixtures/badge-circles.json') throw Error('Retired badge reference in reachable history: ' + name);
}

export function verifyHistoryBlob(name, content) {
  verifyHistoryPath(name);
  verifyClaims(content, name);
  verifyDesign(name, content);
  if (name.startsWith('tests/helpers/') && /\bwinK\s*:/.test(content)) {
    throw Error('Unsupported numerical test fixture in reachable history: ' + name);
  }
  if (name === 'data/calibration.json') {
    const model = JSON.parse(content);
    if (Object.keys(model).length && model.schema !== 'chess-review-public-calibration-v1') {
      throw Error('Unsupported numerical model in reachable history');
    }
  }
  if (name === 'analysis.js' && /\bcalWinK\b/.test(content)) {
    for (const [fn, body] of Object.entries(retiredFunctions)) {
      if (!new RegExp('function ' + fn + '\\(').test(content)) continue;
      const declaration = new RegExp('function ' + fn + '\\([^\\n]*?\\) \\{ ([^\\n]*) \\}').exec(content);
      if (declaration?.[1] !== body) throw Error('Unsupported scoring body in reachable history: ' + fn);
    }
    for (const [name, empty] of [['ELO_ANCHORS', '[]'], ['AGG_FEATURES', '{}']]) {
      if (content.includes('const ' + name + ' =') && !content.includes('const ' + name + ' = ' + empty + ';')) {
        throw Error('Unsupported scoring constants in reachable history: ' + name);
      }
    }
  }
}

export function verifyHistory(refs = ['HEAD'], cwd = process.cwd()) {
  const git = (args, input, binary = false) => execFileSync('git', args, {cwd, input,
    encoding: binary ? undefined : 'utf8', maxBuffer: 256 * 1024 * 1024, windowsHide: true});
  // Raw diffs retain every path associated with a blob, including renamed copies.
  const tokens = git(['log', '--root', '-m', '--raw', '-z', '--no-renames', '--no-abbrev', '--format=', ...refs, '--']).split('\0');
  const names = new Map();
  for (let i = 0; i < tokens.length; i++) {
    const row = /^:\d+ \d+ ([a-f0-9]{40}) ([a-f0-9]{40}) [A-Z]$/.exec(tokens[i].trim());
    if (!row) continue;
    const name = tokens[++i]; verifyHistoryPath(name);
    for (const oid of row.slice(1)) {
      if (/^0+$/.test(oid)) continue;
      if (!names.has(oid)) names.set(oid, new Set());
      names.get(oid).add(name);
    }
  }
  const commits = new Set(git(['rev-list', ...refs]).trim().split('\n').filter(Boolean));
  const oids = [...new Set([...names.keys(), ...commits])];
  if (!oids.length) return 0;
  const metadata = git(['cat-file', '--batch-check'], oids.join('\n') + '\n').trim().split('\n');
  const selected = metadata.filter(row => {
    const [oid, kind, size] = row.split(' ');
    return kind === 'commit' || kind === 'blob' && Number(size) <= 4 * 1024 * 1024 &&
      [...names.get(oid)].some(name => /\.(?:md|txt|json|js|mjs|cjs|html|css|yml|yaml|csv|svg)$/i.test(name));
  }).map(row => row.split(' ')[0]);
  const raw = git(['cat-file', '--batch'], selected.join('\n') + '\n', true);
  let offset = 0, blobs = 0;
  for (const oid of selected) {
    const end = raw.indexOf(10, offset);
    const [, kind, size] = raw.subarray(offset, end).toString().split(' ');
    const bytes = raw.subarray(end + 1, end + 1 + Number(size));
    offset = end + 2 + Number(size);
    if (bytes.includes(0)) continue;
    const content = bytes.toString('utf8');
    if (kind === 'commit') verifyClaims(content.slice(content.indexOf('\n\n') + 2), 'commit ' + oid);
    else {
      for (const name of names.get(oid)) verifyHistoryBlob(name, content);
      blobs++;
    }
  }
  return blobs;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  console.log('Reachable maintained history verified: ' + verifyHistory(process.argv.slice(2).length ? process.argv.slice(2) : ['HEAD']) + ' blobs.');
}
