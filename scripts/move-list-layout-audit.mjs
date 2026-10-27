import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

// Run with: node scripts/learning-browser.mjs --working-tree --move-list-layout
export async function auditLearning({review, call, evaluate, out}) {
  const results = await evaluate(review, `(async () => {
    const m = await import('./analysis.js');
    // Exercise long legal SAN and both ordinary and custom category labels.
    m.S.positions[1].san = 'Nfxe5+';
    m.S.positions[2].san = 'exd8=Q+';
    m.S.positions[3].san = 'Qxe7';
    m.S.positions[4].san = 'Nbxc6';
    m.S.classif = [null, 'blunder', 'miss', 'blunder', 'mistake'];
    m.S.moveGrades = [null, 0.4, 1.2, 0.6, 2.6];
    m.S.settings.categoryNames = {miss: 'Extraordinary missed opportunity'};
    const original = document.querySelector('.moves-panel');
    const results = [];
    for (const design of ['original', 'full', 'zoomed', 'zoom20']) {
      for (const style of ['rows', 'cards']) {
        for (const badge of ['icon', 'dot', 'label']) {
          Object.assign(m.S.settings, {movesDesign: design, mlStyle: style, badgeStyle: badge});
          m.renderMoves();
          const panel = original.cloneNode(true);
          panel.style.cssText = 'position:absolute;left:0;top:0;max-height:none;overflow:visible';
          document.body.append(panel);
          for (const width of [240, 256, 300, 400]) {
            panel.style.width = width + 'px';
            panel.querySelectorAll('.ml-move').forEach(cell => cell.classList.remove('current'));
            const rowHeights = [...panel.querySelectorAll('.ml-pair')].map(pair => pair.getBoundingClientRect().height);
            for (const selected of [1, 2, 3, 4]) {
              panel.querySelectorAll('.ml-move').forEach(cell => cell.classList.toggle('current', +cell.dataset.ply === selected));
              const errors = [];
              const list = panel.querySelector('.movelist');
              for (const [row, pair] of [...panel.querySelectorAll('.ml-pair')].entries()) {
                const cells = [...pair.querySelectorAll('.ml-move')];
                const boxes = cells.map(cell => cell.getBoundingClientRect());
                const bounds = pair.getBoundingClientRect();
                if (Math.abs(bounds.height - rowHeights[row]) > 1) errors.push('Selecting a move changes row height');
                if (boxes[0].right > boxes[1].left + 1) errors.push('Move boxes overlap');
                if (Math.abs(boxes[0].width - boxes[1].width) > 1) errors.push('Unequal move columns');
                for (const [i, cell] of cells.entries()) {
                  const box = boxes[i];
                  if (box.right > bounds.right + 1) errors.push('Move box exceeds row');
                  if (cell.scrollWidth > cell.clientWidth + 1) errors.push('Move contents overflow horizontally');
                  if (badge !== 'label') {
                    const children = [...cell.children].map(child => child.getBoundingClientRect());
                    if (children.some(r => Math.abs((r.top + r.bottom) / 2 - (children[0].top + children[0].bottom) / 2) > 1)) errors.push('Move notation and badge wrap onto separate lines');
                    const san = cell.querySelector('[title="Nbxc6"]');
                    if (san && style === 'rows' && design !== 'zoomed' && width >= 256 && san.scrollWidth > san.clientWidth + 1) errors.push('Knight capture notation is truncated');
                  }
                  for (const child of cell.children) {
                    const r = child.getBoundingClientRect();
                    if (r.left < box.left - 1 || r.right > box.right + 1 || r.top < box.top - 1 || r.bottom > box.bottom + 1) errors.push('Move content escapes its box');
                  }
                }
              }
              if (list.scrollWidth > list.clientWidth + 1) errors.push('List overflows horizontally');
              results.push({design, style, badge, width, selected, errors});
            }
          }
          panel.remove();
        }
      }
    }
    return results;
  })()`);
  await fs.writeFile(path.join(out, 'move-list-layout.json'), JSON.stringify(results, null, 2));
  const failures = results.filter(result => result.errors.length);
  assert.equal(failures.length, 0, JSON.stringify(failures.slice(0, 6), null, 2));
  // Capture the real panel with label badges for a visual check as well.
  await evaluate(review, "import('./analysis.js').then(m=>{Object.assign(m.S.settings,{movesDesign:'zoom20',mlStyle:'cards',badgeStyle:'label'});m.renderMoves()})");
  const clip = await evaluate(review, "(()=>{const r=document.querySelector('.moves-panel').getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,scale:1}})()");
  const image = await call('Page.captureScreenshot', {format: 'png', clip, captureBeyondViewport: true}, review.sessionId);
  await fs.writeFile(path.join(out, 'move-list-labels.png'), Buffer.from(image.data, 'base64'));
  const narrowClip = await evaluate(review, `import('./analysis.js').then(m => {
    Object.assign(m.S.settings, {movesDesign: 'zoom20', mlStyle: 'rows', badgeStyle: 'icon'});
    m.renderMoves();
    const panel = document.querySelector('.moves-panel').cloneNode(true);
    panel.style.cssText = 'position:absolute;left:0;top:100px;z-index:100;width:256px;max-height:none;overflow:visible';
    document.body.append(panel);
    const r = panel.getBoundingClientRect();
    return {x:r.x, y:r.y, width:r.width, height:r.height, scale:1};
  })`);
  const narrowImage = await call('Page.captureScreenshot', {format: 'png', clip: narrowClip, captureBeyondViewport: true}, review.sessionId);
  await fs.writeFile(path.join(out, 'move-list-knight-capture.png'), Buffer.from(narrowImage.data, 'base64'));
  console.log('Move list layout passed ' + results.length + ' cases across panel designs, list styles, badge styles, widths and selected sides. Evidence: ' + out);
}
