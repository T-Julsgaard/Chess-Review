import {readFile, writeFile, mkdir, stat, realpath} from 'node:fs/promises';
import {gzipSync} from 'node:zlib';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {openResearchData, openResearchSource, sha256} from '../../data-policy.mjs';
import {pinnedFiles, codeHash, decodeFragment, createReconstruction, scanFragment, finishReconstruction} from '../../d001-format.mjs';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const base = 'research/datasets/D001-public-baseline/';
const sourceFile = 'tools/calibration/public/sources.json', gameFile = 'tools/calibration/public/dataset.json.gz';

export async function fetchFragment(frame, fetchImpl = fetch) {
  const response = await fetchImpl(frame.url, {redirect: 'error', headers: {
    Range: `bytes=${frame.start}-${frame.end}`, 'Accept-Encoding': 'identity'}, signal: AbortSignal.timeout(45000)});
  if (response.status !== 206 || response.url !== frame.url
      || response.headers.get('content-range') !== `bytes ${frame.start}-${frame.end}/${frame.archiveBytes}`) {
    await response.body?.cancel(); throw Error('Unexpected fragment HTTP range response');
  }
  const chunks = []; let size = 0;
  for await (const chunk of response.body) {
    size += chunk.length; if (size > frame.bytes) throw Error('Fragment response exceeds byte bound');
    chunks.push(chunk);
  }
  const bytes = Buffer.concat(chunks);
  if (size !== frame.bytes || sha256(bytes) !== frame.sha256) throw Error('Downloaded fragment hash/size differs');
  return bytes;
}

async function main() {
  const args = process.argv.slice(2);
  if (args.some(a => !['--download', '--record'].includes(a)) || new Set(args).size !== args.length)
    throw Error('Use reconstruct.mjs [--download] [--record]');
  if (Number(process.versions.node.split('.')[0]) < 24) throw Error('Node.js 24 or later required');
  const recordMode = args.includes('--record'), download = args.includes('--download');
  const access = await openResearchData(['D001'], {purpose: 'inspect'});
  const sources = await access.readJson(sourceFile), expected = await access.readJson(gameFile);
  const codeSha256 = Object.fromEntries(await Promise.all(pinnedFiles.map(async n => [n, codeHash(await readFile(path.join(root, n)))])));
  if (recordMode) {
    for (const n of ['reconstruction.json', 'locators.json.gz']) {
      try {await stat(path.join(root, base, n)); throw Error('Refusing to replace retained evidence: ' + n);}
      catch (e) {if (e.code !== 'ENOENT') throw e;}
    }
  } else {
    const saved = await access.readJson(base + 'reconstruction.json');
    if (JSON.stringify(saved.codeSha256) !== JSON.stringify(codeSha256)) throw Error('Pinned reconstruction dependencies differ');
  }
  const cache = path.join(root, 'research/runs/D001-reconstruction/frames');
  await mkdir(cache, {recursive: true});
  // Refuse a symlink/junction that would redirect downloaded cache files outside this checkout.
  const within = path.relative(await realpath(root), await realpath(cache));
  if (within.startsWith('..') || path.isAbsolute(within)) throw Error('Frame cache escapes repository');
  const state = createReconstruction(), receipts = [], started = performance.now(); let bytes = 0;
  for (const source of sources.sources) {
    let receipt;
    for (let i = 0; i < source.frames.length; i++) {
      const frame = source.frames[i], filename = path.join(cache, `${source.month}-${i}.zst`);
      let raw;
      try {raw = await readFile(filename);}
      catch (e) {
        if (e.code !== 'ENOENT') throw e;
        if (!download) throw Error('Missing cached fragment; rerun with --download');
        receipt ??= (await openResearchSource(source.url)).receipt;
        raw = await fetchFragment(frame);
        await writeFile(filename, raw, {flag: 'wx'});
      }
      const decoded = decodeFragment(raw, frame);
      scanFragment(state, decoded, source.month, i, frame); bytes += raw.length;
      if (state.frames.length % 5 === 0) console.log(`Verified ${state.frames.length}/60 fragments`);
    }
    if (receipt) receipts.push(receipt);
  }
  const inputHashes = Object.fromEntries([sourceFile, gameFile].map(n => [n, access.receipt.inputHashes[n]]));
  const rebuilt = finishReconstruction(state, expected, sources, inputHashes);
  if (recordMode) {
    const record = {result: rebuilt.result, codeSha256, run: {date: new Date().toISOString(),
      command: 'node ' + base + 'reconstruct.mjs ' + args.join(' '),
      environment: {node: process.version, platform: process.platform, arch: process.arch},
      sourceEligibility: receipts, dataEligibility: access.receipt, elapsedMs: performance.now() - started}};
    await writeFile(path.join(root, base, 'locators.json.gz'), gzipSync(JSON.stringify(rebuilt.locators) + '\n'), {flag: 'wx'});
    await writeFile(path.join(root, base, 'reconstruction.json'), JSON.stringify(record, null, 2) + '\n', {flag: 'wx'});
  } else {
    const saved = await access.readJson(base + 'reconstruction.json'), locators = await access.readJson(base + 'locators.json.gz');
    if (JSON.stringify(saved.result) !== JSON.stringify(rebuilt.result) || JSON.stringify(locators) !== JSON.stringify(rebuilt.locators))
      throw Error('Retained reconstruction or locators differ');
  }
  console.log(JSON.stringify({passed: true, frames: state.frames.length, bytes, games: rebuilt.result.games,
    exactNormalizedRebuild: true, individualRawMembership: true, engineSearches: 0, modelFits: 0,
    elapsedSeconds: (performance.now() - started) / 1000}, null, 2));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
