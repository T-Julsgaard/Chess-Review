import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { JSDOM } from 'jsdom';
import { MOVE_GRADE_CONFIG, moveGrade, gradeSvg, gradeLabel, gradeText } from '../move-grades.js';
import { app, loadGame, branch, deferred, fakeEngine, settle } from './helpers/app.mjs';

test('category ranges stay bounded and only Brilliant can round to ten', () => {
  for (const [category, cfg] of Object.entries(MOVE_GRADE_CONFIG)) {
    for (let loss = 0; loss <= 100; loss += .13) {
      const score = moveGrade(category, loss, {}, 100);
      if (category === 'book') { assert.equal(score, null); continue; }
      assert.ok(score >= cfg.min && score <= cfg.max, `${category}: ${score}`);
      assert.equal(score === 10, category === 'brilliant');
      assert.ok(gradeText(score).match(/^\d+(\.\d)?$/));
    }
  }
  assert.equal(moveGrade('best', 0), 9);
  assert.equal(moveGrade('blunder', 20), 1.9);
  assert.equal(moveGrade('blunder', 60), 1);
  assert.equal(moveGrade('blunder', 100), 0);
});

test('ordinary grades vary monotonically within the classifier loss bands', () => {
  for (const [category, start, end] of [['excellent',0,2],['good',2,5],['inacc',5,10],['mistake',10,20],['blunder',20,100]]) {
    let last = Infinity;
    for (let loss = start; loss <= end; loss += .05) {
      const score = moveGrade(category, loss);
      assert.ok(score <= last); last = score;
    }
    assert.ok(moveGrade(category, start) > moveGrade(category, end));
  }
  assert.equal(moveGrade('good', 4.5), 5.3);
  assert.equal(moveGrade('good', 2.3), 6.7);
  assert.equal(moveGrade('good', 5, { good: 4, inacc: 6 }), 6);
  assert.ok(moveGrade('miss', 50) < moveGrade('miss', 5));
  assert.ok(moveGrade('great', 0, {}, 45) > moveGrade('great', 0, {}, 5));
});

test('missing evidence stays pending; custom labels are escaped and Book never gets a score', () => {
  for (const loss of [null, undefined, NaN, Infinity]) assert.equal(moveGrade('blunder', loss), null);
  assert.equal(gradeLabel('blunder', null, 'Blunder'), 'Blunder, score pending');
  assert.equal(gradeLabel('book', null, 'Book'), 'Book');
  const doc = new JSDOM(gradeSvg('good', 5.3, '<b>Good</b>'), {contentType:'image/svg+xml'}).window.document;
  assert.equal(doc.querySelector('svg').getAttribute('aria-label'), '<b>Good</b>, score 5.3');
  assert.equal(doc.querySelector('b'), null);
  assert.equal(doc.querySelector('text').textContent, '5.3');
  assert.equal(new JSDOM(gradeSvg('book', null, 'Book'), {contentType:'image/svg+xml'}).window.document.querySelector('text'), null);
});

test('numeric reference snapshots use accessible current artwork and the shared renderer', () => {
  for (const [category,cfg] of Object.entries(MOVE_GRADE_CONFIG)) {
    const file = category === 'inacc' ? 'inaccuracy' : category;
    const saved = fs.readFileSync(new URL(`../icons/${file}.svg`, import.meta.url), 'utf8');
    const doc = new JSDOM(saved, {contentType:'image/svg+xml'}).window.document;
    assert.equal(doc.querySelectorAll('circle').length, 1);
    assert.equal(doc.querySelector('svg').getAttribute('role'), 'img');
    assert.equal(doc.querySelector('circle').getAttribute('fill'), cfg.color);
    const names = {brilliant:'Brilliant',great:'Great',book:'Book',best:'Best',excellent:'Excellent',good:'Good',inacc:'Inaccuracy',mistake:'Mistake',miss:'Miss',blunder:'Blunder'};
    assert.equal(saved.replace(/\r\n/g, '\n'), gradeSvg(category, null, names[category], true) + '\n');
    assert.equal(doc.querySelectorAll('linearGradient,radialGradient,filter').length, 0);
  }
});

