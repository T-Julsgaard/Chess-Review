import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

const dir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(dir, '../..');
const selection = JSON.parse(await fs.readFile(path.join(dir,'selection.json'),'utf8'));
const selectedDetails = {
  brilliant: 'Pen nib · a masterfully crafted move',
  great: 'Trophy · exceptional play',
  book: 'Scroll · established opening knowledge',
  best: 'Crown · the strongest move',
  excellent: 'Medal · strong play just below the best',
  good: 'Checked shield · a sound, safe move',
  inaccuracy: 'Caution diamond · a small slip',
  mistake: 'Stop sign · a costly wrong move',
  miss: 'Crossed spark · an opportunity lost',
  blunder: 'Fractured shield · a serious mistake',
};
const designs = [
  ['brilliant', 'Masterstroke', 'Offered queen · a sound sacrifice', true],
  ['great', 'Superb', 'Key move · unlocking the only good reply', true],
  ['book', 'Theory', 'Opening blueprint · an established plan', false],
  ['best', 'Best', 'Exact puzzle fit · the optimal solution', false],
  ['excellent', 'Near best', 'Almost fitted · one small gap remains', true],
  ['good', 'Decent', 'Level scales · a sound, balanced choice', false],
  ['inaccuracy', 'Minor Misstep', 'Chipped square · a small loss', true],
  ['mistake', 'Major Misstep', 'Split square · a broken advantage', true],
  ['miss', 'Missed chance', 'Closing door · an opportunity slipping away', true],
  ['blunder', 'Blunder', 'Shattered square · a serious collapse', false],
];
for (const [file, , , changed] of designs) {
  const snapshots = {};
  for (const version of ['original', 'round-1', 'round-2', 'round-3', 'round-4']) {
    const svg = await fs.readFile(path.join(dir, version, file + '.svg'), 'utf8');
    const doc = new JSDOM(svg, { contentType: 'image/svg+xml' }).window.document;
    assert.equal(doc.querySelector('svg').getAttribute('viewBox'), '0 0 100 100');
    assert.equal(doc.querySelector('svg > circle').getAttribute('r'), '49');
    snapshots[version] = { svg, color: doc.querySelector('svg > circle').getAttribute('fill') };
    if (version !== 'original') assert.equal(doc.querySelectorAll('linearGradient, radialGradient, filter, text, rect').length, 0);
  }
  assert.equal(snapshots['round-1'].color, snapshots.original.color);
  assert.equal(snapshots['round-2'].color, snapshots.original.color);
  assert.equal(snapshots['round-3'].color, snapshots.original.color);
  assert.equal(snapshots['round-4'].color, snapshots.original.color);
  if (changed) assert.notEqual(snapshots['round-1'].svg, snapshots['round-2'].svg);
  else assert.equal(snapshots['round-1'].svg, snapshots['round-2'].svg);
  for (const previous of ['original', 'round-1', 'round-2']) assert.notEqual(snapshots[previous].svg, snapshots['round-3'].svg);
  for (const previous of ['original', 'round-1', 'round-2', 'round-3']) assert.notEqual(snapshots[previous].svg, snapshots['round-4'].svg);
  assert.ok(['round-1','round-2','round-3','round-4'].includes(selection[file]));
  assert.equal(await fs.readFile(path.join(root, 'icons', file + '.svg'), 'utf8'), snapshots[selection[file]].svg);
}
const icon = (version, file, name, cls = '') => `<a href="${version}/${file}.svg" aria-label="${name}, ${version}"><img class="${cls}" src="${version}/${file}.svg" alt="${name}"></a>`;
const rows = designs.map(([file, name]) => `<tr><th scope="row">${name}<small>${selectedDetails[file]}</small></th>${['original','round-1','round-2','round-3','round-4'].map(version => `<td${version===selection[file]?' class="chosen"':''}>${icon(version,file,name)}${version===selection[file]?'<small class="chosen-label">Selected</small>':''}</td>`).join('')}</tr>`).join('');
const html = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Move icons · All versions</title><style>
*{box-sizing:border-box}body{margin:0;background:#14130f;color:#f3f1ea;font-family:'Segoe UI',Arial,sans-serif;padding:30px 40px}.kicker{font-size:11px;letter-spacing:2px;color:#b8b4a8;text-transform:uppercase}h1{font-size:28px;font-weight:600;margin:10px 0}p{color:#b8b4a8;font-size:13px;margin:0 0 25px}table{width:100%;border-collapse:separate;border-spacing:0;background:#211f1b;border:1px solid #34322c;border-radius:14px;overflow:hidden;table-layout:fixed}thead th{font-size:13px;color:#b8b4a8;font-weight:500;padding:16px 12px;border-bottom:1px solid #34322c}thead th:first-child{width:31%;text-align:left;padding-left:24px}thead small{display:block;font-size:10px;color:#807c70;margin-top:5px}tbody th{font-weight:600;font-size:16px;text-align:left;padding:16px 24px}tbody th small{display:block;font-weight:400;font-size:11px;line-height:1.4;color:#b8b4a8;margin-top:8px}td{height:98px;text-align:center;padding:12px}tbody tr+tr td,tbody tr+tr th{border-top:1px solid #34322c}td img{width:64px;height:64px;display:inline-block;vertical-align:middle}a{display:inline-block;vertical-align:middle}.latest{background:#25251d}.actual{width:30px;height:30px;margin-left:20px}footer{font-size:12px;line-height:1.7;color:#b8b4a8;margin-top:22px}footer a{color:#b8b4a8}.note{color:#807c70;font-size:11px;margin-top:5px}@media(max-width:760px){body{padding:20px 12px}tbody th{padding:12px;font-size:13px}tbody th small{font-size:10px}td{padding:8px}td img{width:44px;height:44px}.actual{margin:10px 0 0;width:30px;height:30px}}
</style><style>.chosen{background:#2a3022}.chosen-label{display:block;color:#a6ce7b;font-size:10px;margin-top:5px}</style><div class="kicker">Chess Review / Saved design history</div><h1>Move icons — all versions</h1><p>Your selections are highlighted and applied in the app. Exact original circle colors. Every version preserved.</p><table><thead><tr><th>Move category</th><th>Original<small>Before redesign</small></th><th>First pass<small>Saved unchanged</small></th><th>Second pass<small>Saved unchanged</small></th><th>Third pass<small>Saved unchanged</small></th><th>Fourth pass<small>Saved unchanged</small></th></tr></thead><tbody>${rows}</tbody></table><footer>One scalable SVG per design. The app continues to size each icon for its existing placement.<div class="note">Click any icon to open its saved SVG. <a href="selected-preview.html">Selected set</a> · <a href="round-4-preview.html">Fourth pass</a> · <a href="round-1-complete.png">First pass</a> · <a href="round-2-review.html">Second pass</a> · <a href="round-3-review.html">Third pass</a></div></footer></html>`;
await fs.writeFile(path.join(dir,'review.html'),html);
const cards = designs.map(([file,name,detail]) => `<article><h2>${name}</h2><div class="hero">${icon('round-4',file,name)}</div><p>${detail}</p><div class="live">${icon('round-4',file,name,'actual')}<span>Actual callout size</span></div></article>`).join('');
const focused = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Move icons · Fourth pass</title><style>
*{box-sizing:border-box}body{margin:0;padding:32px 36px;background:#14130f;color:#f3f1ea;font:14px 'Segoe UI',Arial,sans-serif}.kicker{font-size:11px;color:#b8b4a8;letter-spacing:2px;text-transform:uppercase}h1{font-size:28px;font-weight:600;margin:10px 0}header p{color:#b8b4a8;margin:0 0 26px}.grid{display:grid;grid-template-columns:repeat(5,1fr);gap:14px}article{padding:20px 12px;background:#211f1b;border:1px solid #34322c;border-radius:16px;text-align:center}h2{font-size:16px;font-weight:600;margin:0 0 20px}.hero img{width:100px;height:100px}.hero a{display:block}article p{font-size:12px;line-height:19px;color:#b8b4a8;margin:18px 0 20px;min-height:38px}.live{display:flex;align-items:center;justify-content:center;gap:10px;padding-top:17px;border-top:1px solid #34322c}.actual{width:30px;height:30px;display:block}.live span{font-size:10px;color:#807c70}footer{font-size:12px;color:#b8b4a8;margin-top:20px}a{color:inherit}@media(max-width:850px){.grid{grid-template-columns:repeat(2,1fr)}}
</style><header><div class="kicker">Chess Review / Fourth pass</div><h1>The meaning behind the move</h1><p>Sound sacrifice. The key reply. The right fit. Increasing damage. A chance slipping away.</p></header><div class="grid">${cards}</div><footer>Exact original colors · Uniform circle fills · One SVG per design · <a href="review.html">Compare all versions</a></footer></html>`;
await fs.writeFile(path.join(dir,'round-4-preview.html'),focused);
const activeIcon = (file,name,cls='') => `<a href="../../icons/${file}.svg"><img class="${cls}" src="../../icons/${file}.svg" alt="${name}"></a>`;
const selectedCards = designs.map(([file,name]) => `<article><h2>${name}</h2><div class="hero">${activeIcon(file,name)}</div><p>${selectedDetails[file]}</p><div class="live">${activeIcon(file,name,'actual')}<span>Selected from pass ${selection[file].slice(-1)}</span></div></article>`).join('');
const selectedPreview = focused.replace('<title>Move icons · Fourth pass</title>','<title>Move icons · Selected set</title>').replace('<div class="kicker">Chess Review / Fourth pass</div><h1>The meaning behind the move</h1><p>Sound sacrifice. The key reply. The right fit. Increasing damage. A chance slipping away.</p>','<div class="kicker">Chess Review / Your selected icons</div><h1>The selected move icon set</h1><p>Your choices from passes two and three, now applied in the app.</p>').replace(cards,selectedCards);
await fs.writeFile(path.join(dir,'selected-preview.html'),selectedPreview);
for (const [file,size] of [['review','1660,1450'],['selected-preview','1280,870']]) {
  const screenshot = path.join(dir,file+'.png');
  const chrome = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', ['--headless=new','--no-first-run','--no-default-browser-check','--disable-gpu','--hide-scrollbars','--force-device-scale-factor=1','--window-size='+size,`--user-data-dir=${path.join(root,'web-ext-artifacts/icon-review/chrome-profile')}`,`--screenshot=${screenshot}`,pathToFileURL(path.join(dir,file+'.html')).href], {windowsHide:true,stdio:'ignore'});
  await new Promise((resolve,reject) => {chrome.once('error',reject);chrome.once('exit',code => code === 0 ? resolve() : reject(new Error('Chrome exit '+code)));});
  assert.ok((await fs.stat(screenshot)).size>1000);
  console.log(screenshot);
}
console.log('Verified all 50 saved SVGs: exact original circle colors, uniform fills in redesigned sets, and all ten active icons match the selected passes exactly.');
