import test from 'node:test';
import assert from 'node:assert/strict';
import {app,loadGame} from './helpers/app.mjs';

function review(t) {
  const a=app(t);loadGame(a,'1. e4 e5 2. Nf3 Nc6');
  a.call('computeDerived');a.call('buildUI');a.call('renderAll');
  return a;
}

test('Phase report 2 is a separate saved option and does not replace Phase report',async t=>{
  const a=review(t),doc=a.dom.window.document;
  const designs=a.run("PANEL_DESIGNS.find(d=>d.panel==='accuracy').versions");
  assert.ok(designs.some(d=>d.id==='phases'&&d.label==='Phase report'));
  assert.ok(designs.some(d=>d.id==='phases2'&&d.label==='Phase report 2'));
  assert.equal(a.state.settings.accuracyDesign,'phases');
  await a.call('setSetting','accuracyDesign','phases2');
  assert.equal(a.store.settings.accuracyDesign,'phases2');
  assert.ok(doc.querySelector('.phase2-players'));
  assert.deepEqual([...doc.querySelector('.phase2-players').children].map(n=>n.textContent),['','White','Black']);
  a.call('setAccuracyPage',1);
  assert.equal(doc.querySelector('.accuracy-phase-report-2,.phase2-players'),null);
  a.call('setAccuracyPage',0);
  assert.ok(doc.querySelector('.accuracy-phase-report-2'));
  await a.call('setSetting','accuracyDesign','phases');
  assert.equal(doc.querySelector('.phase2-overall'),null);
  assert.ok(doc.querySelector('.phase-report-cells'));
});

test('the comparison grid keeps phase colors and places estimated rating last without extra labels',async t=>{
  const a=review(t),doc=a.dom.window.document;
  a.state.gameStats.w.phases.middlegame.accuracy=43.8;
  a.state.gameStats.b.phases.middlegame.accuracy=82.3;
  await a.call('setSetting','accuracyDesign','phases2');
  const middle=doc.querySelector('[data-phase="middlegame"]');
  assert.deepEqual([...middle.children].map(n=>n.textContent),['Middlegame','43.8','82.3']);
  const left=middle.querySelector('.phase-report-cell');
  assert.equal(left.style.getPropertyValue('--phase-color'),'var(--q-blunder)');
  assert.match(left.getAttribute('aria-label'),/White, Middlegame.*Blunder/);
  assert.equal(left.querySelector('.phase-category'),null);
  const panel=doc.querySelector('.phase-overview-2');
  assert.equal(panel.lastElementChild.classList.contains('phase2-rating'),true);
  assert.equal(panel.lastElementChild.querySelector('.acc-elo-label').textContent,'Estimated rating');
  assert.equal(doc.querySelectorAll('.phase2-row .phase-report-cell').length,6);
  assert.equal(doc.querySelector('.accuracy-panel .panel-head,.accuracy-panel .acc-note'),null);
});

test('switching versions preserves scores, review position, animation preferences and panel layout',async t=>{
  const a=review(t);
  const before=JSON.stringify({acc:a.state.acc,stats:a.state.gameStats,idx:a.state.idx,layout:a.state.layout,evals:a.state.evals,motion:a.state.settings.moveAnim});
  for(const design of ['phases2','phases','phases2'])await a.call('setSetting','accuracyDesign',design);
  assert.equal(JSON.stringify({acc:a.state.acc,stats:a.state.gameStats,idx:a.state.idx,layout:a.state.layout,evals:a.state.evals,motion:a.state.settings.moveAnim}),before);
  a.state.gameStats.w.phases.endgame.accuracy=null;a.call('renderStats');
  const empty=a.dom.window.document.querySelector('[data-phase="endgame"] .phase-report-cell');
  assert.ok(empty.classList.contains('unavailable'));assert.equal(empty.textContent,'—');
  a.state.analyzing=true;a.call('renderStats');
  assert.ok([...a.dom.window.document.querySelectorAll('.phase-report-score')].every(n=>n.textContent==='···'));
});