test('provisional grades change without touching completed evaluation, accuracy or rating inputs', t => {
  const a = app(t); loadGame(a, '1. e4 e5', [{cp:0},{cp:-40},{cp:0}]);
  a.call('computeDerived');
  const before = JSON.stringify({evals:a.state.evals,bests:a.state.bests,acc:a.state.acc,accElo:a.state.accElo,accMove:a.state.accMove});
  const old = a.state.moveGrades[1];
  a.state.searchPreviews[1] = {score:{cp:60},bestmove:'e7e5',lines:[]};
  a.call('computeDerived');
  assert.notEqual(a.state.moveGrades[1], old);
  assert.equal(JSON.stringify({evals:a.state.evals,bests:a.state.bests,acc:a.state.acc,accElo:a.state.accElo,accMove:a.state.accMove}), before);
  a.state.searchPreviews.fill(null); a.call('computeDerived');
  assert.equal(a.state.moveGrades[1], old);
});

test('board score changes preserve the focused badge and update its numeral', t => {
  const a = app(t); loadGame(a, '1. e4'); a.call('computeDerived');
  a.state.idx=1; a.state.classif[1]='good'; a.state.moveGrades[1]=5.3;
  a.call('buildUI'); a.call('buildBoard');
  const doc=a.dom.window.document, badge=doc.querySelector('.sq-badge'); badge.focus();
  a.state.moveGrades[1]=5.4; a.call('paintBoard');
  assert.equal(doc.querySelector('.sq-badge'), badge);
  assert.equal(doc.activeElement, badge);
  assert.equal(badge.getAttribute('aria-label'), 'Good, score 5.4');
  assert.equal(badge.querySelector('text').textContent, '5.4');
  a.call('paintBoard'); assert.equal(doc.querySelector('.sq-badge'), badge);
});

test('move list refreshes a decimal even when its category stays unchanged', t => {
  const a=app(t);loadGame(a,'1. e4');a.call('computeDerived');a.call('buildUI');
  a.state.classif[1]='inacc';a.state.moveGrades[1]=3.5;a.call('renderMoves');
  const doc=a.dom.window.document, cell=doc.querySelector('.ml-move[data-ply="1"]'), badge=cell.querySelector('.qb');
  a.state.moveGrades[1]=3.6;a.call('renderMoves');
  assert.equal(doc.querySelector('.ml-move[data-ply="1"]'),cell);
  assert.equal(cell.querySelector('.qb'),badge);
  assert.equal(badge.getAttribute('aria-label'),'Inaccuracy, score 3.6');
});

test('mainline and variation grades agree and do not depend on player rating', t => {
  const a=app(t);loadGame(a,'1. e4 e5 2. Nf3',[{cp:0},{cp:-50},{cp:50},{cp:-90}]);
  a.call('computeDerived');const grades=[...a.state.moveGrades];
  a.state.players.w.rating=400;a.state.players.b.rating=2800;a.call('computeDerived');
  assert.deepEqual([...a.state.moveGrades],grades);
  const v=branch(a,0);a.call('classifyVariationMoves');
  assert.deepEqual(Array.from(v.positions.slice(1),p=>p.moveGrade),grades.slice(1));
});

test('variations show streamed grades, then discards cancelled snapshots', async t => {
  const a=app(t);loadGame(a,'1. e4',[{cp:0},{cp:-50}]);a.call('computeDerived');
  const v=branch(a,0);v.positions[1].eval=null;v.positions[1].best=null;
  const done=deferred();let progress;
  a.state.liveEngine=fakeEngine(async (...args)=>{progress=args[4];return done.promise;});
  a.replace('refreshVariation',()=>a.call('classifyVariationMoves'));
  const pending=a.call('requestLiveEval');await settle();
  progress({score:{cp:60},bestmove:'e7e5',lines:[]});const initial=v.positions[1].moveGrade;
  progress({score:{cp:90},bestmove:'e7e5',lines:[]});
  assert.notEqual(v.positions[1].moveGrade,initial);
  assert.equal(v.positions[1].eval,null);
  a.state.liveToken++;done.resolve({score:{cp:300},bestmove:'e7e5',lines:[]});await pending;
  assert.equal(v.positions[1].searchPreview,null);assert.equal(v.positions[1].eval,null);
});
