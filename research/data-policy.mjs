import {readFile, realpath} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {validateFresh,firstFrame} from './fresh-format.mjs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const repo = fileURLToPath(new URL('../', import.meta.url));
const registryPath = 'research/datasets/approved-sources.json';
const purposes = new Set(['collect', 'inspect', 'analyze', 'train', 'tune', 'validate', 'test', 'examples', 'reuse']);
const kinds = new Set(['sources', 'games', 'game-evidence', 'rating-evidence', 'summary', 'raw-pgn-zstd']);
export const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const fail = message => { throw Error('Research data prohibited: ' + message); };
const digest = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const nonempty = value => Array.isArray(value) && value.length > 0;

function safePath(relative) {
  if (typeof relative !== 'string' || !relative || relative.includes('\\') || relative.includes(':')
      || relative.startsWith('/') || relative.split('/').some(p => !p || p === '.' || p === '..')) fail('unsafe artifact path');
  return relative;
}

async function localBytes(root, relative) {
  const name = safePath(relative), base = await realpath(root), resolved = await realpath(path.join(base, name));
  const within = path.relative(base, resolved);
  if (within.startsWith('..') || path.isAbsolute(within)) fail('artifact escapes repository: ' + name);
  return readFile(resolved);
}

function httpsUrl(url) {
  try {const parsed = new URL(url); return parsed.protocol === 'https:' && !parsed.username && !parsed.password;}
  catch {return false;}
}

export function validateRegistry(registry, purpose) {
  if (!purposes.has(purpose)) fail('unknown use purpose');
  if (registry.schema !== 'research-approved-sources-v1' || registry.policyVersion !== 'public-data-v1'
      || !nonempty(registry.sources) || !nonempty(registry.datasets)) fail('unsupported or empty source registry');
  const ids = new Set(), exports = new Set(), datasets = new Set();
  for (const source of registry.sources) {
    if (!source.id || ids.has(source.id)) fail('missing/duplicate source ID');
    ids.add(source.id);
    if (source.status !== 'approved' || source.public !== true || source.freeToUse !== true
        || source.license !== 'CC0-1.0' || !source.publisher || !httpsUrl(source.termsUrl)
        || !/^\d{4}-\d{2}-\d{2}$/.test(source.verifiedOn ?? '')
        || !nonempty(source.allowedPurposes) || source.allowedPurposes.some(p => !purposes.has(p))
        || !source.allowedPurposes.includes(purpose)) fail('unapproved/incompatible source or purpose: ' + source.id);
    if (!source.evidence || !digest(source.evidence.sha256)) fail('missing permission evidence');
    safePath(source.evidence.path);
    if (!nonempty(source.exports)) fail('missing exact approved exports');
    for (const url of source.exports) {
      if (!httpsUrl(url) || exports.has(url)) fail('invalid/duplicate export URL');
      exports.add(url);
    }
  }
  for (const dataset of registry.datasets) {
    if (!dataset.id || datasets.has(dataset.id)) fail('missing/duplicate dataset ID');
    datasets.add(dataset.id); safePath(dataset.manifest);
  }
}

