import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn, execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';

// Derive audition candidates from the bundled, licensed Lichess recordings.
// FFmpeg supplies MP3 decoding; all editing and PCM WAV encoding happen here.
// Requires ffmpeg on PATH (or FFMPEG_PATH); --verify-page also needs Chrome.
// node scripts/generate-move-event-sounds.mjs [--verify-page]
const root = fileURLToPath(new URL('../', import.meta.url));
const rate = 48000;
const verifyPage = process.argv.includes('--verify-page');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const scratch = path.join(root, 'scratch');
await fs.mkdir(scratch, {recursive: true});
const profile = verifyPage ? await fs.mkdtemp(path.join(scratch, 'move-sound-profile-')) : null;
const chrome = verifyPage ? spawn(process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
  '--headless=new', '--no-first-run', '--no-default-browser-check',
  '--autoplay-policy=no-user-gesture-required',
  '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank',
], {windowsHide: true, stdio: 'ignore'}) : null;
let launchError;
chrome?.on('error', error => { launchError = error; });
let ws;
const pending = new Map();
try {
  let call, evaluate, sessionId;
  if (chrome) {
    let info;
    for (let i = 0; i < 100; i++) {
      if (launchError) throw launchError;
      try { info = await fs.readFile(path.join(profile, 'DevToolsActivePort'), 'utf8'); break; }
      catch { await sleep(100); }
    }
    if (!info) throw Error('Chrome did not start. Set CHROME_PATH to a Chromium executable.');
    const [port, route] = info.trim().split(/\r?\n/);
    ws = new WebSocket(`ws://127.0.0.1:${port}${route}`);
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(Error('Chrome connection timed out')), 10000);
      ws.onopen = () => { clearTimeout(timer); resolve(); };
      ws.onerror = () => { clearTimeout(timer); reject(Error('Chrome connection failed')); };
    });
    let seq = 0;
    ws.onmessage = event => {
      const message = JSON.parse(event.data), request = pending.get(message.id);
      if (!request) return;
      pending.delete(message.id);
      clearTimeout(request.timer);
      if (message.error) request.reject(Error(JSON.stringify(message.error)));
      else request.resolve(message.result);
    };
    call = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
      const id = ++seq;
      const timer = setTimeout(() => { pending.delete(id); reject(Error(`${method} timed out`)); }, 20000);
      pending.set(id, {resolve, reject, timer});
      ws.send(JSON.stringify({id, method, params, sessionId}));
    });
    const {targetId} = await call('Target.createTarget', {url: 'about:blank'});
    ({sessionId} = await call('Target.attachToTarget', {targetId, flatten: true}));
    evaluate = async expression => {
      const result = await call('Runtime.evaluate', {expression, awaitPromise: true, returnByValue: true}, sessionId);
      if (result.exceptionDetails) throw Error(JSON.stringify(result.exceptionDetails));
      return result.result.value;
    };
  }
  const decode = async name => {
    console.log(`Decoding ${name}...`);
    const bytes = await fs.readFile(path.join(root, 'sounds', name));
    const pcm = execFileSync(process.env.FFMPEG_PATH || 'ffmpeg', [
      '-v', 'error', '-i', path.join(root, 'sounds', name),
      '-f', 'f32le', '-ac', '1', '-ar', String(rate), 'pipe:1',
    ], {windowsHide: true});
    const samples = new Float64Array(pcm.length / 4);
    for (let i = 0; i < samples.length; i++) samples[i] = pcm.readFloatLE(i * 4);
    const trimmed = trim(samples);
    return {samples: trimmed, file: `sounds/${name}`, sha256: hash(bytes),
      decodedChannels: 1, decodedRate: rate, ...stats(trimmed)};
  };
  const sources = {move: await decode('move-self.mp3'), capture: await decode('capture.mp3')};
  const referenceRms = windowRms(sources.move.samples);
  console.log('Decoded references:', JSON.stringify(Object.fromEntries(Object.entries(sources)
    .map(([key, {samples: _samples, ...details}]) => [key, details])), null, 2));

  // Three different gestures per event, five deliberately varied takes per gesture.
  // Parameters change source, spacing, attack/body balance and modest playback rate.
  const definitions = {
    check: [
      ['01-firm-tap', 'Single accents', 'A firm move knock with a little capture weight.', [hit('move', 0, 1.04), hit('capture', .004, 1.02, .19)], .2],
      ['02-bright-tap', 'Single accents', 'A shorter, slightly brighter knock.', [hit('move', 0, 1.10, 1, {bright: .22}), hit('capture', .003, 1.07, .14)], .4],
      ['03-deep-tap', 'Single accents', 'A lower placement with a warmer board body.', [hit('move', 0, .94, .9, {body: .28}), hit('capture', .006, .98, .28)], -.2],
      ['04-dry-snap', 'Single accents', 'A compact accent with a shortened wooden tail.', [hit('move', 0, 1.07, 1, {decay: 4, bright: .16}), hit('capture', .002, 1.08, .26, {decay: 7})], .5],
      ['05-weighted-snap', 'Single accents', 'A capture-led accent, keeping the familiar move click.', [hit('capture', 0, 1.06, .70, {decay: 3}), hit('move', .009, 1.03, .72)], 0],
      ['06-tight-double', 'Quick doubles', 'A light knock followed 48 ms later by a firmer one.', [hit('move', 0, 1.07, .42), hit('move', .048, 1.03, 1)], .2],
      ['07-rising-double', 'Quick doubles', 'A low lead tap followed by a brighter warning accent.', [hit('move', 0, .95, .48), hit('move', .065, 1.10, 1, {bright: .12})], .4],
      ['08-heavy-answer', 'Quick doubles', 'A soft move click answered by capture weight.', [hit('move', 0, 1.03, .5), hit('capture', .057, 1.06, .78), hit('move', .060, 1.07, .48)], 0],
      ['09-clipped-double', 'Quick doubles', 'Two clipped knocks with an especially quick response.', [hit('move', 0, 1.10, .55, {decay: 8}), hit('move', .037, 1.05, 1, {decay: 4})], .5],
      ['10-wide-warning', 'Quick doubles', 'A more separated pair, ending on a warm firm tap.', [hit('move', 0, 1.08, .36), hit('move', .087, .97, .95, {body: .2}), hit('capture', .089, 1.02, .18)], -.2],
      ['11-snap-and-tick', 'Trailing ticks', 'A main knock with a small dry tick 92 ms later.', [hit('move', 0, 1.04, 1), hit('move', .092, 1.12, .26, {decay: 18, bright: .3})], .2],
      ['12-body-and-tick', 'Trailing ticks', 'A fuller board knock with a quiet high follow-through.', [hit('capture', 0, 1.02, .65), hit('move', .002, 1.02, .75), hit('move', .110, 1.10, .25, {decay: 15})], -.1],
      ['13-close-tick', 'Trailing ticks', 'A crisp hit with a very close, light after-click.', [hit('move', 0, 1.08, 1, {bright: .18}), hit('move', .068, 1.12, .31, {decay: 16})], .4],
      ['14-low-knock-tick', 'Trailing ticks', 'A low rounded knock with a brighter, softer release.', [hit('move', 0, .94, 1, {body: .3}), hit('capture', .004, .98, .15), hit('move', .126, 1.08, .22, {decay: 14})], -.3],
      ['15-capture-tick', 'Trailing ticks', 'A dry capture-textured accent and a short closing tick.', [hit('capture', 0, 1.09, .80, {decay: 5}), hit('move', .002, 1.06, .55), hit('move', .100, 1.13, .3, {decay: 20, bright: .2})], .2],
    ],
    castle: [
      ['01-classic-pair', 'Two placements', 'Two familiar move knocks, 100 ms apart.', [hit('move', 0, .98, .85), hit('move', .100, 1.04, 1)], -.4],
      ['02-quick-pair', 'Two placements', 'A brisk king-and-rook placement, 76 ms apart.', [hit('move', 0, 1.03, .9), hit('move', .076, 1.08, 1)], -.2],
      ['03-weighted-rook', 'Two placements', 'A light king placement followed by a weightier rook.', [hit('move', 0, 1.06, .75), hit('move', .114, .96, 1, {body: .22}), hit('capture', .118, 1.01, .15)], -.5],
      ['04-soft-pair', 'Two placements', 'A gentler, warmer pair with slightly more space.', [hit('move', 0, .97, .85, {body: .18}), hit('move', .133, 1.01, .9, {body: .15})], -1],
      ['05-long-step', 'Two placements', 'A distinctly separated pair with a low final placement.', [hit('move', 0, 1.07, .78), hit('move', .161, .94, 1), hit('capture', .164, .98, .16)], -.5],
      ['06-close-lock', 'Joined knocks', 'A tightly joined two-piece clack, 43 ms apart.', [hit('move', 0, .98, .85), hit('move', .043, 1.05, 1)], -.3],
      ['07-capture-lock', 'Joined knocks', 'A move click settling into a fuller capture-textured knock.', [hit('move', 0, 1.06, .72), hit('capture', .057, 1.04, .6), hit('move', .060, 1.01, .63)], -.4],
      ['08-low-lock', 'Joined knocks', 'Two close, lower knocks with a little board resonance.', [hit('move', 0, .93, .9, {body: .25}), hit('move', .054, .98, 1, {body: .15})], -.6],
      ['09-dry-lock', 'Joined knocks', 'A compact dry pair with shortened tails.', [hit('move', 0, 1.08, .85, {decay: 6}), hit('move', .036, 1.04, 1, {decay: 4})], -.2],
      ['10-reverse-weight', 'Joined knocks', 'A weightier first placement and a light bright answer.', [hit('capture', 0, 1.06, .4), hit('move', 0, .98, .85), hit('move', .068, 1.10, .72, {bright: .2})], -.3],
      ['11-settle-pair', 'Board settles', 'Two placements with a quiet, low board settling underneath.', [hit('move', 0, 1.02, .85), hit('move', .106, .98, 1), hit('capture', .077, .96, .18, {body: .6, cutoff: 1500, soften: .015})], -.5],
      ['12-brushed-pair', 'Board settles', 'A faint capture-tail brush beneath two clear move knocks.', [hit('move', 0, 1.05, .8), hit('capture', .045, 1.02, .19, {offset: .023, cutoff: 3600, soften: .012}), hit('move', .132, 1.02, 1)], -.5],
      ['13-compact-settle', 'Board settles', 'A brisk pair with a small warm resonance on the rook.', [hit('move', 0, 1.07, .85), hit('move', .085, 1.03, 1), hit('capture', .090, 1.06, .24, {cutoff: 2600, soften: .008})], -.4],
      ['14-deep-settle', 'Board settles', 'A lower, roomier pair with a subdued board tail.', [hit('move', 0, .96, .85, {body: .12}), hit('move', .148, .94, 1, {body: .16}), hit('capture', .132, .94, .17, {offset: .012, cutoff: 1800, soften: .016})], -.7],
      ['15-firm-settle', 'Board settles', 'A crisp first placement and a full, decisive final clack.', [hit('move', 0, 1.08, .78, {decay: 3}), hit('move', .118, .99, .9), hit('capture', .121, 1.04, .35, {decay: 3})], -.3],
    ],
  };
  const manifest = {sampleRate: rate, channels: 1, bits: 16,
    method: 'Edits of bundled Lichess move/capture samples; no oscillators, new recordings or reverb.',
    sources: Object.fromEntries(Object.entries(sources).map(([key, {samples: _samples, ...details}]) => [key, details])),
    candidates: []};
  for (const [event, cues] of Object.entries(definitions)) {
    await fs.mkdir(path.join(root, 'sounds', event), {recursive: true});
    for (const [name, family, description, layers, levelDb] of cues) {
      const rendered = layers.map(layer => ({...layer, audio: processLayer(sources[layer.source].samples, layer)}));
      const length = Math.max(...rendered.map(layer => Math.round(layer.at * rate) + layer.audio.length));
      const mix = new Float64Array(length + Math.round(.012 * rate));
      for (const layer of rendered) {
        const start = Math.round(layer.at * rate);
        for (let i = 0; i < layer.audio.length; i++) mix[start + i] += layer.audio[i] * layer.gain;
      }
      const audio = trim(mix);
      const peak = stats(audio).peak;
      const gain = Math.min(referenceRms * 10 ** (levelDb / 20) / windowRms(audio), .88 / peak);
      for (let i = 0; i < audio.length; i++) audio[i] *= gain;
      const bytes = wav(audio);
      const file = `sounds/${event}/${name}.wav`;
      await fs.writeFile(path.join(root, file), bytes);
      const details = stats(audio);
      if (details.peak > .881 || details.duration > .65 || details.duration < .07 || details.rms < .005) {
        throw Error(`Invalid audio levels/duration for ${file}: ${JSON.stringify(details)}`);
      }
      manifest.candidates.push({event, name, family, description, file, ...details,
        max50msRms: round(windowRms(audio)), sha256: hash(bytes), layers, levelDb});
    }
  }
  if (new Set(manifest.candidates.map(cue => cue.sha256)).size !== 30) throw Error('Duplicate candidate audio');
  await fs.writeFile(path.join(root, 'sounds/move-event-candidates.json'), JSON.stringify(manifest, null, 2) + '\n');
  await fs.writeFile(path.join(root, 'docs/move-event-sounds.html'), auditionPage(manifest));
  console.log(`Generated ${manifest.candidates.length} unique candidates. No clipping; all under 650 ms.`);

  if (verifyPage) {
    const {pathToFileURL} = await import('node:url');
    await call('Emulation.setDeviceMetricsOverride', {width: 1200, height: 1100, deviceScaleFactor: 1, mobile: false}, sessionId);
    await call('Page.navigate', {url: pathToFileURL(path.join(root, 'docs/move-event-sounds.html')).href}, sessionId);
    for (let i = 0; i < 100; i++) {
      if (await evaluate('document.querySelectorAll("audio").length === 32')) break;
      await sleep(50);
    }
    const report = await evaluate(`(async () => {
      const audios = [...document.querySelectorAll('audio')];
      if (audios.length !== 32) throw Error('Expected 30 candidates and 2 references');
      for (const audio of audios) {
        audio.preload = 'auto';
        await new Promise((resolve, reject) => {
          const timer = setTimeout(() => reject(Error('Audio load timed out: ' + audio.src)), 5000);
          audio.onloadedmetadata = () => { clearTimeout(timer); resolve(); };
          audio.onerror = () => { clearTimeout(timer); reject(Error('Audio failed to load: ' + audio.src)); };
          audio.load();
        });
        if (!Number.isFinite(audio.duration) || audio.duration <= 0) throw Error('Invalid duration');
      }
      return {audioFilesLoaded: audios.length, rows: document.querySelectorAll('article').length,
        horizontalOverflow: document.documentElement.scrollWidth > innerWidth};
    })()`);
    if (report.horizontalOverflow) throw Error('Audition page overflows horizontally');
    console.log('Browser audition check:', JSON.stringify(report));
    const playback = await evaluate(`(async () => {
      const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
      document.querySelector('[data-play="check"]').click();
      await wait(35);
      const started = [...document.querySelectorAll('audio')].some(audio => !audio.paused);
      document.querySelector('#stop').click();
      await wait(100);
      const stopped = [...document.querySelectorAll('audio')].every(audio => audio.paused);
      if (!started || !stopped || document.querySelector('.status').textContent !== 'Playback stopped.') {
        throw Error('Group playback / stop failed');
      }
      return {groupPlayback: started, stopPlayback: stopped};
    })()`);
    console.log('Playback check:', JSON.stringify(playback));
    const {data} = await call('Page.captureScreenshot', {format: 'png', captureBeyondViewport: false}, sessionId);
    await fs.writeFile(path.join(scratch, 'move-event-sounds-preview.png'), Buffer.from(data, 'base64'));
    await call('Emulation.setDeviceMetricsOverride', {width: 390, height: 844, deviceScaleFactor: 1, mobile: true}, sessionId);
    if (await evaluate('document.documentElement.scrollWidth > innerWidth')) throw Error('Mobile page overflows horizontally');
    console.log('Mobile layout: no horizontal overflow at 390 px.');
  }
  await call?.('Browser.close');
} finally {
  for (const request of pending.values()) { clearTimeout(request.timer); request.reject(Error('Browser closed')); }
  pending.clear();
  ws?.close();
  chrome?.kill();
}

