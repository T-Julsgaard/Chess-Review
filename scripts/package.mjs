import { cp, mkdir, mkdtemp, readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { cmd } from 'web-ext';
import './verify-engines.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const artifactsDir = path.join(root, 'web-ext-artifacts');
const manifest = JSON.parse(await readFile(path.join(root, 'manifest.json'), 'utf8'));
const pkg = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
if (manifest.version !== pkg.version) throw new Error('Package and manifest versions differ');

// Explicit allowlist: development files, old ZIPs, and node_modules can never ship.
const files = ['analysis.html', 'analysis.js', 'analyze-flow.js', 'background.js',
  'browser-compat.js', 'chesscom.js', 'content.js', 'flags.js', 'gamecache.js',
  'lichess-content.js', 'lichess.js', 'popup.html', 'popup.js', 'styles.css',
  'LICENSE', 'ATTRIBUTIONS.md', 'PRIVACY.md', 'README.md', 'RELEASE.md'];
const directories = ['backgrounds', 'boards-img', 'data', 'engine', 'flags', 'icons', 'lib', 'pieces-img', 'sounds'];
async function size(dir) {
  let bytes = 0;
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    bytes += entry.isDirectory() ? await size(file) : (await stat(file)).size;
  }
  return bytes;
}

await mkdir(artifactsDir, { recursive: true });
const results = [];
for (const browser of ['chrome', 'firefox']) {
  // Fresh staging directories prevent stale or removed files from entering an update.
  const sourceDir = await mkdtemp(path.join(artifactsDir, `${browser}-${manifest.version}-`));
  for (const file of [...files, ...directories]) {
    await cp(path.join(root, file), path.join(sourceDir, file), { recursive: true });
  }
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
  await cmd.build({ sourceDir, artifactsDir, filename, overwriteDest: true });
  const zip = path.join(artifactsDir, filename);
  results.push({ browser, sourceDir, zip, unpackedBytes: await size(sourceDir), zipBytes: (await stat(zip)).size });
}
await writeFile(path.join(artifactsDir, 'release-sizes.json'), JSON.stringify(results, null, 2) + '\n');
console.log(JSON.stringify(results, null, 2));