export function validateManifest(manifest, registry) {
  if (manifest.schema !== 'research-dataset-manifest-v1' || !manifest.id
      || !nonempty(manifest.sourceIds) || new Set(manifest.sourceIds).size !== manifest.sourceIds.length) fail('invalid dataset manifest');
  for (const id of manifest.sourceIds) if (!registry.sources.some(s => s.id === id)) fail('unknown contributing source: ' + id);
  // Additional formats must supply an explicit origin checker before admission.
  if (!['lichess-month-v1','lichess-prefix-v1'].includes(manifest.originFormat)) fail('unsupported origin format');
  const fresh=manifest.originFormat==='lichess-prefix-v1';
  if (!manifest.provenance || !nonempty(manifest.provenance.limitations) || !manifest.provenance.replayRecipe) fail('missing provenance record');
  if (!fresh&&(manifest.provenance.status!=='legacy-partial'||manifest.id!=='D001')) fail('unsupported legacy provenance');
  if (fresh&&(manifest.provenance.status!=='pipeline-verified'||manifest.id!=='D002'
      ||manifest.provenance.selectionSeed!=='D002-select-v1:'||manifest.provenance.splitSeed!=='D002-split-v1:'
      ||!manifest.provenance.exclusions||manifest.provenance.exclusionInput!=='tools/calibration/public/dataset.json.gz'
      ||!digest(manifest.provenance.formatSha256))) fail('unsupported fresh provenance');
  if (!manifest.artifacts || !Object.keys(manifest.artifacts).length) fail('empty artifact inventory');
  for (const [name, entry] of Object.entries(manifest.artifacts)) {
    safePath(name);
    if (!digest(entry.sha256) || !digest(entry.uncompressedSha256) || !Number.isInteger(entry.bytes) || entry.bytes < 1
        || !kinds.has(entry.kind) || !Array.isArray(entry.parents)) fail('invalid artifact record: ' + name);
    if (entry.kind !== 'sources' && !entry.parents.length) fail('missing derivative lineage: ' + name);
    if (entry.kind === 'sources' && (entry.parents.length || name !== manifest.sourceRecord)) fail('unrecognized source record or lineage root');
    if(entry.kind==='raw-pgn-zstd'&&(!fresh||!name.endsWith('.zst')||entry.parents.length!==1||entry.parents[0]!==manifest.sourceRecord))fail('unbound raw frame artifact');
  }
  if (manifest.artifacts[manifest.normalized]?.kind !== 'games' || manifest.artifacts[manifest.sourceRecord]?.kind !== 'sources') fail('missing game/source records');
  const done = new Set(), visiting = new Set();
  const visit = name => {
    if (done.has(name)) return;
    if (visiting.has(name)) fail('cyclic derivative lineage');
    const entry = manifest.artifacts[name];
    if (!entry) fail('unregistered parent: ' + name);
    visiting.add(name); entry.parents.forEach(visit); visiting.delete(name); done.add(name);
  };
  Object.keys(manifest.artifacts).forEach(visit);
}

export function verifyArtifact(bytes, entry, name) {
  if (bytes.length !== entry.bytes || sha256(bytes) !== entry.sha256) fail('file hash/size differs: ' + name);
  let decoded;
  if(entry.kind==='raw-pgn-zstd'){
    if(bytes.length>8*1024*1024)fail('raw prefix frame exceeds budget');
    const frame=firstFrame(bytes);if(!frame||frame.frame.length!==bytes.length)fail('raw frame incomplete or has appended bytes');decoded=frame.decoded;
  }else decoded=name.endsWith('.gz') ? gunzipSync(bytes) : bytes;
  if (sha256(decoded) !== entry.uncompressedSha256) fail('decoded hash differs: ' + name);
  return decoded;
}

