// Renders the finished deliverables into out/:
//   chess-review-intro.mp4         1440p60 H.264 with the mastered mix (−14 LUFS, −2 dBTP), to YouTube's upload spec
//   chess-review-narration.wav/.mp3 the edited voice alone, as timed in the video (−16 LUFS)
//   chess-review-intro.en.srt/.vtt  captions
//   chess-review-thumbnail.png/.jpg 3840×2160
// Needs ffmpeg on PATH and the UI captures (npm run capture).
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const VIDEO = fileURLToPath(new URL('../', import.meta.url));
const OUT = `${VIDEO}out/`;
const WORK = `${OUT}work/`;
const only = process.argv.find((a) => a.startsWith('--only='))?.slice(7).split(',');
const want = (step) => !only || only.includes(step);

function run(cmd, args, { capture = false } = {}) {
  // npx is a .cmd script on Windows, so it needs a shell; ffmpeg arguments go through untouched.
  const shell = cmd === 'npx' && process.platform === 'win32';
  const r = spawnSync(cmd, args, { cwd: VIDEO, encoding: 'utf8', shell, stdio: capture ? 'pipe' : 'inherit' });
  if (r.status !== 0) throw new Error(`${cmd} ${args.join(' ')} failed${capture ? `:\n${r.stderr}` : ''}`);
  return capture ? r.stderr : '';
}
const remotion = (...args) => run('npx', ['remotion', ...args, '--log=error']);
const ffmpeg = (...args) => run('ffmpeg', ['-hide_banner', '-y', ...args], { capture: true });

// Integrated loudness and true peak, from ffmpeg's EBU R128 meter.
function measure(file) {
  const log = ffmpeg('-i', file, '-vn', '-af', 'ebur128=peak=true', '-f', 'null', '-');
  const summary = log.slice(log.lastIndexOf('Summary:'));
  return { I: Number(/I:\s+(-?[\d.]+) LUFS/.exec(summary)[1]), TP: Number(/Peak:\s+(-?[\d.]+) dBFS/.exec(summary)[1]) };
}

// Gentle compression (the voice reads 16 dB peak-to-loudness raw), gain to the target, and a
// limiter run at 4× sample rate so inter-sample peaks stay under the ceiling.
function master(input, output, target, { mono = false } = {}) {
  const comp = 'acompressor=threshold=0.1:ratio=2.5:attack=5:release=120:knee=3:detection=rms';
  const chain = (gain) => `${comp},volume=${gain.toFixed(2)}dB,aresample=192000,alimiter=limit=0.79:attack=1:release=40:level=disabled,aresample=48000`;
  let gain = target - measure(input).I;
  for (let i = 0; i < 3; i++) {
    ffmpeg('-i', input, '-af', chain(gain), ...(mono ? ['-ac', '1'] : []), '-c:a', 'pcm_s24le', output);
    const m = measure(output);
    if (Math.abs(m.I - target) <= 0.2) return m;
    gain += target - m.I;
  }
  return measure(output);
}

mkdirSync(WORK, { recursive: true });
run('node', ['tools/prepare-assets.mjs']);
if (!existsSync(`${VIDEO}public/captures/manifest.json`) || !existsSync(`${VIDEO}public/captures/analysis.json`)) {
  throw new Error('No UI captures. Run "npm run capture" first (5 to 10 minutes).');
}

if (want('captions')) {
  run('node', ['tools/captions.mjs']);
  for (const ext of ['srt', 'vtt']) copyFileSync(`${VIDEO}captions/chess-review-intro.en.${ext}`, `${OUT}chess-review-intro.en.${ext}`);
}

if (want('audio')) {
  remotion('render', 'src/index.ts', 'Intro', `${WORK}mix.wav`, '--codec=wav');
  writeFileSync(`${WORK}voice-props.json`, JSON.stringify({ stem: 'voice' })); // a file: JSON in a Windows command line loses its quotes
  remotion('render', 'src/index.ts', 'Intro', `${WORK}voice.wav`, '--codec=wav', `--props=${WORK}voice-props.json`);
  const mix = master(`${WORK}mix.wav`, `${WORK}mix-master.wav`, -14);
  console.log(`Mix: ${mix.I} LUFS, ${mix.TP} dBTP`);
  const voice = master(`${WORK}voice.wav`, `${OUT}chess-review-narration.wav`, -16, { mono: true });
  ffmpeg('-i', `${OUT}chess-review-narration.wav`, '-c:a', 'libmp3lame', '-b:a', '192k', `${OUT}chess-review-narration.mp3`);
  console.log(`Narration: ${voice.I} LUFS, ${voice.TP} dBTP`);
}

if (want('video')) {
  // Laid out at 1920×1080, rendered at 2× and scaled down to 1440p, which smooths edges while
  // the camera moves. The captures have 4× pixels, so close-ups up to 2× zoom stay sharp.
  // Eight tabs keep the 8K frames within memory.
  remotion('render', 'src/index.ts', 'Intro', `${WORK}video-2160.mp4`, '--scale=2', '--concurrency=8', '--muted', '--codec=h264',
    '--crf=12', '--x264-preset=slow', '--gop=30', '--pixel-format=yuv420p', '--color-space=bt709', '--image-format=png');
  ffmpeg('-i', `${WORK}video-2160.mp4`, '-vf', 'scale=2560:1440:flags=lanczos+accurate_rnd', '-c:v', 'libx264', '-preset', 'slow',
    '-crf', '12', '-g', '30', '-pix_fmt', 'yuv420p', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709',
    '-color_range', 'tv', `${WORK}video.mp4`);
}

if ((want('video') || want('audio')) && existsSync(`${WORK}video.mp4`) && existsSync(`${WORK}mix-master.wav`)) {
  ffmpeg('-i', `${WORK}video.mp4`, '-i', `${WORK}mix-master.wav`, '-map', '0:v', '-map', '1:a', '-c:v', 'copy',
    '-c:a', 'aac', '-b:a', '384k', '-ar', '48000', '-movflags', '+faststart', '-shortest', `${OUT}chess-review-intro.mp4`);
  const m = measure(`${OUT}chess-review-intro.mp4`);
  console.log(`Video: ${(statSync(`${OUT}chess-review-intro.mp4`).size / 1e6).toFixed(1)} MB, audio ${m.I} LUFS, ${m.TP} dBTP`);
}

if (want('thumbnail')) {
  // Laid out at 1280×720 and rendered at 3×, YouTube's recommended 3840×2160.
  remotion('still', 'src/index.ts', 'Thumbnail', `${OUT}chess-review-thumbnail.png`, '--scale=3');
  ffmpeg('-i', `${OUT}chess-review-thumbnail.png`, '-q:v', '2', `${OUT}chess-review-thumbnail.jpg`);
}

if (!only) rmSync(WORK, { recursive: true, force: true });
console.log('Done: out/');
