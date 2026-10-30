import test from 'node:test';
import assert from 'node:assert/strict';
import {app, loadGame, settle, deferred, fakeEngine} from './helpers/app.mjs';

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
  assert.deepEqual([...section.querySelectorAll('.lib-dd-opt[data-setting="graphDesign"]')].map(n => n.textContent), ['Original','Timeline','Move bars','Move bars v2','Move bars v3','Move bars v4','Minimal']);
  const before = JSON.stringify({evals:a.state.evals,bests:a.state.bests,idx:a.state.idx,layout:a.state.layout});
  a.replace('scheduleReanalyze', () => { throw Error('Design changes must not analyze'); });
  for (const design of ['bars','bars2','bars3','bars4','original','timeline','minimal']) {
    doc.querySelector(`[data-setting="graphDesign"][data-value="${design}"]`).click();
    await settle(); await a.run('_settingsWriteQueue');
    assert.equal(a.store.settings.graphDesign, design);
    assert.equal(doc.querySelector('#graphMount .panel').dataset.design, design);
    assert.equal(JSON.stringify({evals:a.state.evals,bests:a.state.bests,idx:a.state.idx,layout:a.state.layout}), before);
  }
});

for (const design of ['timeline','timeline2','bars','bars2','bars3','bars4','minimal']) {
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
      assert.equal(chart.querySelector('.eval-position').style.display,'');
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
    const marker = chart.querySelector('.eval-position');
    if (design.startsWith('bars')) {
      assert.equal(marker.style.left,'50%');
      assert.equal(marker.classList.contains('evaluation-position-marker'),true);
      assert.equal(chart.querySelector('svg .eval-position,.eval-hover-line'),null);
    } else assert.equal(+marker.getAttribute('x1'),192);
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
  assert.deepEqual([...doc.querySelectorAll('.evaluation-move-badge')].map(b => b.dataset.ply),['1','4']);
  await a.call('setSetting','graphDesign','timeline');
  assert.equal(doc.querySelector('.evaluation-move-badge'),null);
});