function hit(source, at, speed, gain = 1, options = {}) { return {source, at, speed, gain, ...options}; }
function hash(bytes) { return createHash('sha256').update(bytes).digest('hex'); }
function round(value) { return Math.round(value * 1e6) / 1e6; }
function stats(audio) {
  let energy = 0, peak = 0;
  for (const sample of audio) { energy += sample * sample; peak = Math.max(peak, Math.abs(sample)); }
  return {duration: round(audio.length / rate), peak: round(peak), rms: round(Math.sqrt(energy / audio.length))};
}
function windowRms(audio) {
  const window = Math.min(audio.length, Math.round(.05 * rate));
  let sum = 0, maximum = 0;
  for (let i = 0; i < audio.length; i++) {
    sum += audio[i] ** 2;
    if (i >= window) sum -= audio[i - window] ** 2;
    maximum = Math.max(maximum, sum);
  }
  return Math.sqrt(maximum / window);
}
function trim(audio) {
  const threshold = stats(audio).peak * .002;
  let first = 0, last = audio.length - 1;
  while (first < last && Math.abs(audio[first]) < threshold) first++;
  while (last > first && Math.abs(audio[last]) < threshold) last--;
  const result = audio.slice(Math.max(0, first - 48), Math.min(audio.length, last + 481));
  for (let i = 0; i < result.length; i++) {
    result[i] *= Math.min(1, i / 24, (result.length - 1 - i) / 240);
  }
  return result;
}
function processLayer(source, options) {
  const offset = (options.offset || 0) * rate;
  const audio = new Float64Array(Math.ceil((source.length - offset) / options.speed));
  let low = 0, body = 0, dc = 0;
  const lowAlpha = 1 - Math.exp(-2 * Math.PI * (options.cutoff || 9500) / rate);
  const bodyAlpha = 1 - Math.exp(-2 * Math.PI * 650 / rate);
  const dcAlpha = 1 - Math.exp(-2 * Math.PI * 45 / rate);
  for (let i = 0; i < audio.length; i++) {
    const position = offset + i * options.speed, base = Math.floor(position), fraction = position - base;
    const value = (source[base] || 0) * (1 - fraction) + (source[base + 1] || 0) * fraction;
    low += lowAlpha * (value - low);
    body += bodyAlpha * (low - body);
    let sample = low + (options.body || 0) * body + (options.bright || 0) * (low - body);
    dc += dcAlpha * (sample - dc);
    sample = (sample - dc) * Math.exp(-(options.decay || 0) * i / rate);
    audio[i] = sample * Math.min(1, i / (rate * (options.soften || .0005)), (audio.length - 1 - i) / 240);
  }
  return audio;
}
function wav(audio) {
  const buffer = Buffer.alloc(44 + audio.length * 2);
  buffer.write('RIFF'); buffer.writeUInt32LE(buffer.length - 8, 4); buffer.write('WAVEfmt ', 8);
  buffer.writeUInt32LE(16, 16); buffer.writeUInt16LE(1, 20); buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(rate, 24); buffer.writeUInt32LE(rate * 2, 28);
  buffer.writeUInt16LE(2, 32); buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36); buffer.writeUInt32LE(audio.length * 2, 40);
  for (let i = 0; i < audio.length; i++) buffer.writeInt16LE(Math.round(audio[i] * 32767), 44 + i * 2);
  return buffer;
}
function auditionPage(manifest) {
  const title = cue => cue.name.slice(3).replaceAll('-', ' ').replace(/^./, letter => letter.toUpperCase());
  const groups = ['Single accents / Two placements', 'Quick doubles / Joined knocks', 'Trailing ticks / Board settles'];
  const checks = manifest.candidates.filter(cue => cue.event === 'check');
  const castles = manifest.candidates.filter(cue => cue.event === 'castle');
  const player = cue => `<div><h3>${cue.name.slice(0, 2)} · ${title(cue)} <small>${Math.round(cue.duration * 1000)} ms</small></h3><p>${cue.description}</p><audio controls preload="none" aria-label="${cue.event} ${cue.name.slice(0, 2)} ${title(cue)}" src="../${cue.file}"></audio></div>`;
  return `<!doctype html>
<html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Check & castling · 30 sound candidates</title>
<style>
  :root{color-scheme:dark;font-family:system-ui,sans-serif;background:#151916;color:#f1f4ee}
  *{box-sizing:border-box}body{max-width:1060px;margin:44px auto;padding:0 24px 60px}
  .eyebrow{color:#acd083;letter-spacing:.13em;font-size:12px;font-weight:750;text-transform:uppercase}
  h1{font-size:clamp(30px,5vw,46px);letter-spacing:-.035em;margin:12px 0}h2{font-size:23px;margin:0 0 12px}h3{font-size:16px;margin:0 0 7px}
  p{color:#b9c4b6;line-height:1.6;margin:8px 0 16px}header>p{max-width:790px}.references,article,.columns{display:grid;grid-template-columns:1fr 1fr;gap:26px}
  .references{padding:22px;border:1px solid #44513e;background:#232c20;border-radius:16px;margin:26px 0 18px}
  audio{width:100%;height:36px}button,a.download{font:inherit;color:#ecf5e6;background:#2b3826;border:1px solid #526349;border-radius:8px;padding:8px 12px;cursor:pointer;text-decoration:none}
  button:hover{background:#3b4d33}nav{display:flex;gap:10px;flex-wrap:wrap;margin:18px 0 30px}nav a{color:#bddc9e;font-size:14px}
  section{margin-top:38px;scroll-margin-top:20px}.sub{font-size:14px;margin-top:0}.columns{padding:0 20px 8px;color:#a7c58c;font-size:14px;font-weight:700}
  article{padding:22px 20px;margin:12px 0;background:#20261f;border:1px solid #374232;border-radius:14px}article p{font-size:13px;min-height:42px;margin-bottom:12px}small{color:#91a18b;font-weight:400;font-size:12px;white-space:nowrap}footer{margin-top:36px;font-size:13px;color:#91a18b}
  .actions{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0 18px}.status{font-size:13px;color:#bddc9e;min-height:21px}
  @media(max-width:650px){body{padding:0 16px;margin-top:28px}.references,article{grid-template-columns:1fr;gap:22px}.columns{display:none}article p{min-height:0}article>div+div{border-top:1px solid #374232;padding-top:20px}h1{font-size:32px}}
</style>
<main><header><div class="eyebrow">Chess Review · Sound workshop</div><h1>Same board. New moves.</h1>
<p>15 check sounds and 15 castling sounds made from our existing Lichess move and capture recordings. Three approaches, five variations each. Keep your volume fixed and compare with the originals.</p>
<div class="references"><div><h3>Original · Move</h3><audio controls preload="none" aria-label="Original move" src="../sounds/move-self.mp3"></audio></div><div><h3>Original · Capture</h3><audio controls preload="none" aria-label="Original capture" src="../sounds/capture.mp3"></audio></div></div>
<nav><a href="#group-1">01–05 · Direct</a><a href="#group-2">06–10 · Rhythm</a><a href="#group-3">11–15 · Detail</a><button id="stop" type="button">Stop playback</button></nav>
<div class="status" role="status" aria-live="polite">Choose a sound, or play a group in sequence.</div></header>
${groups.map((group, index) => `<section id="group-${index + 1}"><h2>${String(index * 5 + 1).padStart(2, '0')}–${String(index * 5 + 5).padStart(2, '0')} · ${group}</h2>
<p class="sub">${['Check: one stronger accent. Castling: two distinct piece placements.', 'Check: a light-to-firm warning pair. Castling: a compact joined clack.', 'Check: a main hit with a small trailing tick. Castling: two placements with a subtle board settling sound.'][index]}</p>
<div class="actions"><button type="button" data-play="check" data-group="${index}">Play 5 checks</button><button type="button" data-play="castle" data-group="${index}">Play 5 castles</button><button type="button" data-play="compare" data-group="${index}">Compare with move</button></div>
<div class="columns"><span>CHECK</span><span>CASTLING</span></div>
${checks.slice(index * 5, index * 5 + 5).map((cue, i) => `<article>${player(cue)}${player(castles[index * 5 + i])}</article>`).join('\n')}</section>`).join('\n')}
<footer>48 kHz · Mono · 16-bit PCM WAV · Dry, centered playback with peak headroom.<br>These candidates are for listening; the app’s sound selection is unchanged. The existing check/castling MP3s are copies of the move recording.</footer>
</main>
<script>
  const audios = [...document.querySelectorAll('audio')], status = document.querySelector('.status');
  let generation = 0, queued = false;
  function stop() { generation++; queued = false; audios.forEach(audio => { audio.pause(); audio.currentTime = 0; }); }
  audios.forEach(audio => {
    audio.addEventListener('play', () => {
      if (!queued) generation++;
      audios.forEach(other => { if (other !== audio) { other.pause(); other.currentTime = 0; } });
      status.textContent = 'Playing · ' + audio.getAttribute('aria-label');
    });
    audio.addEventListener('error', () => { status.textContent = 'Could not load ' + audio.getAttribute('aria-label'); });
  });
  document.querySelector('#stop').onclick = () => { stop(); status.textContent = 'Playback stopped.'; };
  document.querySelectorAll('[data-play]').forEach(button => button.onclick = async () => {
    stop(); const token = generation, group = Number(button.dataset.group), mode = button.dataset.play;
    const rows = [...document.querySelectorAll('article')].slice(group * 5, group * 5 + 5);
    const list = mode === 'compare' ? rows.flatMap(row => [audios[0], ...row.querySelectorAll('audio')])
      : rows.map(row => row.querySelectorAll('audio')[mode === 'check' ? 0 : 1]);
    for (const audio of list) {
      if (token !== generation) return;
      queued = true;
      try { await audio.play(); } catch {
        if (token !== generation) return;
        queued = false; status.textContent = 'Press a sound’s play button to start playback.'; return;
      }
      if (token !== generation) return;
      queued = false;
      const end = performance.now() + (audio.duration || .6) * 1000 + 650;
      while (performance.now() < end) { if (token !== generation) return; await new Promise(resolve => setTimeout(resolve, 50)); }
    }
    if (token === generation) status.textContent = 'Group finished.';
  });
</script></html>\n`;
}
