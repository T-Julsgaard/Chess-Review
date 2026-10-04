// Copies the extension's own fonts, badges, knight, sounds and store screenshots into
// public/shared, so the video uses exactly what ships and nothing is downloaded.
import { spawnSync } from 'node:child_process';
import { copyFile, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const VIDEO = fileURLToPath(new URL('../', import.meta.url));
const REPO = path.resolve(VIDEO, '../..');
const OUT = path.join(VIDEO, 'public/shared');

const BADGES = ['brilliant', 'great', 'best', 'excellent', 'good', 'book', 'inaccuracy', 'mistake', 'miss', 'blunder'];
const STORE = {
  'review.png': '1 (1).png',
  'chesscom.png': '1 (2).png',
  'lichess.png': '1 (3).png',
  'accuracy.png': '1 (4).png',
  'coaches.png': '1 (5).png',
};

const copies = [
  ['fonts/inter.ttf', 'fonts/inter.ttf'],
  ['fonts/inter-OFL.txt', 'fonts/inter-OFL.txt'],
  ['fonts/firamono.ttf', 'fonts/firamono.ttf'],
  ['fonts/firamono-OFL.txt', 'fonts/firamono-OFL.txt'],
  ['pieces-img/cburnett/wN.svg', 'pieces/wN.svg'],
  ...BADGES.map((b) => [`icons/${b}.svg`, `badges/${b}.svg`]),
  ...Array.from({ length: 9 }, (_, i) => [`sounds/fx/chess_sound_0${i + 1}.wav`, `sfx/chess_sound_0${i + 1}.wav`]),
  ...Object.entries(STORE).map(([to, from]) => [`marketing/chrome-web-store/${from}`, `store/${to}`]),
];

await rm(OUT, { recursive: true, force: true });
for (const [from, to] of copies) {
  await mkdir(path.dirname(path.join(OUT, to)), { recursive: true });
  await copyFile(path.join(REPO, from), path.join(OUT, to));
}
console.log(`Copied ${copies.length} files to ${path.relative(VIDEO, OUT)}`);

// The 4K render draws the Chess.com and Lichess pictures at about 1.5× their 1280×800 size.
// Denoised and Lanczos-scaled 3× first, their text comes out slightly crisper than the
// browser's own scaling of the originals.
for (const name of ['chesscom', 'lichess']) {
  const r = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', path.join(OUT, `store/${name}.png`),
    '-vf', 'nlmeans=s=2.5:p=5:r=11,scale=iw*3:ih*3:flags=lanczos,unsharp=7:7:1.0:7:7:0', path.join(OUT, `store/${name}-3x.png`)]);
  if (r.status !== 0) throw new Error(`ffmpeg could not upscale ${name}.png. Is ffmpeg on PATH?`);
}