test('retired Timeline v2 migrates to the default design and shows honest empty states', async t => {
  const a = app(t,{url:'https://extension.test/analysis.html?workspace=blank'}), doc = a.dom.window.document;
  a.replace('resetSettingsForRelease',async () => {});
  a.store.settings = {graphDesign:'timeline2'}; await a.start();
  assert.equal(doc.querySelector('.evaluation-panel').dataset.design,'bars3');
  assert.equal(a.store.settings.graphDesign,'bars3');
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

test('Move bars marks only brilliant, great, miss and blunder moves with colored circles and a moving pointer', async t => {
  const a = review(t), doc = a.dom.window.document;
  loadGame(a, '1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6',
    [0,20,50,-100,100,200,150,-60,0].map(cp => ({cp})));
  a.state.classif = ['brilliant','brilliant','great','miss','blunder','mistake','inacc','best','book'];
  await a.call('setSetting','graphDesign','bars');
  const chart = doc.querySelector('.evaluation-bars [role=slider]');
  const dots = [...chart.querySelectorAll('.evaluation-move-dot')];
  assert.deepEqual(dots.map(dot => dot.dataset.ply), ['1','2','3','4']);
  assert.deepEqual(dots.map(dot => dot.dataset.category), ['brilliant','great','miss','blunder']);
  for (const dot of dots) {
    assert.equal(dot.textContent, '');
    assert.equal(dot.style.background, `var(--q-${dot.dataset.category})`);
    assert.equal(dot.getAttribute('aria-hidden'), 'true');
    const bar = chart.querySelectorAll('.evaluation-column')[+dot.dataset.ply];
    const tip = +bar.getAttribute('y') + (bar.classList.contains('black') ? +bar.getAttribute('height') : 0);
    assert.ok(Math.abs(Number(dot.style.top.match(/, ([\d.]+)%/)[1]) - tip / 120 * 100) < 1e-8);
  }
  const marker = chart.querySelector('.evaluation-position-marker');
  a.call('go',4);
  assert.equal(chart.querySelector('.evaluation-position-marker'), marker);
  assert.equal(marker.style.left, '50%');
  assert.match(chart.getAttribute('aria-valuetext'), /Blunder/);
  a.call('go',0);
  assert.equal(marker.style.left, `${.5 / 9 * 100}%`);
  a.state.evals[4] = null; a.call('renderGraph');
  assert.deepEqual([...doc.querySelectorAll('.evaluation-move-dot')].map(dot => dot.dataset.ply), ['1','2','3']);
});

for (const design of ['bars', 'bars2', 'bars3', 'bars4']) {
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
        if (design === 'bars2' || design === 'bars3') {
          const dot = chart.querySelector(`.evaluation-move-dot[data-ply="${ply}"]`);
          assert.ok(Math.abs(Number(dot.style.top.match(/, ([\d.]+)%/)[1]) - tip / 120 * 100) < 1e-8);
        }
      }
    }
  });

  test(`${design} fits available evaluations and rescales as larger evaluations arrive, excluding mates`, async t => {
    const a = review(t), doc = a.dom.window.document;
    a.state.evals = [{cp:0}, {cp:10}, {cp:-100}, null, null];
    await a.call('setSetting', 'graphDesign', design);
    const heights = () => [...doc.querySelectorAll('.evaluation-column')].map(n => +n.getAttribute('height'));
    const initial = heights();
    assert.equal(initial.length, 3, 'Pending positions have no bars');
    assert.ok(initial[1] > 5, 'Close games expand to show small differences');
    assert.equal(initial[2], 52);
    a.state.evals[3] = {mate:3}; a.state.evals[4] = null; a.call('renderGraph');
    assert.deepEqual(heights(), [...initial, 52], 'Mate does not compress finite scores');
    a.state.evals[4] = {cp:1000}; a.call('renderGraph');
    assert.ok(heights()[1] < initial[1]);
    assert.ok(heights()[2] < initial[2]);
    assert.equal(heights()[4], 52);
    const expanded = heights();
    a.state.evals[3] = null; a.call('renderGraph');
    assert.deepEqual(heights(), expanded.filter((_, i) => i !== 3), 'A pending position does not hide later results');
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
  assert.deepEqual(dots().map(dot => dot.dataset.ply), ['2','4']);
  await a.call('setSetting','graphDesign','bars');
  assert.deepEqual(dots().map(dot => dot.dataset.category), ['miss','blunder']);
});

test('Move bars v3 guide follows the selected bar through navigation, flips and pending results', async t => {
  const a = review(t), doc = a.dom.window.document;
  await a.call('setSetting','graphDesign','bars3');
  const chart = doc.querySelector('.evaluation-bars3 [role=slider]');
  const guide = chart.querySelector('.evaluation-position-guide'), svg = chart.querySelector('svg');
  assert.equal(chart.querySelectorAll('.evaluation-move-dot').length,
    a.state.classif.filter((cat, ply) => ply > 0 && ['mistake','great','brilliant','blunder','miss'].includes(cat)).length);
  for (const ply of [0,1,3,4]) {
    a.call('go',ply);
    const bar = chart.querySelectorAll('.evaluation-column')[ply];
    assert.equal(chart.querySelector('svg'),svg);
    assert.equal(chart.querySelector('.evaluation-position-guide'),guide);
    assert.equal(+guide.getAttribute('x1'), (ply + .5) / 5 * 384);
    assert.equal(guide.getAttribute('x1'),guide.getAttribute('x2'));
    assert.equal(+guide.getAttribute('y1'), +bar.getAttribute('y') + (ply === 3 ? +bar.getAttribute('height') : 0));
    assert.equal(+guide.getAttribute('y2'),120);
    assert.equal(guide.style.display,'');
  }
  a.state.flipped = true; a.call('renderGraph');
  assert.equal(chart.querySelector('.evaluation-position-guide'),guide);
  a.state.evals[2] = null; a.call('go',2);
  assert.equal(doc.querySelector('.evaluation-position-guide').style.display,'none');
  assert.equal(doc.querySelector('.evaluation-position-marker').style.display,'none');
  a.state.evals[2] = {cp:-300}; a.call('renderGraph');
  const updated = doc.querySelector('.evaluation-position-guide');
  assert.equal(updated.style.display,'');
  assert.ok(+updated.getAttribute('y1') > 60);
});

