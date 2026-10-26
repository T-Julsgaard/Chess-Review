import test from 'node:test';
import assert from 'node:assert/strict';
import {app, loadGame, settle} from './helpers/app.mjs';

function review(t) {
  const a = app(t); loadGame(a, '1. e4 d5 2. exd5 Qxd5');
  a.state.evals = [{cp:0}, {cp:60}, {cp:180}, {cp:-140}, {mate:3}];
  a.call('computeDerived'); a.call('buildUI'); a.call('renderAll');
  return a;
}

test('Tabs exposes Evaluation designs, saves them and preserves all analysis', async t => {
  const a = review(t), doc = a.dom.window.document;
  await a.call('toggleSettings');
  const section = [...doc.querySelectorAll('.set-section')].find(n => n.querySelector('.set-sect-head').textContent === 'Tabs');
  section.querySelector('.set-sect-head').click();
  assert.deepEqual([...section.querySelectorAll('[data-setting="graphDesign"]')].map(n => n.textContent), ['Original','Timeline','Move bars','Minimal']);
  const before = JSON.stringify({evals:a.state.evals,bests:a.state.bests,idx:a.state.idx,layout:a.state.layout});
  a.replace('scheduleReanalyze', () => { throw Error('Design changes must not analyze'); });
  for (const design of ['bars','original','timeline','minimal']) {
    doc.querySelector(`[data-setting="graphDesign"][data-value="${design}"]`).click();
    await settle(); await a.run('_settingsWriteQueue');
    assert.equal(a.store.settings.graphDesign, design);
    assert.equal(doc.querySelector('#graphMount .panel').dataset.design, design);
    assert.equal(JSON.stringify({evals:a.state.evals,bests:a.state.bests,idx:a.state.idx,layout:a.state.layout}), before);
  }
});

for (const design of ['timeline','bars','minimal']) {
  test(`${design} retains chart and keyboard focus while updating score and accessible position descriptions`, async t => {
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
      if (design !== 'minimal') {
        assert.equal(doc.querySelector('.evaluation-score').textContent,text);
        assert.equal(doc.querySelector('.evaluation-panel').textContent,text, 'Only the score is visible alongside the chart');
        assert.equal(doc.querySelector('.evaluation-header,.evaluation-footer,.evaluation-axis, .evaluation-panel button'),null);
      }
      assert.match(chart.getAttribute('aria-valuetext'), new RegExp(ply === 0 ? 'Equal position' : label.startsWith('White') ? 'White' : 'Black'));
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
    assert.equal(chart.hasAttribute('title'), false);
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

test('Move bars keeps scores oriented toward White on board flips', async t => {
  const a = review(t), doc = a.dom.window.document;
  await a.call('setSetting','graphDesign','bars');
  assert.equal(doc.querySelectorAll('.evaluation-column').length,5);
  a.call('go',1);
  a.state.flipped = true; a.call('renderGraph');
  assert.equal(doc.querySelector('.evaluation-score').textContent,'+0.6');
  assert.equal(doc.querySelector('.evaluation-panel').textContent,'+0.6');
});

test('Minimal shows only black and white fields, with hover on the boundary and no labels or colored annotations', async t => {
  const a = review(t), doc = a.dom.window.document;
  const bar = doc.querySelector('.evalbar');
  a.state.settings.graphStyle = 'color';
  a.state.classif[2] = 'blunder';
  await a.call('setSetting','graphDesign','minimal');
  const panel = doc.querySelector('.evaluation-minimal'), chart = panel.querySelector('[role=slider]');
  assert.equal(panel.textContent, '');
  assert.equal(panel.querySelector('.evaluation-header,.evaluation-footer,.evaluation-axis'),null);
  assert.deepEqual([...chart.querySelectorAll('path')].map(p => p.getAttribute('fill')), ['#fff','#000']);
  assert.equal(chart.querySelectorAll('circle').length,1, 'Only the initially hidden hover dot remains');
  chart.getBoundingClientRect = () => ({left:0,top:0,width:400,height:120});
  chart.dispatchEvent(new a.dom.window.MouseEvent('mousemove',{clientX:200,bubbles:true}));
  assert.equal(+chart.querySelector('.eval-hover-dot').getAttribute('cy'),78.72);
  assert.equal(doc.querySelector('.eval-tip').textContent,'+1.8');
  a.state.flipped = true; a.call('renderGraph');
  assert.equal(chart,doc.querySelector('.evaluation-minimal [role=slider]'));
  assert.equal(doc.querySelector('.evalbar'),bar);
});

test('Minimal restores at startup and gives honest empty and partial analysis states', async t => {
  const a = app(t,{url:'https://extension.test/analysis.html?workspace=blank'}), doc = a.dom.window.document;
  a.replace('resetSettingsForRelease',async () => {});
  a.store.settings={graphDesign:'minimal'}; await a.start();
  assert.equal(doc.querySelector('.evaluation-panel').dataset.design,'minimal');
  assert.match(doc.querySelector('.evaluation-empty').textContent,/Load a game/);
  loadGame(a,'1. e4 d5 2. exd5 Qxd5');
  a.state.blank=false;
  a.state.evals=[{cp:0},{cp:100},null,null,null]; a.call('renderGraph');
  const chart=doc.querySelector('.evaluation-minimal [role=slider]');
  assert.equal(chart.getAttribute('aria-valuemax'),'1');
  assert.match(chart.querySelector('.evaluation-field-white').getAttribute('d'),/L96\.0,0/);
  a.state.evals=[]; a.call('renderGraph');
  assert.match(doc.querySelector('.evaluation-empty').textContent,/Waiting for analysis/);
  assert.equal(doc.querySelectorAll('.evaluation-minimal path').length,0);
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
  assert.match(b.dom.window.document.querySelector('.evaluation-empty').textContent,/Load a game/);
  assert.equal(b.dom.window.document.querySelector('.evaluation-score').textContent,'—');
});
