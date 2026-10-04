import { cp, mkdir, mkdtemp, readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { cmd } from 'web-ext';
import './verify-engines.mjs';
import {verifySource} from './verify-source.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
await verifySource(root);
const artifactsDir = path.join(root, 'web-ext-artifacts');
const manifest = JSON.parse(await readFile(path.join(root, 'manifest.json'), 'utf8'));
const pkg = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
if (manifest.version !== pkg.version) throw new Error('Package and manifest versions differ');

// Explicit allowlist: development files, old ZIPs, and node_modules can never ship.
const files = ['analysis.html', 'analysis.js', 'analyze-flow.js', 'background.js',
  'browser-compat.js', 'release-settings.js', 'chesscom.js', 'content.js', 'content-button.css', 'flags.js', 'gamecache.js',
  'lichess-content.js', 'lichess.js', 'move-grades.js', 'popup.html', 'popup.js', 'styles.css',
  'LICENSE', 'ATTRIBUTIONS.md', 'THIRD_PARTY_NOTICES.md', 'PRIVACY.md', 'README.md', 'RELEASE.md'];
const directories = ['backgrounds', 'data', 'engine', 'flags', 'fonts', 'icons', 'lib', 'pieces-img', 'sounds'];
// Explicitly retain only the two selectable GPLv2+ piece sets.
const pieceSets = ['cburnett', 'merida'];
async function copyInputs(from, to, entries) {
  for (const file of entries) {
    if (file === 'pieces-img') {
      await mkdir(path.join(to, file), { recursive: true });
      for (const set of pieceSets) {
        await cp(path.join(from, file, set), path.join(to, file, set), { recursive: true });
      }
    } else await cp(path.join(from, file), path.join(to, file), { recursive: true });
  }
}
async function size(dir) {
  let bytes = 0;
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    bytes += entry.isDirectory() ? await size(file) : (await stat(file)).size;
  }
  return bytes;
}

await mkdir(artifactsDir, { recursive: true });
// Each build is preserved independently; never replace an earlier package of the same version.
const releaseDir = await mkdtemp(path.join(artifactsDir, `release-${manifest.version}-`));
const snapshotDir = path.join(releaseDir, 'source');
await mkdir(snapshotDir);
const sourceFiles = [...files, 'manifest.json', 'package.json', 'package-lock.json',
  'marketing/STORE_LISTING2.md', 'CONTRIBUTING.md', 'SECURITY.md'];
await copyInputs(root, snapshotDir, [...sourceFiles, ...directories, 'docs', 'scripts', 'tests', 'tools']);
const sha256 = async file => createHash('sha256').update(await readFile(file)).digest('hex');
async function fileHashes(dir, base = dir) {
  const hashes = {};
  for (const entry of (await readdir(dir, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) Object.assign(hashes, await fileHashes(file, base));
    else hashes[path.relative(base, file).split(path.sep).join('/')] = await sha256(file);
  }
  return hashes;
}
let git = null;
try {
  const readGit = args => execFileSync('git', args, { cwd: root, encoding: 'utf8', windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  const status = readGit(['status', '--porcelain']);
  git = { head: readGit(['rev-parse', 'HEAD']), dirty: Boolean(status), status };
} catch { /* A downloaded source snapshot may not have a Git checkout. */ }
const sourceZip = path.join(releaseDir, `chess-review-${manifest.version}-source.zip`);
await cmd.build({ sourceDir: snapshotDir, artifactsDir: releaseDir, filename: path.basename(sourceZip), overwriteDest: false });
const results = [];
for (const browser of ['chrome', 'firefox']) {
  // Fresh staging directories prevent stale or removed files from entering an update.
  const sourceDir = await mkdtemp(path.join(releaseDir, `${browser}-${manifest.version}-`));
  await copyInputs(snapshotDir, sourceDir, [...files, ...directories]);
  const target = structuredClone(manifest);
  if (browser === 'chrome') {
    delete target.browser_specific_settings;
    delete target.background.scripts;
  } else {
    delete target.minimum_chrome_version;
    delete target.background.service_worker;
  }
  await writeFile(path.join(sourceDir, 'manifest.json'), JSON.stringify(target, null, 2) + '\n');
  const filename = `chess-review-${manifest.version}-${browser}.zip`;
  await cmd.build({ sourceDir, artifactsDir: releaseDir, filename, overwriteDest: false });
  const zip = path.join(releaseDir, filename);
  results.push({ browser, sourceDir, zip, sha256: await sha256(zip), unpackedBytes: await size(sourceDir), zipBytes: (await stat(zip)).size });
}
await writeFile(path.join(releaseDir, 'release-sizes.json'), JSON.stringify(results, null, 2) + '\n');
const record = {
  version: manifest.version, createdAt: new Date().toISOString(), git,
  nodeVersion: process.version,
  source: { zip: sourceZip, sha256: await sha256(sourceZip), files: await fileHashes(snapshotDir) },
  packages: results,
};
const recordPath = path.join(releaseDir, 'release-record.json');
await writeFile(recordPath, JSON.stringify(record, null, 2) + '\n');
// This pointer is disposable; all build records and packages remain in their release directories.
await writeFile(path.join(artifactsDir, 'latest-release.json'), JSON.stringify({ recordPath }, null, 2) + '\n');
console.log(JSON.stringify({ recordPath, sourceZip, packages: results }, null, 2));