export function verifyOrigins(manifest, registry, records, hashes={}) {
  const sources = records.get(manifest.sourceRecord), games = records.get(manifest.normalized);
  const approved = registry.sources.filter(s => manifest.sourceIds.includes(s.id));
  const urls = new Set(approved.flatMap(s => s.exports));
  if (sources?.license !== 'CC0-1.0' || !approved.some(s => s.termsUrl === sources.licenseUrl)
      || !nonempty(sources.sources) || !nonempty(games)) fail('missing licensed archive/game origins');
  const months = new Map();
  for (const source of sources.sources) {
    if (!urls.has(source.url) || source.license !== 'CC0-1.0' || months.has(source.month)
        || !/^\d{4}-(0[1-9]|1[0-2])$/.test(source.month ?? '')
        || !source.url.endsWith('/lichess_db_standard_rated_' + source.month + '.pgn.zst')
        || !nonempty(source.frames)) fail('unapproved/missing archive origin');
    for (const frame of source.frames) {
      if (frame.url !== source.url || !digest(frame.sha256) || !Number.isInteger(frame.start) || frame.start < 0
          || !Number.isInteger(frame.end) || frame.end < frame.start || frame.bytes !== frame.end - frame.start + 1
          || !frame.retrievedAt || !frame.verification) fail('invalid archive acquisition record');
    }
    months.set(source.month, source.url);
  }
  const byId = new Map();
  for (const game of games) {
    if (!/^[A-Za-z0-9]{8}$/.test(game.id ?? '') || byId.has(game.id)
        || game.source !== 'https://lichess.org/' + game.id || !months.has(game.sourceMonth)
        || game.date?.slice(0, 7).replace('.', '-') !== game.sourceMonth || !nonempty(game.moves)) fail('unknown/invalid game origin');
    byId.set(game.id, game);
  }
  if(manifest.originFormat==='lichess-prefix-v1'){
    try{validateFresh(manifest,records,hashes);}catch(e){fail(e.message);}
  }
  for (const [name, entry] of Object.entries(manifest.artifacts)) {
    const data = records.get(name);
    if (entry.kind === 'game-evidence' || (entry.kind === 'games' && name !== manifest.normalized)) {
      const derivedGames = entry.kind === 'games' ? data : data.games;
      if (!nonempty(derivedGames)) fail('missing derivative game origins');
      for (const game of derivedGames) if (JSON.stringify(game) !== JSON.stringify(byId.get(game.id))) fail('derivative game origin differs: ' + name);
      for (const position of data.positions ?? []) if (!byId.has(position.gameId)) fail('unknown derivative position origin');
    } else if (entry.kind === 'rating-evidence') {
      if (!nonempty(data.rows)) fail('missing derivative rating origins');
      for (const row of data.rows) {
        const game = byId.get(row.gameId), player = game?.players.find(p => p.color === row.color);
        if (!player || player.id !== row.playerId || player.rating !== row.ratingTarget || game.split !== row.split) fail('unknown derivative rating origin');
      }
    } else if (entry.kind === 'summary') {
      // Reports/parameters may aggregate games. Any per-game references they do
      // retain still have to resolve to this dataset, including nested predictions.
      const check = value => {
        if (!value || typeof value !== 'object') return;
        if (Object.hasOwn(value, 'gameId') && !byId.has(value.gameId)) fail('unknown summary game origin: ' + name);
        if (Array.isArray(value.games)) for (const game of value.games) {
          if (!byId.has(game.id) || (game.split && game.split !== byId.get(game.id).split)) fail('unknown summary cohort origin: ' + name);
        }
        Object.values(value).forEach(check);
      };
      check(data);
    }
  }
  return {gameCount: games.length, archives: [...months.values()]};
}

