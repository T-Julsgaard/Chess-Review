import test from 'node:test';
import assert from 'node:assert/strict';
import {app, loadGame, settle} from './helpers/app.mjs';

function review(t) {
  const a = app(t); loadGame(a, '1. e4 d5 2. exd5 Qxd5');
  a.state.evals = [{cp:0}, {cp:60}, {cp:180}, {cp:-140}, {mate:3}];
  a.call('computeDerived'); a.call('buildUI'); a.call('renderAll');
  return a;
}

test('Tabs exposes both new Evaluation designs, saves them and preserves all analysis', async t => {
  const a = review(t), doc = a.dom.window.document;
  await a.call('toggleSettings');
  const section = [...doc.querySelectorAll('.set-section')].find(n => n.querySelector('.set-sect-head').textContent === 'Tabs');
  section.querySelector('.set-sect-head').click();
  assert.deepEqual([...section.querySelectorAll('[data-setting="graphDesign"]')].map(n => n.textContent), ['Original','Timeline','Move bars']);
  const before = JSON.stringify({evals:a.state.evals,bests:a.state.bests,idx:a.state.idx,layout:a.state.layout});
  a.replace('scheduleReanalyze', () => { throw Error('Design changes must not analyze'); });
  for (const design of ['bars','original','timeline']) {
    doc.querySelector(`[data-setting="graphDesign"][data-value="${design}"]`).click();
    await settle(); await a.run('_settingsWriteQueue');
    assert.equal(a.store.settings.graphDesign, design);
    assert.equal(doc.querySelector('#graphMount .panel').dataset.design, design);
    assert.equal(JSON.stringify({evals:a.state.evals,bests:a.state.bests,idx:a.state.idx,layout:a.state.layout}), before);
  }
});

for (const design of ['timeline','bars']) {
  test(`${design} retains chart and keyboard focus while updating score, position and mate explanation`, async t => {
    const a = review(t), doc = a.dom.window.document;
    await a.call('setSetting','graphDesign',design);
    const chart = doc.querySelector('#graphMount [role=slider]'), svg = chart.querySelector('svg');
    chart.focus();
    for (const [key,ply,text,label] of [
      ['ArrowRight',1,'+0.6','White ahead'], ['ArrowRight',2,'+1.8','White ahead'],
      ['ArrowRight',3,'-1.4','Black ahead'], ['End',4,'M3','White mates'], ['Home',0,'0.0','Equal position'],
    ]) {
      chart.dispatchEvent(new a.dom.window.KeyboardEvent('keydown',{key,bubbles:true,cancelable:true}));
      assert.equal(a.state.idx,ply);
      assert.equal(doc.querySelector('.evaluation-score').textContent,text);
      assert.equal(doc.querySelector('.evaluation-verdict').textContent,label);
      assert.equal(chart.getAttribute('aria-valuenow'),String(ply));
      assert.equal(doc.activeElement,chart);
      assert.equal(chart.querySelector('svg'),svg);
      assert.equal(svg.querySelector('.eval-position').style.display,'');
    }
    a.state.evals[2] = {cp:220}; a.call('renderGraph');
    assert.notEqual(doc.querySelector('#graphMount svg'),svg);
    assert.equal(doc.activeElement,doc.querySelector('#graphMount [role=slider]'));
  });

  test(`${design} pointer mapping aligns with plotted positions and clamps to analyzed prefix`, async t => {
    const a = review(t), doc = a.dom.window.document;
    await a.call('setSetting','graphDesign',design);
    const chart = doc.querySelector('#graphMount [role=slider]');
    chart.getBoundingClientRect = () => ({left:0,top:0,width:400,height:120});
    const x = design === 'bars' ? (2.5 / 5) * 400 : 200;
    chart.dispatchEvent(new a.dom.window.MouseEvent('click',{clientX:x,bubbles:true}));
    assert.equal(a.state.idx,2);
    chart.dispatchEvent(new a.dom.window.MouseEvent('mousemove',{clientX:x,bubbles:true}));
    assert.equal(doc.querySelector('.eval-tip').textContent,'+1.8');
    assert.equal(+chart.querySelector('.eval-position').getAttribute('x1'),192);
    a.state.evals[3] = null; a.state.evals[4] = null; a.call('go',0);
    const partial = doc.querySelector('#graphMount [role=slider]');
    partial.dispatchEvent(new a.dom.window.KeyboardEvent('keydown',{key:'End',bubbles:true}));
    assert.equal(a.state.idx,2); assert.equal(partial.getAttribute('aria-valuemax'),'2');
    a.state.practice = {}; partial.dispatchEvent(new a.dom.window.KeyboardEvent('keydown',{key:'Home',bubbles:true}));
    assert.equal(a.state.idx,2);
  });
}

test('Move bars steps through evaluated positions and keeps scores oriented toward White on board flips', async t => {
  const a = review(t), doc = a.dom.window.document;
  await a.call('setSetting','graphDesign','bars');
  assert.equal(doc.querySelectorAll('.evaluation-column').length,5);
  assert.equal(doc.querySelector('[aria-label="Previous evaluated move"]').disabled,true);
  doc.querySelector('[aria-label="Next evaluated move"]').click(); assert.equal(a.state.idx,1);
  a.state.flipped = true; a.call('renderGraph');
  assert.equal(doc.querySelector('.evaluation-score').textContent,'+0.6');
  doc.querySelector('[aria-label="Previous evaluated move"]').click(); assert.equal(a.state.idx,0);
});

test('empty and missing evaluations have honest states; saved designs restore after startup', async t => {
  const a = review(t), doc = a.dom.window.document;
  a.state.evals = []; a.call('renderGraph');
  assert.equal(doc.querySelector('.evaluation-score').textContent,'—');
  assert.match(doc.querySelector('.evaluation-empty').textContent,/Waiting for analysis/);
  await a.call('setSetting','evalView','bar'); assert.equal(doc.querySelector('#graphMount svg'),null);
  const b = app(t,{url:'https://extension.test/analysis.html?workspace=blank'});
  b.replace('resetSettingsForRelease',async () => {}); b.store.settings={graphDesign:'bars'}; await b.start();
  assert.equal(b.dom.window.document.querySelector('.evaluation-panel').dataset.design,'bars');
  assert.equal(b.dom.window.document.querySelector('.evaluation-verdict').textContent,'Load a game');
});
