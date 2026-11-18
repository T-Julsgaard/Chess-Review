#!/usr/bin/env node
// Builds lib/profile/portraits.js: one small tone map per historical twin, used
// by lib/profile/portrait.js to assemble the player's face out of chess pieces.
//
//   node scripts/build-twin-portraits.mjs --images <dir>
//
// <dir> receives the Wikimedia Commons sources (downloaded when missing). The
// crop and downsample step uses Windows' System.Drawing through PowerShell, so
// the script runs on Windows; the output is plain data and works everywhere.
// Every source is public domain, CC0 or CC BY; credits are written next to the
// data and listed in ATTRIBUTIONS.md.
import {execFileSync} from 'node:child_process';
import {existsSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {join, resolve} from 'node:path';

const SIZE = 64;
// id: Commons file, square crop centre (x, y) and side in pixels of the
// downloaded rendition (960 px wide, or the original when it is narrower),
// framing the whole head with some neck and shoulders, face in the upper middle
// (the mosaic and the vignette both need room around the face), inside the image,
// an optional gamma for mid-tones, and the credit line.
const SOURCES = {
  tal: {file: 'Mikhail Tal 1982or.jpg', crop: [452, 596, 675], author: 'Rob C. Croes / Anefo', license: 'CC0'},
  morphy: {file: 'Paul Morphy.jpg', crop: [557, 322, 600], author: 'Unknown author', license: 'Public domain'},
  anderssen: {file: 'Anderssen Adolf.jpg', crop: [430, 509, 840], author: 'Unknown author', license: 'Public domain'},
  lasker: {file: 'Emanuel Lasker 1.jpg', crop: [480, 450, 890], author: 'Unknown author', license: 'Public domain'},
  capablanca: {file: 'José Raúl Capablanca 1920.jpg', crop: [365, 468, 729], author: 'Unknown author', license: 'Public domain'},
  petrosian: {file: 'Tigran Petrosian 1962.2.jpg', crop: [509, 490, 780], author: 'Harry Pot / Anefo', license: 'CC0'},
  karpov: {file: 'Anatoly Karpov 1979.jpg', crop: [480, 533, 540], author: 'Rob C. Croes / Anefo', license: 'CC0'},
  kasparov: {file: 'Garry Kasparov European Union 2023 (cropped).jpg', crop: [480, 450, 900], author: 'Lukasz Kobus / European Union', license: 'CC BY 4.0'},
  fischer: {file: 'Bobby Fischer 1966 portrait.jpg', crop: [480, 405, 810], author: 'John Lent / AP', license: 'Public domain'},
  reti: {file: 'Richard Réti (1889–1929) OeNB 9471305.jpg', crop: [289, 333, 577], author: 'Unknown photographer (ÖNB)', license: 'Public domain'},
  carlsen: {file: 'Magnus Carlsen in 2025.jpg', crop: [480, 430, 620], gamma: .72, author: 'Miroslav Vajdić', license: 'CC BY 4.0'},
  nakamura: {file: 'Hikaru Nakamura at the 2026 Naroditsky Memorial Rapid and Blitz (v2).jpg', crop: [528, 430, 760], gamma: .8, author: 'ChessKelly', license: 'CC BY 4.0'},
};

const args = process.argv.slice(2);
const dir = resolve(args[args.indexOf('--images') + 1] || 'scratch/twin-portraits');
mkdirSync(dir, {recursive: true});
const UA = 'ChessReviewPortraitBuilder/1.0 (open-source chess extension)';
const pageUrl = file => 'https://commons.wikimedia.org/wiki/File:' + encodeURIComponent(file.replace(/ /g, '_'));

async function download(id, file) {
  const target = join(dir, id + '.jpg');
  if (existsSync(target)) return;
  const api = `https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo&iiprop=url&iiurlwidth=960&titles=${encodeURIComponent('File:' + file)}`;
  const info = await (await fetch(api, {headers: {'User-Agent': UA}})).json();
  const image = Object.values(info.query.pages)[0].imageinfo[0];
  const bytes = Buffer.from(await (await fetch(image.thumburl || image.url, {headers: {'User-Agent': UA}})).arrayBuffer());
  writeFileSync(target, bytes);
  await new Promise(r => setTimeout(r, 1500));
}

function cropAll() {
  const script = `
Add-Type -AssemblyName System.Drawing
$cfg = Get-Content '${join(dir, 'crops.json')}' -Raw | ConvertFrom-Json
foreach ($id in @($cfg.PSObject.Properties.Name)) {
  $c = $cfg.$id; $img = [System.Drawing.Image]::FromFile((Join-Path '${dir}' ($id + '.jpg')))
  $s = [double]$c[2]
  $src = New-Object System.Drawing.RectangleF ([double]$c[0] - $s/2), ([double]$c[1] - $s/2), $s, $s
  $bmp = New-Object System.Drawing.Bitmap ${SIZE}, ${SIZE}
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $g.DrawImage($img, (New-Object System.Drawing.RectangleF 0, 0, ${SIZE}, ${SIZE}), $src, [System.Drawing.GraphicsUnit]::Pixel)
  $v = New-Object int[] (${SIZE * SIZE})
  for ($y = 0; $y -lt ${SIZE}; $y++) { for ($x = 0; $x -lt ${SIZE}; $x++) { $p = $bmp.GetPixel($x, $y); $v[$y * ${SIZE} + $x] = [int][math]::Round(0.299 * $p.R + 0.587 * $p.G + 0.114 * $p.B) } }
  Write-Output ($id + ':' + ($v -join ',')); $g.Dispose(); $bmp.Dispose(); $img.Dispose()
}`;
  writeFileSync(join(dir, 'crops.json'), JSON.stringify(Object.fromEntries(Object.entries(SOURCES).map(([id, s]) => [id, s.crop]))));
  const text = execFileSync('powershell', ['-NoProfile', '-Command', script], {encoding: 'utf8', maxBuffer: 1 << 26});
  return Object.fromEntries(text.trim().split(/\r?\n/).map(line => { const [id, values] = line.split(':'); return [id, values.split(',').map(Number)]; }));
}

/** Levels, local contrast and a soft vignette so the face carries the image. */
function tone(values, gamma = 1) {
  const n = SIZE, sorted = [...values].sort((a, b) => a - b);
  const lo = sorted[Math.floor(sorted.length * .01)], hi = sorted[Math.floor(sorted.length * .99)];
  let v = values.map(x => Math.pow(Math.max(0, Math.min(1, (x - lo) / Math.max(1, hi - lo))), gamma));
  // Unsharp mask (Gaussian, sigma 1.4 px at 64 px): crisper features at mosaic scale.
  const kernel = [-3, -2, -1, 0, 1, 2, 3].map(d => Math.exp(-d * d / (2 * 1.4 * 1.4))), sum = kernel.reduce((a, b) => a + b, 0);
  const blur = (src, dx, dy) => src.map((_, i) => { const x = i % n, y = (i / n) | 0; let s = 0; kernel.forEach((k, j) => { const xx = Math.max(0, Math.min(n - 1, x + (j - 3) * dx)), yy = Math.max(0, Math.min(n - 1, y + (j - 3) * dy)); s += k * src[yy * n + xx]; }); return s / sum; });
  const soft = blur(blur(v, 1, 0), 0, 1);
  v = v.map((x, i) => Math.max(0, Math.min(1, x + .55 * (x - soft[i]))));
  return v.map((x, i) => {
    const px = (i % n + .5) / n - .5, py = ((i / n | 0) + .5) / n - .46;
    const d = Math.hypot(px / .5, py / .56), fade = Math.max(0, Math.min(1, (1.12 - d) / .4));
    return Math.round(255 * x * (.3 + .7 * fade * fade * (3 - 2 * fade)));
  });
}

for (const [id, source] of Object.entries(SOURCES)) await download(id, source.file);
const raw = cropAll();
const lines = Object.entries(SOURCES).map(([id, s]) => `  ${id}: {credit: ${JSON.stringify(`${s.author}, ${s.license}`)}, source: ${JSON.stringify(pageUrl(s.file))},\n    data: '${Buffer.from(tone(raw[id], s.gamma)).toString('base64')}'},`);
const out = `// Generated by scripts/build-twin-portraits.mjs. Do not edit by hand.
// ${SIZE}×${SIZE} tone maps (0 = dark, 255 = light) of each historical twin's
// face, derived from public domain, CC0 and CC BY photographs on Wikimedia
// Commons. Credits sit next to each map and in ATTRIBUTIONS.md.
export const PORTRAIT_SIZE = ${SIZE};
export const PORTRAITS = {
${lines.join('\n')}
};
`;
writeFileSync(resolve('lib/profile/portraits.js'), out);
console.log(`Wrote lib/profile/portraits.js (${Object.keys(SOURCES).length} portraits, ${out.length} bytes)`);
