import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import {spawn, execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {openResearchData} from '../research/data-policy.mjs';
import {replayPublic} from '../tools/calibration/reproduce-public.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const args = process.argv.slice(2), pilot = args.includes('--pilot');
const outIndex = args.indexOf('--out');
if (outIndex < 0 || !args[outIndex + 1]) throw Error('Usage: node scripts/benchmark-engine-depths.mjs --out DIRECTORY [--pilot]');
const out = path.resolve(args[outIndex + 1]);
await fs.mkdir(out, {recursive: true});
try { await fs.access(path.join(out, 'manifest.json')); throw Error('Use a new output directory; evidence is immutable'); }
catch (error) { if (error.code !== 'ENOENT') throw error; }
const data = await openResearchData(['D001'], {purpose: 'inspect', root});
const dataset = await data.readJson('tools/calibration/public/dataset.json.gz');
// Same three previously exposed training games as the initial feasibility check.
const games = ['oneIHkm8', 'aQ903hcx', 'nhuWmN0z'].map(id => {
  const game = dataset.find(game => game.id === id && game.split === 'train');
  if (!game) throw Error('Missing approved training game ' + id);
  return game;
});
// Reconstruct the published coefficients from admitted frozen evidence. The
// deployed calibration JSON is not itself an artifact in the D001 registry.
const published = replayPublic(await data.readJson('tools/calibration/public/sf18-evidence.json.gz'),
  await data.readJson('tools/calibration/public/manifest.json'));
const calibration = {quality: {outcome: published.outcome, choice: published.choice}};
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const inputs = ['scripts/benchmark-engine-depths.mjs', 'scripts/bench/engine-depths-browser.mjs',
  'engine/uci.js', 'engine/progress.js', 'lib/chess.js', 'lib/public-scoring.js', 'browser-compat.js',
  'engine/stockfish-nnue.js', 'engine/stockfish-nnue.wasm',
  'engine/stockfish-19-lite-single.js', 'engine/stockfish-19-lite-single.wasm'];
const inputHashes = Object.fromEntries(await Promise.all(inputs.map(async name => [name, hash(await fs.readFile(path.join(root, name)))])));
const manifest = {schema: 'engine-depth-benchmark-v1', startedAt: new Date().toISOString(), pilot,
  revision: execFileSync('git', ['rev-parse', 'HEAD'], {cwd: root, encoding: 'utf8'}).trim(),
  cpu: os.cpus()[0].model, logicalCpus: os.cpus().length, platform: os.platform(), runtime: process.version,
  settings: {Hash: 16, skill: 20, multiPV: 1, workers: 1, depths: [6, 8, 16], repeats: {6: 3, 8: 3, 16: 1}},
  qualityModel: calibration.quality,
  notes: ['True depth-limited best/played searches at each original root with complete mainline history.',
    'SF19 depth-based accuracy uses its display formula experimentally; production SF19 scoring instead fixes 20000 nodes and Hash32.',
    'Fresh browser worker for each game/run. Startup included; fetching site games and review UI excluded.',
    'Cold mode adds explicit Clear Hash. Historical retained keys omit that extra command; the wrapper still sends ucinewgame and resets the cache.',
    'Small previously exposed convenience sample, not accuracy-model validation. Depth16 is a reference, not ground truth.'],
  games: games.map(game => ({id: game.id, source: game.source, band: game.band, players: game.players,
    plies: game.moves.length, movesSha256: hash(JSON.stringify(game.moves)), role: game.split})), inputHashes, receipt: data.receipt};
await fs.writeFile(path.join(out, 'manifest.json'), JSON.stringify(manifest, null, 2));
const completed = [], files = new Set(inputs);
let server, chrome, ws;
try {
  server = http.createServer(async (request, response) => {
    try {
      if (request.url === '/record' && request.method === 'POST') {
        let body = ''; for await (const chunk of request) { body += chunk; if (body.length > 2000000) throw Error('Oversized record'); }
        const record = JSON.parse(body);
        if (record.type === 'result') {
          const {observations, ...summary} = record;
          if (!/^[a-z0-9-]+$/i.test(record.key) || completed.some(row => row.key === record.key)) throw Error('Invalid/duplicate result');
          await fs.writeFile(path.join(out, record.key + '.json.gz'), gzipSync(JSON.stringify(record)));
          completed.push(summary);
          await fs.writeFile(path.join(out, 'partial.json'), JSON.stringify(completed, null, 2));
          console.log(JSON.stringify(summary));
        } else if (record.type === 'begin' || record.type === 'progress') {
          await fs.appendFile(path.join(out, 'progress.jsonl'), JSON.stringify(record) + '\n');
          console.log(JSON.stringify(record));
        } else throw Error('Unknown record');
        response.end('ok'); return;
      }
      if (request.url === '/') {
        response.setHeader('Content-Type', 'text/html');
        response.end('<!doctype html><title>Engine depth benchmark</title><script type="module" src="/scripts/bench/engine-depths-browser.mjs"></script>'); return;
      }
      const name = request.url.slice(1);
      if (!files.has(name)) { response.writeHead(404); response.end(); return; }
      response.setHeader('Content-Type', name.endsWith('.wasm') ? 'application/wasm' : name.endsWith('.json') ? 'application/json' : 'text/javascript');
      response.end(await fs.readFile(path.join(root, name)));
    } catch (error) { response.writeHead(500); response.end(error.message); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const profile = await fs.mkdtemp(path.join(os.tmpdir(), 'chess-depth-profile-'));
  chrome = spawn(process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
    '--headless=new', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=0',
    '--disable-background-timer-throttling', '--user-data-dir=' + profile, 'about:blank',
  ], {windowsHide: true, stdio: 'ignore'});
  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
  let info;
  for (let i = 0; i < 100; i++) { try { info = await fs.readFile(path.join(profile, 'DevToolsActivePort'), 'utf8'); break; } catch { await sleep(100); } }
  if (!info) throw Error('Chrome debugging port unavailable');
  const [port, route] = info.trim().split(/\r?\n/);
  ws = new WebSocket('ws://127.0.0.1:' + port + route);
  await new Promise((resolve, reject) => { const timer = setTimeout(() => reject(Error('CDP connection timeout')), 10000); ws.onopen = () => { clearTimeout(timer); resolve(); }; ws.onerror = reject; });
  let seq = 0; const pending = new Map();
  ws.onmessage = event => { const message = JSON.parse(event.data), entry = pending.get(message.id); if (entry) { pending.delete(message.id); clearTimeout(entry.timer); message.error ? entry.reject(Error(JSON.stringify(message.error))) : entry.resolve(message.result); } };
  const call = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
    const id = ++seq, timer = setTimeout(() => { pending.delete(id); reject(Error(method + ' timeout')); }, method === 'Runtime.evaluate' && params.awaitPromise ? 3600000 : 20000);
    pending.set(id, {resolve, reject, timer}); ws.send(JSON.stringify({id, method, params, sessionId}));
  });
  const {targetId} = await call('Target.createTarget', {url: 'http://127.0.0.1:' + server.address().port});
  const {sessionId} = await call('Target.attachToTarget', {targetId, flatten: true});
  let ready = false;
  for (let i = 0; i < 100; i++) {
    const state = await call('Runtime.evaluate', {expression: 'typeof runBenchmark', returnByValue: true}, sessionId);
    if (state.result.value === 'function') { ready = true; break; } await sleep(100);
  }
  if (!ready) throw Error('Benchmark module failed to load');
  const result = await call('Runtime.evaluate', {expression: 'runBenchmark(' + JSON.stringify({games, calibration, pilot}) + ')', awaitPromise: true, returnByValue: true}, sessionId);
  if (result.exceptionDetails) throw Error(JSON.stringify(result.exceptionDetails));
  const report = {...result.result.value, finishedAt: new Date().toISOString()};
  if (report.results.length !== (pilot ? 2 : 60) || completed.length !== report.results.length) throw Error('Incomplete run matrix');
  await fs.writeFile(path.join(out, 'results.json'), JSON.stringify(report, null, 2));
  console.log('Completed benchmark: ' + out);
} finally { ws?.close(); chrome?.kill(); server?.close(); }
