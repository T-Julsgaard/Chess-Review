import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {maintainedTools} from './verify-source.mjs';

const retiredFunctions = {
  calWinK: 'return NaN;', calMoveAcc: 'return {};', calAccMult: 'return 1;', calAccBias: 'return null;',
  winPct: 'return NaN;', moverWin: 'return NaN;', moveAccuracy: 'return null;',
  sideAccuracies: 'return { w: null, b: null };', estimateElo: 'return null;', estimateEloFromAcc: 'return null;',
  stdev: 'return 0;', harmonicMean: 'return null;', weightedMean: 'return null;',
  powerMean: 'return null;', learnedAccuracy: 'return null;',
};

export function verifyHistoryBlob(name, content) {
  if (name.startsWith('tools/calibration/') && !maintainedTools.has(name.slice('tools/calibration/'.length))) {
    throw Error('Retired research in reachable history: ' + name);
  }
  if (/^(?:tools\/dataset|design\/icon-explorations|backup|\.git_sf19_cloud_backup|boards-img|pieces-img\/(?:kaneo|kaneo_midnight|kbyte_gambit|johnpablok)|calibration-runs|web-ext-artifacts)\//.test(name)) {
    throw Error('Retired or generated directory in reachable history: ' + name);
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
  const git = args => execFileSync('git', args, {cwd, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, windowsHide: true});
  const rows = git(['rev-list', '--objects', ...refs]).trim().split('\n');
  let blobs = 0;
  for (const row of rows) {
    const space = row.indexOf(' '); if (space < 0) continue;
    const oid = row.slice(0, space), name = row.slice(space + 1);
    if (!/^(?:analysis\.js|data\/calibration\.json|tools\/(?:calibration|dataset)\/|design\/icon-explorations\/|backup\/|\.git_sf19_cloud_backup\/|boards-img\/|pieces-img\/(?:kaneo|kaneo_midnight|kbyte_gambit|johnpablok)\/|calibration-runs\/|web-ext-artifacts\/)/.test(name)) continue;
    if (git(['cat-file', '-t', oid]).trim() !== 'blob') continue;
    const content = ['analysis.js', 'data/calibration.json'].includes(name) ? git(['cat-file', '-p', oid]) : '';
    verifyHistoryBlob(name, content); blobs++;
  }
  return blobs;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  console.log('Reachable maintained history verified: ' + verifyHistory(process.argv.slice(2).length ? process.argv.slice(2) : ['HEAD']) + ' blobs.');
}
