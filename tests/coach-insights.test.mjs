import test from 'node:test';
import assert from 'node:assert/strict';
import {coachInsights, playerText} from '../lib/coach-insights.js';
import {ConceptSession, conceptKey} from '../lib/concepts/session.js';
import {analyzeConcepts} from '../lib/concepts/analyze.js';
import fs from 'node:fs/promises';
import {app, loadGame, branch} from './helpers/app.mjs';

const finding = (event, text, extra = {}) => ({event, name: event, text, kind: 'Factual observation', scopes: [{occurrence: 'C-test', scope: 'Exact test scope'}], ...extra});

test('coach ranks every match stably without turning factual structure into an advantage', () => {
  const findings = [finding('material-inventory', 'Inventory'), finding('pawn-chain', 'Pawn chain'),
    finding('fork', 'Your knight forks two targets.'), finding('checkmate', 'Checkmate'),
    finding('fork', 'A second matched name', {name: 'Knight fork'}), finding('pawn-chain', 'Another chain')];
  const before = structuredClone(findings);
  const result = coachInsights(findings, {mover: 'w', player: 'w'});
  assert.deepEqual(result.map(f => f.text), ['Checkmate', 'Your knight forks two targets.', 'A second matched name', 'Pawn chain', 'Another chain', 'Inventory']);
  assert.equal(result.length, findings.length); assert.deepEqual(findings, before);
  assert.equal(result.find(f => f.event === 'pawn-chain').perspective, 'Your move');
  assert.equal(result.find(f => f.event === 'pawn-chain').kind, 'Factual observation');
});

test('opponent wording swaps both sides, possessives, verb agreement and bounded conditions', () => {
  const text = 'You have more pawns, and your opponent has fewer. Your rook attacks the enemy king. If your opponent captures, you recapture.';
  assert.equal(playerText(text, 'b', 'b'), text);
  assert.equal(playerText(text, 'w', 'b'), 'They have more pawns, and you have fewer. Their rook attacks your king. If you capture, they recapture.');
  assert.equal(playerText('For you and for your opponent. Your rook reaches the opponent’s second rank.', 'w', 'b'), 'For them and for you. Their rook reaches your second rank.');
  assert.equal(playerText('You had mate in two; this move does not force mate within two.', 'w', 'b'), 'They had mate in two; this move does not force mate within two.');
  assert.equal(playerText('Stalemate resource: Rxe4 would leave you with no legal move and no check.', 'w', 'b'), 'Stalemate resource: Rxe4 would leave them with no legal move and no check.');
});

test('overload identifies the defended side and keeps the benefit conditional for either player', () => {
  const f = finding('overloaded-defender', 'Overloaded rook e7: if ...Rxe7, Qxd7 wins material through the next reply.',
    {context: {defender: {color: 'w', type: 'r', square: 'e7'}}});
  const attack = coachInsights([f], {mover: 'b', player: 'b'})[0];
  assert.equal(attack.perspective, 'Conditional opportunity for you');
  assert.match(attack.text, /^Your opponent’s rook on e7 is overloaded: if /);
  const risk = coachInsights([f], {mover: 'b', player: 'w'})[0];
  assert.equal(risk.perspective, 'Conditional risk for you');
  assert.match(risk.text, /^Your rook on e7 is overloaded: if /);
  assert.equal(risk.sourceText, f.text);
  assert.equal(risk.scopes, f.scopes);
});

test('accepted overload retains actual defender ownership without copying search trees', async () => {
  const {verified} = JSON.parse(await fs.readFile(new URL('../lib/concepts/provenance.json', import.meta.url)));
  // Authored legal geometry: d7 defends d5 and b7; accepting Bxd5 vacates b7.
  const result = analyzeConcepts({fen: '7k/1n1r4/8/3n4/8/5B2/8/KR6 w - - 0 1', move: 'f3d5'}, verified);
  assert.deepEqual(result.errors, []);
  const f = result.findings.find(f => f.event === 'overloaded-defender');
  assert.ok(f); assert.deepEqual(f.context, {mover: 'w', defender: {color: 'b', type: 'r', square: 'd7'}});
  assert.equal(f.context.branches, undefined);
  assert.match(coachInsights([f], {mover: 'w', player: 'b'})[0].text, /^Your rook on d7 is overloaded: if /);
});

