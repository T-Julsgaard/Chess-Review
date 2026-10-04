// Headless Chrome with an isolated profile and a throwaway copy of the extension.
// Branded Chrome ignores --load-extension, so the copy is loaded over the DevTools
// protocol, as scripts/browser-smoke.mjs does.
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

export const REPO = fileURLToPath(new URL('../../../', import.meta.url));
export const CHROME = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

// Mirrors the allowlist in scripts/package.mjs, so captures show what the store build ships.
const FILES = ['analysis.html', 'analysis.js', 'analyze-flow.js', 'background.js',
  'browser-compat.js', 'chesscom.js', 'content.js', 'content-button.css', 'flags.js', 'gamecache.js',
  'lichess-content.js', 'lichess.js', 'move-grades.js', 'popup.html', 'popup.js', 'styles.css',
  'LICENSE', 'ATTRIBUTIONS.md', 'THIRD_PARTY_NOTICES.md', 'PRIVACY.md', 'README.md', 'RELEASE.md', 'manifest.json'];
const DIRS = ['backgrounds', 'data', 'engine', 'flags', 'fonts', 'icons', 'lib', 'sounds',
  'pieces-img/cburnett', 'pieces-img/merida'];

export async function copyExtension(dest) {
  for (const entry of [...FILES, ...DIRS]) {
    await fs.cp(path.join(REPO, entry), path.join(dest, entry), { recursive: true });
  }
  return dest;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Starts Chrome detached so several short scripts can drive the same session.
export async function launch({ width = 1920, height = 1080, scale = 2, workDir }) {
  const profile = path.join(workDir, 'profile');
  await fs.mkdir(profile, { recursive: true });
  const proc = spawn(CHROME, [
    '--headless=new', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=0',
    '--enable-unsafe-extension-debugging', `--user-data-dir=${profile}`,
    `--window-size=${width},${height}`, `--force-device-scale-factor=${scale}`,
    '--hide-scrollbars', '--mute-audio', '--force-color-profile=srgb', 'about:blank',
  ], { detached: true, stdio: 'ignore', windowsHide: true });
  proc.unref();
  let port;
  for (let i = 0; i < 150 && !port; i++) {
    try { port = (await fs.readFile(path.join(profile, 'DevToolsActivePort'), 'utf8')).split(/\r?\n/)[0]; }
    catch { await sleep(100); }
  }
  if (!port) throw Error('Chrome did not expose a debugging port');
  return { pid: proc.pid, port: Number(port) };
}

export async function connect(port) {
  return chromium.connectOverCDP(`http://127.0.0.1:${port}`);
}

export async function loadExtension(browser, dir) {
  const cdp = await browser.newBrowserCDPSession();
  const { id } = await cdp.send('Extensions.loadUnpacked', { path: dir });
  await cdp.detach();
  return id;
}

export async function startSession({ workDir, ...opts }) {
  await fs.mkdir(workDir, { recursive: true });
  const extDir = await copyExtension(await fs.mkdtemp(path.join(workDir, 'ext-')));
  const { pid, port } = await launch({ workDir, ...opts });
  const browser = await connect(port);
  const extId = await loadExtension(browser, extDir);
  return { browser, session: { pid, port, extId, extDir, workDir } };
}

export async function closeSession(browser) {
  const cdp = await browser.newBrowserCDPSession();
  await cdp.send('Browser.close').catch(() => {});
}

export const tmpWorkDir = () => fs.mkdtemp(path.join(os.tmpdir(), 'chess-review-capture-'));