test('Move bars v4 colors every classified bar, omits category dots and refreshes classification colors', async t => {
  const a = review(t), doc = a.dom.window.document;
  loadGame(a, '1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7',
    Array.from({length:11}, (_, ply) => ({cp:ply % 2 ? -100 : 100})));
  const categories = ['brilliant','great','best','excellent','good','book','inacc','mistake','miss','blunder'];
  a.state.classif = ['blunder', ...categories];
  await a.call('setSetting','graphDesign','bars4');
  const columns = () => [...doc.querySelectorAll('.evaluation-column')];
  assert.equal(doc.querySelector('.evaluation-move-dot,.evaluation-position-guide'),null);
  assert.equal(columns()[0].style.fill,'', 'Starting position has no move classification');
  assert.deepEqual(columns().slice(1).map(bar => bar.dataset.category),categories);
  assert.deepEqual(columns().slice(1).map(bar => bar.style.fill),categories.map(cat => `var(--q-${cat})`));
  a.call('go',10);
  assert.match(doc.querySelector('[role=slider]').getAttribute('aria-valuetext'),/Blunder/);
  a.state.classif[1] = 'blunder'; a.state.classif[2] = null; a.call('renderGraph');
  assert.equal(columns()[1].style.fill,'var(--q-blunder)');
  assert.equal(columns()[2].style.fill,'');
  a.state.evals[3] = null; a.call('renderGraph');
  assert.equal(columns().length,10, 'Pending positions have no colored bar');
});

for (const design of ['bars2','bars3','bars4']) {
  test(`${design} restores its saved choice in a blank workspace without dots`, async t => {
    const a = app(t,{url:'https://extension.test/analysis.html?workspace=blank'}), doc = a.dom.window.document;
    a.replace('resetSettingsForRelease',async () => {});
    a.store.settings = {graphDesign:design}; await a.start();
    assert.equal(doc.querySelector('.evaluation-panel').dataset.design,design);
    assert.match(doc.querySelector('.evaluation-empty').textContent,/Load a game/);
    assert.equal(doc.querySelector('.evaluation-move-dot'),null);
  });
}

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

for (const [design, style] of [
  ['timeline','area'], ['timeline2','area'], ['bars','area'], ['bars2','area'], ['bars3','area'], ['bars4','area'], ['minimal','area'],
  ...['area','line','minimal','color'].map(style => ['original',style]),
]) {
  test(`${design}/${style} renders out-of-order results without bridging pending positions`, t => {
    const a = review(t), S = a.state, doc = a.dom.window.document;
    Object.assign(S.settings, {graphDesign:design, graphStyle:style});
    S.analyzing = true; S.progress = 0;
    S.evals = [null, {cp:60}, null, null, {mate:3}];
    a.call('flushProgress', S.batchGen);
    const chart = () => doc.querySelector('#graphMount .evalgraph');
    const plot = () => chart().querySelector('svg');
    const segments = () => {
      if (design.startsWith('bars')) return plot().querySelectorAll('.evaluation-column').length;
      const path = plot().querySelector('path');
      assert.ok(path, 'Results after a slow starting position are visible');
      return path.getAttribute('d').match(/M/g).length;
    };
    assert.equal(segments(), 2);
    assert.equal(doc.querySelector('.evaluation-empty'), null);
    chart().getBoundingClientRect = () => ({left:0,top:0,width:400,height:120});
    const hover = ply => chart().dispatchEvent(new a.dom.window.MouseEvent('mousemove', {
      clientX: design.startsWith('bars') ? (ply + .5) / 5 * 400 : ply / 4 * 400, bubbles:true,
    }));
    hover(4);
    assert.equal(doc.querySelector('.eval-tip').textContent, '#3', 'Sparse hover uses the actual ply');
    assert.equal(plot().querySelector('.eval-hover-dot').getAttribute('cx'), String(design.startsWith('bars') ? 345.6 : 384));
    hover(2);
    assert.equal(plot().querySelector('.eval-hover').style.display, 'none');
    assert.equal(doc.querySelector('.eval-tip').classList.contains('show'), false);
    if (design !== 'original') {
      chart().dispatchEvent(new a.dom.window.KeyboardEvent('keydown', {key:'End',bubbles:true}));
      assert.equal(S.idx, 4, 'Slow earlier positions cannot block navigation to a completed result');
      assert.equal(chart().getAttribute('aria-valuemax'), '4');
    }
    S.evals[2] = {cp:-40}; a.call('flushProgress', S.batchGen);
    assert.equal(segments(), design.startsWith('bars') ? 3 : 2);
    S.evals[0] = {cp:0}; S.evals[3] = {cp:90}; S.progress = S.total;
    a.call('flushProgress', S.batchGen);
    assert.equal(segments(), design.startsWith('bars') ? 5 : 1, 'Gaps join as evaluations arrive');
    if (design !== 'original') assert.equal(chart().getAttribute('aria-valuemax'), '4');
  });
}

