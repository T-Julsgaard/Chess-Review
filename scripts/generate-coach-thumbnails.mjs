import { readFile, writeFile, mkdir } from 'node:fs/promises';

// Reuse the bundled coach artwork as static portraits; dropdowns need no animated iframes.
const source = await readFile(new URL('../analysis.js', import.meta.url), 'utf8');
const rigs = source.match(/const COACH_RIGS = \{([\s\S]*?)\n\};/)?.[1];
if (!rigs) throw new Error('Coach rig registry missing');
const output = new URL('../data/coaches-anim/thumbnails/', import.meta.url);
const check = process.argv.includes('--check');
if (!check) await mkdir(output, { recursive: true });
let count = 0;
for (const [, id, file] of rigs.matchAll(/(\w+): "([^"]+)"/g)) {
  const html = (await readFile(new URL(`../data/coaches-anim/rigs/${file}`, import.meta.url), 'utf8')).replace(/\r\n/g, '\n');
  let svg = html.match(/<svg\b[\s\S]*?<\/svg>/)?.[0];
  if (!svg || /<script\b|<foreignObject\b|<image\b|\son\w+=/i.test(svg)) throw new Error(`Unexpected portrait markup: ${id}`);
  // Crop empty side margins and lower-body props to keep the face recognizable at 28px.
  svg = svg.replace('class="coach-svg" ', '').replace('viewBox="0 0 680 760"', 'viewBox="140 40 400 600"');
  const portrait = `<!-- Generated from ${file}; run node scripts/generate-coach-thumbnails.mjs. -->\n${svg}\n`;
  const target = new URL(`${id}.svg`, output);
  if (check) {
    if ((await readFile(target, 'utf8')).replace(/\r\n/g, '\n') !== portrait) throw new Error(`Stale coach thumbnail: ${id}`);
  } else await writeFile(target, portrait);
  count++;
}
if (!count) throw new Error('No coach thumbnails generated');
console.log(`${check ? 'Verified' : 'Generated'} ${count} static coach thumbnails.`);
