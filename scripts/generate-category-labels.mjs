// Rebuild offline PNG artwork with the same renderer used for custom names.
// Usage: node scripts/generate-category-labels.mjs (Chrome, or CHROME_PATH).
import { readFile, writeFile, mkdir, mkdtemp } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import http from 'node:http';
import path from 'node:path';
import { gradeSvg } from '../move-grades.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const names = { brilliant: 'Brilliant', great: 'Great', best: 'Best', excellent: 'Excellent',
  good: 'Good', book: 'Book', inacc: 'Inaccuracy', mistake: 'Mistake', miss: 'Miss', blunder: 'Blunder' };
const html = `<!doctype html><link rel="stylesheet" href="/styles.css"><pre id="artwork"></pre>
<script type="module">
import { CATEGORY_LABEL_FONT, categoryLabelPng } from '/lib/category-label.js';
import { MOVE_GRADE_CONFIG } from '/move-grades.js';
await document.fonts.load(CATEGORY_LABEL_FONT);
const images = Object.fromEntries(Object.entries(${JSON.stringify(names)}).map(([cls, name]) =>
  [cls, categoryLabelPng(document, name, MOVE_GRADE_CONFIG[cls].color)]));
document.getElementById('artwork').textContent = btoa(JSON.stringify(images));
</script>`;
const server = http.createServer(async (req, res) => {
  try {
    if (req.url === '/generate') { res.setHeader('Content-Type', 'text/html'); res.end(html); return; }
    const file = path.resolve(root, '.' + new URL(req.url, 'http://localhost').pathname);
    if (!file.startsWith(root)) { res.writeHead(403); res.end(); return; }
    const types = { '.js': 'text/javascript', '.css': 'text/css', '.ttf': 'font/ttf' };
    res.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream');
    res.end(await readFile(file));
  } catch { res.writeHead(404); res.end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
await mkdir(path.join(root, 'scratch'), { recursive: true });
const profile = await mkdtemp(path.join(root, 'scratch', 'label-artwork-'));
try {
  const chrome = process.env.CHROME_PATH || (process.platform === 'win32'
    ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' : 'google-chrome');
  const { stdout } = await promisify(execFile)(chrome, ['--headless=new', '--no-first-run',
    '--no-default-browser-check', `--user-data-dir=${profile}`, '--dump-dom',
    '--virtual-time-budget=5000', `http://127.0.0.1:${server.address().port}/generate`],
  { windowsHide: true, timeout: 30000, maxBuffer: 4 * 1024 * 1024 });
  const encoded = stdout.match(/<pre id="artwork">([A-Za-z0-9+/=]+)<\/pre>/)?.[1];
  if (!encoded) throw new Error('Chrome did not render the category artwork');
  const images = JSON.parse(Buffer.from(encoded, 'base64').toString());
  await mkdir(path.join(root, 'icons', 'labels'), { recursive: true });
  for (const [cls, data] of Object.entries(images)) {
    await writeFile(path.join(root, 'icons', 'labels', cls + '.png'), Buffer.from(data.split(',')[1], 'base64'));
    const file = cls === 'inacc' ? 'inaccuracy' : cls;
    await writeFile(path.join(root, 'icons', file + '.svg'), gradeSvg(cls, null, names[cls], true) + '\n');
  }
  console.log(`Generated ${Object.keys(images).length} transparent PNG labels and badge references.`);
} finally { server.close(); }