test('a live worker pool updates the graph before a slow earlier search completes', async t => {
  const a = review(t), S = a.state, doc = a.dom.window.document;
  S.settings.engineWorkers = 3; S.settings.graphDesign = 'bars2';
  const results = S.positions.map(() => deferred());
  a.replace('createEngine', async () => fakeEngine());
  a.replace('analyseCalibratedPosition', (_engine, {fen}) => results[S.positions.findIndex(p => p.fen === fen)].promise);
  a.replace('saveToLibrary', () => {});
  a.replace('schedulePanelPrecalculation', () => {});
  const run = a.call('startAnalysis'); await settle();
  results[2].resolve({score:{cp:120},bestmove:'e4d5',lines:[]}); await settle();
  await new Promise(resolve => setTimeout(resolve, 180));
  assert.equal(S.analyzing, true);
  assert.equal(S.progress, 0);
  assert.equal(S.completed, 1);
  const columns = [...doc.querySelectorAll('.evaluation-column')];
  assert.equal(columns.length, 1, 'Throttled progress paints completed moves while earlier searches are pending');
  assert.ok(+columns[0].getAttribute('x') > 0, 'Results keep their position on the game timeline');
  doc.querySelector('.ml-move[data-ply="2"]').click();
  assert.equal(S.idx, 2, 'A completed move is reachable before the first search returns');
  doc.querySelector('#controls [aria-label="Next"]').click();
  assert.equal(S.idx, 2, 'The next move stays locked beyond the furthest result');
  assert.equal(doc.querySelector('#controls [aria-label="End"]').disabled, true);
  results[4].resolve({score:{cp:40},bestmove:'e2e4',lines:[]});
  // Position four is still queued behind position three. Both become reachable
  // when this worker returns, even though positions zero and one remain busy.
  results[3].resolve({score:{cp:-90},bestmove:'d8d5',lines:[]}); await settle();
  a.call('flushProgress', S.batchGen);
  assert.equal(S.progress, 0);
  doc.querySelector('#controls [aria-label="Next"]').click();
  assert.equal(S.idx, 3);
  assert.equal(doc.querySelector('.evaluation-score').textContent, '+0.9');
  a.call('go', 1);
  assert.equal(doc.querySelector('.evaluation-score').textContent, '—');
  assert.match(doc.querySelector('.evalgraph').getAttribute('aria-valuetext'), /Calculating/);
  a.call('flushProgress', S.batchGen);
  assert.equal(S.idx, 1, 'Progress repaint cannot move the selected position');
  results[1].resolve({score:{cp:-60},bestmove:'e7e5',lines:[]}); await settle();
  a.call('flushProgress', S.batchGen);
  assert.equal(S.idx, 1); assert.equal(S.progress, 0);
  assert.equal(doc.querySelector('.evaluation-score').textContent, '+0.6', 'The selected result appears while the slow earlier search is still pending');
  for (const result of results) result.resolve({score:{cp:0},bestmove:'e2e4',lines:[]});
  await run;
  assert.equal(S.analyzing, false);
  assert.equal(doc.querySelectorAll('.evaluation-column').length, 5);
});
