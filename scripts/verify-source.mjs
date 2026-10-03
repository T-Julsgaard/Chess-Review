import {readFile, readdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

export const maintainedTools = new Set([
  'BRILLIANT_MOVES.md', 'HISTORY.md', 'PUBLIC_METHOD.md', 'README.md',
  'category-benchmark.mjs', 'core.mjs', 'engine-host.cjs', 'engine.mjs',
  'fit-huber.mjs', 'fit-rating.mjs', 'fullgame-context.mjs', 'grouped-human-choice.mjs',
  'human-policy.mjs', 'io.mjs', 'peer-quality.mjs', 'reproduce-public.mjs',
  'public/dataset.json.gz', 'public/expected-scores.json', 'public/manifest.json',
  'public/sf18-evidence.json.gz', 'public/sf18-rating-evidence.json.gz',
  'public/sf19-rating-evidence.json.gz', 'public/sources.json', 'public/validation.json',
]);
async function files(dir, prefix = '') {
  const result = [];
  try {
    for (const entry of await readdir(dir, {withFileTypes: true})) {
      const name = prefix + entry.name;
      if (entry.isDirectory()) result.push(...await files(path.join(dir, entry.name), name + '/'));
      else result.push(name);
    }
  } catch (error) { if (error.code !== 'ENOENT') throw error; }
  return result;
}

export async function verifySource(root) {
  const model = JSON.parse(await readFile(path.join(root, 'data/calibration.json'), 'utf8'));
  if (model.schema !== 'chess-review-public-calibration-v1') throw Error('Unsupported numerical model schema');
  const permitted = new Set(['schema', 'version', 'source', 'quality', 'context', 'movesOnly', 'classification', 'clsWp']);
  for (const key of Object.keys(model)) if (!permitted.has(key)) throw Error('Unsupported numerical model field: ' + key);
  if (!model.quality?.candidateVersion || !model.context?.model || !model.movesOnly?.sf18?.model || !model.movesOnly?.sf19?.model) {
    throw Error('Maintained public numerical models are required');
  }
  const source = await readFile(path.join(root, 'analysis.js'), 'utf8');
  if (/\b(?:calWinK|calMoveAcc|calAccBias|calAccMult|ELO_ANCHORS|AGG_FEATURES|learnedAccuracy|estimateEloFromAcc)\b/.test(source)) {
    throw Error('Unsupported scoring implementation in analysis.js');
  }
  for (const file of await files(path.join(root, 'tools/calibration'))) {
    if (!maintainedTools.has(file)) throw Error('Unmaintained calibration tool: ' + file);
  }
  for (const directory of ['tools/dataset', 'design/icon-explorations', 'backup', '.git_sf19_cloud_backup', 'boards-img',
    'pieces-img/kaneo', 'pieces-img/kaneo_midnight', 'pieces-img/kbyte_gambit', 'pieces-img/johnpablok']) {
    if ((await files(path.join(root, directory))).length) throw Error('Retired directory: ' + directory);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await verifySource(fileURLToPath(new URL('../', import.meta.url)));
  console.log('Maintained source and numerical model verified.');
}