test('Coach follows the selected move, discards stale messages, keeps all matches and shares analysis', t => {
  const a = app(t), S = loadGame(a, '1. e4 e5 2. Nf3');
  a.call('computeDerived'); a.call('buildUI'); a.call('renderEngineCurrent');
  const document = a.dom.window.document;
  assert.equal(document.querySelector('#position-tab-engine').getAttribute('aria-selected'), 'true');
  document.querySelector('#position-tab-coach').click();
  assert.ok(document.querySelector('#coachEnable'));
  assert.equal(a.run('_conceptSession'), null);
  let workers = 0, terminated = 0;
  const session = new ConceptSession({worker: () => {workers++; return {postMessage() {}, terminate() {terminated++;}};}});
  t.after(() => session.stop());
  a.context.__session = session; a.run('_conceptSession = __session');
  document.querySelector('#coachEnable').click();
  assert.equal(workers, 1); assert.ok(S.settings.conceptsEnabled);
  a.call('go', 3);
  const input = a.call('selectedConceptInput'), key = conceptKey(input);
  const matches = [finding('material-inventory', 'Only this move inventory'), finding('development', 'Your knight developed.'), finding('fork', 'Your knight forks two pieces.')];
  session.entries.set(key, {status: 'complete', findings: matches, issues: [], unavailable: [], errors: [], timeMs: 5});
  a.call('renderCoachPanel');
  assert.match(document.querySelector('.coach-position').textContent, /Your Nf3/);
  a.call('toggleSettings');
  document.querySelectorAll('.set-tab')[2].click();
  assert.match(document.querySelector('.concepts-findings').textContent, /Only this move inventory/);
  assert.deepEqual([...document.querySelectorAll('.coach-insight')].map(n => n.dataset.concept), ['fork', 'development', 'material-inventory']);
  const body = document.querySelector('.coach-insights-body'); body.scrollTop = 55;
  document.querySelector('.coach-insight details').open = true;
  a.call('renderCoachPanel');
  assert.equal(document.querySelector('.coach-insights-body').scrollTop, 55);
  assert.ok(document.querySelector('.coach-insight details').open);
  const scores = JSON.stringify([S.evals, S.classif, S.moveGrades]);
  S.flipped = true; a.call('renderCoachPanel');
  assert.match(document.querySelector('.coach-position').textContent, /Playing White/);
  S.meSide = 'b'; a.call('renderCoachPanel');
  assert.match(document.querySelector('.coach-position').textContent, /Playing Black.*Opponent’s Nf3/);
  assert.match(document.querySelector('.coach-insight > p').textContent, /Their knight/);
  a.call('go', 2);
  assert.doesNotMatch(document.querySelector('.coach-insights-body').textContent, /Only this move inventory|knight developed/);
  assert.doesNotMatch(document.querySelector('.concepts-panel').textContent, /Only this move inventory/);
  assert.equal(document.querySelector('.coach-insights-body').scrollTop, 0);
  // A late completion for the previous move must not repaint that move's messages.
  session.entries.get(key).findings.push(finding('check', 'Stale check'));
  a.call('renderCoachPanel'); assert.doesNotMatch(document.querySelector('.coach-insights-body').textContent, /Stale check/);
  branch(a, 1, 1); a.call('renderReview');
  assert.match(document.querySelector('.coach-position').textContent, /Variation/);
  S.practice = {solving: true}; a.call('renderCoachPanel');
  assert.equal(document.querySelectorAll('.coach-insight').length, 0);
  assert.match(document.querySelector('.coach-insights-body').textContent, /practice coach/);
  S.practice = null; S.analysisMode = false; S.variation = null;
  a.call('setConceptEnabled', false); a.call('renderCoachPanel');
  assert.ok(terminated); assert.equal(session.enabled, false);
  document.querySelector('#position-tab-engine').click();
  assert.ok(document.querySelector('.engine-body'));
  assert.equal(JSON.stringify([S.evals, S.classif, S.moveGrades]), scores);
});
