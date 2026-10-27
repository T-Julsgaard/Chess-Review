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
  assert.deepEqual([...section.querySelectorAll('[data-setting="graphDesign"]')].map(n => n.textContent), ['Original','Timeline','Timeline v2','Move bars','Move bars v2','Minimal']);
  const before = JSON.stringify({evals:a.state.evals,bests:a.state.bests,idx:a.state.idx,layout:a.state.layout});
  a.replace('scheduleReanalyze', () => { throw Error('Design changes must not analyze'); });
  for (const design of ['bars','bars2','original','timeline','timeline2','minimal']) {
    doc.querySelector(`[data-setting="graphDesign"][data-value="${design}"]`).click();
    await settle(); await a.run('_settingsWriteQueue');
    assert.equal(a.store.settings.graphDesign, design);
    assert.equal(doc.querySelector('#graphMount .panel').dataset.design, design);
    assert.equal(JSON.stringify({evals:a.state.evals,bests:a.state.bests,idx:a.state.idx,layout:a.state.layout}), before);
  }
});

for (const design of ['timeline','timeline2','bars','bars2','minimal']) {
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
        if (design !== 'timeline2') assert.equal(doc.querySelector('.evaluation-panel').textContent,text, 'Only the score is visible alongside the chart');
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
    const x = design.startsWith('bars') ? (2.5 / 5) * 400 : 200;
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

test('Timeline v2 badges show notable move grades, navigate directly and update with analysis and badge preferences', async t => {
  const a = review(t), doc = a.dom.window.document;
  a.state.classif = [null,'inacc','best','brilliant','blunder'];
  a.state.moveGrades = [null,4.3,10,9.8,0.2];
  await a.call('setSetting','graphDesign','timeline2');
  const chart = doc.querySelector('.evaluation-timeline2 [role=slider]');
  const badges = () => [...chart.querySelectorAll('.evaluation-move-badge')];
  assert.deepEqual(badges().map(b => b.dataset.ply), ['1','3','4']);
  assert.deepEqual(badges().map(b => b.querySelector('text').textContent), ['4.3','9.8','0.2']);
  assert.equal(chart.querySelectorAll('circle').length,4, 'Three shared badges and the hidden hover dot');
  chart.getBoundingClientRect = () => ({left:0,top:0,width:400,height:120});
  badges()[2].dispatchEvent(new a.dom.window.MouseEvent('click',{clientX:390,bubbles:true}));
  assert.equal(a.state.idx,4, 'The inset final badge still selects its exact move');
  assert.equal(badges()[2].classList.contains('current'),true);
  assert.match(chart.getAttribute('aria-valuetext'),/Blunder, score 0.2/);
  badges()[2].dispatchEvent(new a.dom.window.MouseEvent('mousemove',{clientX:390,bubbles:true}));
  assert.equal(doc.querySelector('.eval-tip').textContent,'#3');
  const first = badges()[0];
  await a.call('setSetting','badgeFont','spacegrotesk');
  assert.equal(badges()[0],first);
  assert.match(first.querySelector('text').getAttribute('font-family'),/Badge Space Grotesk/);
  a.state.moveGrades[1] = 4.6; a.call('renderGraph');
  assert.equal(doc.querySelector('.evaluation-move-badge text').textContent,'4.6');
  a.state.evals[3] = null; a.call('renderGraph');
  assert.deepEqual([...doc.querySelectorAll('.evaluation-move-badge')].map(b => b.dataset.ply),['1']);
  await a.call('setSetting','graphDesign','timeline');
  assert.equal(doc.querySelector('.evaluation-move-badge'),null);
});

test('Timeline v2 restores its saved design and shows honest empty states', async t => {
  const a = app(t,{url:'https://extension.test/analysis.html?workspace=blank'}), doc = a.dom.window.document;
  a.replace('resetSettingsForRelease',async () => {});
  a.store.settings = {graphDesign:'timeline2'}; await a.start();
  assert.equal(doc.querySelector('.evaluation-panel').dataset.design,'timeline2');
  assert.match(doc.querySelector('.evaluation-empty').textContent,/Load a game/);
  assert.equal(doc.querySelector('.evaluation-move-badge'),null);
});

test('Move bars keeps scores oriented toward White on board flips', async t => {
  const a = review(t), doc = a.dom.window.document;
  await a.call('setSetting','graphDesign','bars');
  assert.equal(doc.querySelectorAll('.evaluation-column').length,5);
  a.call('go',1);
  a.state.flipped = true; a.call('renderGraph');
  assert.equal(doc.querySelector('.evaluation-score').textContent,'+0.6');
  assert.equal(doc.querySelector('.evaluation-panel').textContent,'+0.6');
});

for (const design of ['bars', 'bars2']) {
  test(`${design} reveals small changes and growing advantages through ten pawns on both sides`, async t => {
    const a = review(t), doc = a.dom.window.document;
    for (const sign of [1, -1]) {
      const scores = [0, 10, 50, 100, 500, 600, 900, 1000, 1200, 2000].map(cp => ({cp: cp * sign}));
      scores.push({mate: 3 * sign});
      loadGame(a, '1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7', scores);
      a.state.classif = scores.map((_, ply) => ply ? 'mistake' : null);
      await a.call('setSetting', 'graphDesign', design);
      const chart = doc.querySelector('#graphMount [role=slider]');
      const columns = [...chart.querySelectorAll('.evaluation-column')];
      const heights = columns.map(column => +column.getAttribute('height'));
      assert.equal(columns.length, scores.length);
      assert.ok(heights[1] > 1.5, 'A tenth of a pawn is more visible than on the old five-pawn scale');
      for (let ply = 1; ply < 8; ply++) assert.ok(heights[ply] > heights[ply - 1]);
      assert.ok(heights[7] - heights[4] > 10, 'Five to ten pawns still has visible headroom');
      assert.deepEqual(heights.slice(7), [52, 52, 52, 52], 'Ten pawns caps the bars, including mate');
      chart.getBoundingClientRect = () => ({left:0, top:0, width:384, height:120});
      for (let ply = 1; ply < scores.length; ply++) {
        const tip = sign > 0 ? +columns[ply].getAttribute('y') : 60 + heights[ply];
        assert.equal(columns[ply].classList.contains(sign > 0 ? 'white' : 'black'), true);
        chart.dispatchEvent(new a.dom.window.MouseEvent('mousemove', {clientX:(ply + .5) / scores.length * 384, bubbles:true}));
        assert.ok(Math.abs(+chart.querySelector('.eval-hover-dot').getAttribute('cy') - tip) < 1e-8);
        assert.equal(doc.querySelector('.eval-tip').textContent, a.call('evalText', scores[ply]));
        if (design === 'bars2') {
          const dot = chart.querySelector(`.evaluation-move-dot[data-ply="${ply}"]`);
          assert.ok(Math.abs(Number(dot.style.top.match(/, ([\d.]+)%/)[1]) - tip / 120 * 100) < 1e-8);
        }
      }
    }
  });

  test(`${design} fits the analyzed prefix and rescales as larger evaluations arrive, excluding mates`, async t => {
    const a = review(t), doc = a.dom.window.document;
    a.state.evals = [{cp:0}, {cp:10}, {cp:-100}, null, {cp:1000}];
    await a.call('setSetting', 'graphDesign', design);
    const heights = () => [...doc.querySelectorAll('.evaluation-column')].map(n => +n.getAttribute('height'));
    const initial = heights();
    assert.equal(initial.length, 3, 'Unanalyzed suffix must not determine the scale');
    assert.ok(initial[1] > 5, 'Close games expand to show small differences');
    assert.equal(initial[2], 52);
    a.state.evals[3] = {mate:3}; a.state.evals[4] = null; a.call('renderGraph');
    assert.deepEqual(heights(), [...initial, 52], 'Mate does not compress finite scores');
    a.state.evals[4] = {cp:1000}; a.call('renderGraph');
    assert.ok(heights()[1] < initial[1]);
    assert.ok(heights()[2] < initial[2]);
    assert.equal(heights()[4], 52);
    a.state.evals[4] = {cp:9700}; a.call('renderGraph');
    a.state.evals[4] = {mate:3}; a.call('renderGraph');
    assert.deepEqual(heights().slice(0, 3), initial, 'Switching a finite score to an equivalent mate sentinel refreshes the range');
    a.state.evals = [{cp:0}, {cp:0}, {cp:0}, null, null]; a.call('renderGraph');
    assert.deepEqual(heights(), [.8, .8, .8], 'Equal positions keep finite, minimal bars');
  });
}

test('Move bars v2 adds Timeline dots at the bar tips and updates them with classifications', async t => {
  const a = review(t), doc = a.dom.window.document;
  a.state.classif = [null,'mistake','great','brilliant','blunder'];
  await a.call('setSetting','graphDesign','bars2');
  const chart = doc.querySelector('.evaluation-bars2 [role=slider]');
  const dots = () => [...doc.querySelectorAll('.evaluation-move-dot')];
  assert.equal(chart.querySelectorAll('.evaluation-column').length,5);
  assert.equal(chart.querySelector('.evaluation-move-badge'),null);
  assert.deepEqual(dots().map(dot => dot.dataset.ply), ['1','2','3','4']);
  assert.deepEqual(dots().map(dot => dot.dataset.category), ['mistake','great','brilliant','blunder']);
  assert.ok(dots().every(dot => dot.tagName === 'SPAN' && dot.getAttribute('aria-hidden') === 'true'));
  assert.match(dots()[0].style.left, /30%/);
  const firstTip = +chart.querySelectorAll('.evaluation-column')[1].getAttribute('y') / 120 * 100;
  assert.ok(Math.abs(Number(dots()[0].style.top.match(/, ([\d.]+)%/)[1]) - firstTip) < 1e-8);
  a.call('go',4);
  assert.equal(doc.querySelector('.evaluation-score').textContent,'M3');
  assert.match(chart.getAttribute('aria-valuetext'),/Blunder/);
  a.state.flipped = true; a.call('renderGraph');
  assert.equal(doc.querySelector('.evaluation-bars2 [role=slider]'),chart);
  a.state.classif[1] = 'inacc'; a.state.classif[2] = 'miss'; a.call('renderGraph');
  assert.deepEqual(dots().map(dot => dot.dataset.category), ['miss','brilliant','blunder']);
  a.state.evals[3] = null; a.call('renderGraph');
  assert.deepEqual(dots().map(dot => dot.dataset.ply), ['2']);
  await a.call('setSetting','graphDesign','bars');
  assert.equal(doc.querySelector('.evaluation-move-dot'),null);
});

test('Move bars v2 restores its saved choice in a blank workspace without dots', async t => {
  const a = app(t,{url:'https://extension.test/analysis.html?workspace=blank'}), doc = a.dom.window.document;
  a.replace('resetSettingsForRelease',async () => {});
  a.store.settings = {graphDesign:'bars2'}; await a.start();
  assert.equal(doc.querySelector('.evaluation-panel').dataset.design,'bars2');
  assert.match(doc.querySelector('.evaluation-empty').textContent,/Load a game/);
  assert.equal(doc.querySelector('.evaluation-move-dot'),null);
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