export async function openResearchData(ids, {purpose = 'inspect', root = repo} = {}) {
  if (!nonempty(ids) || new Set(ids).size !== ids.length) fail('explicit unique dataset IDs required');
  const registryBytes = await localBytes(root, registryPath), registry = JSON.parse(registryBytes);
  validateRegistry(registry, purpose);
  const sources = new Map(), sourceEvidence = {};
  const manifests = [], manifestHashes = {};
  for (const id of ids) {
    const dataset = registry.datasets.find(d => d.id === id);
    if (!dataset) fail('unregistered dataset: ' + id);
    const bytes = await localBytes(root, dataset.manifest), manifest = JSON.parse(bytes);
    if (manifest.id !== id) fail('dataset identity differs');
    validateManifest(manifest, registry); manifests.push(manifest); manifestHashes[id] = sha256(bytes);
    if(manifest.originFormat==='lichess-prefix-v1'&&manifest.provenance.formatSha256!==sha256(await readFile(new URL('fresh-format.mjs',import.meta.url))))fail('fresh origin checker revision differs');
    for (const sourceId of manifest.sourceIds) sources.set(sourceId, registry.sources.find(s => s.id === sourceId));
  }
  // Verify publisher evidence before reading any registered game artifact.
  for (const source of sources.values()) {
    const bytes = await localBytes(root, source.evidence.path);
    if (sha256(bytes) !== source.evidence.sha256) fail('permission evidence hash differs: ' + source.id);
    sourceEvidence[source.id] = {license: source.license, termsUrl: source.termsUrl, verifiedOn: source.verifiedOn, evidenceSha256: sha256(bytes)};
  }
  const records = new Map(), entries = new Map(), inputHashes = {}, datasets = {};
  // D002 explicitly depends on D001's registered exclusion identities.
  manifests.sort((a,b)=>a.id.localeCompare(b.id));
  for (const manifest of manifests) {
    const current = new Map();
    for (const [name, entry] of Object.entries(manifest.artifacts)) {
      if (entries.has(name) && JSON.stringify(entries.get(name)) !== JSON.stringify(entry)) fail('conflicting artifact registrations');
      const bytes = await localBytes(root, name), decoded = verifyArtifact(bytes, entry, name);
      current.set(name, entry.kind==='raw-pgn-zstd'?decoded:JSON.parse(decoded)); entries.set(name, entry); inputHashes[name] = entry.sha256;
    }
    const origins = verifyOrigins(manifest, registry, new Map([...records,...current]),inputHashes);
    datasets[manifest.id] = {...origins, provenanceStatus: manifest.provenance.status, limitations: manifest.provenance.limitations};
    for (const [name, data] of current) records.set(name, data);
  }
  const receipt = {schema: 'research-data-eligibility-v1', policyVersion: registry.policyVersion,
    policySha256: sha256(await localBytes(root, 'research/DATA_POLICY.md')),
    validatorSha256: sha256(await readFile(fileURLToPath(import.meta.url))),
    originValidatorSha256:sha256(await readFile(new URL('fresh-format.mjs',import.meta.url))),
    registrySha256: sha256(registryBytes), purpose, manifestHashes, sourceEvidence, inputHashes, datasets};
  return {
    receipt,
    async readJson(name) {
      safePath(name);
      if (!records.has(name)) fail('unregistered input: ' + name);
      if(entries.get(name).kind==='raw-pgn-zstd')fail('raw frame is not JSON');
      // Recheck at use, so replacing a file after preflight cannot change the input.
      return JSON.parse(verifyArtifact(await localBytes(root, name), entries.get(name), name));
    },
    async readFrame(name){
      safePath(name);if(entries.get(name)?.kind!=='raw-pgn-zstd')fail('unregistered raw frame');
      return verifyArtifact(await localBytes(root,name),entries.get(name),name);
    },
    gameOrigin(id) {
      for (const manifest of manifests) {
        const game = records.get(manifest.normalized).find(g => g.id === id);
        if (game) return {dataset: manifest.id, gameId: id, gameUrl: game.source, archiveUrl:
          records.get(manifest.sourceRecord).sources.find(s => s.month === game.sourceMonth).url,
          normalizedFile: manifest.normalized, sha256: inputHashes[manifest.normalized],
          sourceRecord: manifest.sourceRecord, sourceRecordSha256: inputHashes[manifest.sourceRecord],
          provenanceStatus: manifest.provenance.status, limitations: manifest.provenance.limitations,
          ...(manifest.originFormat==='lichess-prefix-v1'?{rawPGN:{...game.locator,compressedFrameSha256:inputHashes[game.locator.artifact],
            decodedFrameSha256:entries.get(game.locator.artifact).uncompressedSha256}}:{})};
      }
      fail('unregistered game: ' + id);
    },
  };
}

// Acquisition bootstrap: the exact approved export and publisher evidence must
// qualify before any new bytes are requested. It cannot admit unfinished data.
export async function openResearchSource(url,{purpose='collect',root=repo}={}){
  const bytes=await localBytes(root,registryPath),registry=JSON.parse(bytes);validateRegistry(registry,purpose);
  const source=registry.sources.find(s=>s.exports.includes(url));if(!source)fail('unregistered exact export');
  const evidence=await localBytes(root,source.evidence.path);if(sha256(evidence)!==source.evidence.sha256)fail('permission evidence hash differs');
  return{sourceId:source.id,url,receipt:{schema:'research-source-eligibility-v1',purpose,registrySha256:sha256(bytes),sourceId:source.id,
    license:source.license,termsUrl:source.termsUrl,verifiedOn:source.verifiedOn,evidenceSha256:sha256(evidence)}};
}
