import test from 'node:test';
import assert from 'node:assert/strict';
import { app, loadGame, settle } from './helpers/app.mjs';

function coachUI(a) {
  a.run(`UI = {
    canvas: document.createElement('div'),
    coach: document.createElement('div'),
  }; const mod = document.createElement('div'); mod.className = 'mod';
  mod.append(UI.coach); UI.canvas.append(mod);`);
  return a.run('UI');
}

function animationClock(a) {
  let now = 0, next = 0;
  const timers = new Map();
  a.context.performance = {now: () => now};
  a.context.setTimeout = (fn, delay) => { const id = ++next; timers.set(id, {fn, at:now + delay}); return id; };
  a.context.clearTimeout = id => timers.delete(id);
  return ms => {
    const end = now + ms;
    while (true) {
      const entry = [...timers].filter(([, timer]) => timer.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
      if (!entry) break;
      const [id, timer] = entry; timers.delete(id); now = timer.at; timer.fn();
    }
    now = end;
  };
}

function mountedCoach(a, ui, id = 'old_soviet') {
  a.state.settings.coach = id;
  a.call('renderCoachAvatar');
  const frame = ui.coach.querySelector('iframe'), messages = [];
  Object.defineProperty(frame, 'contentWindow', {value:{postMessage: message => messages.push(message)}});
  frame.dispatchEvent(new a.dom.window.Event('load'));
  return {frame, messages};
}

test('No coach removes the character, saves the choice and keeps plain commentary', async t => {
  const a = app(t), S = loadGame(a, '1. e4 e5'), ui = coachUI(a);
  S.settings.coach = 'old_soviet'; S.settings.coachPlain = false;
  S.idx = 1; S.classif[1] = 'inacc'; S.coach = {move_quality:{inacc:['A special reply.']}};
  a.replace('renderReview', () => {});
  a.call('renderCoachAvatar');
  assert.ok(ui.coach.querySelector('iframe'));
  const picker = a.call('coachPicker');
  const off = [...picker.querySelectorAll('.lib-dd-opt')].find(b => b.textContent === 'No coach');
  assert.ok(off);
  assert.equal(off.querySelector('img'), null);
  off.click(); await settle();
  assert.equal(a.store.settings.coach, '');
  assert.equal(S.coach, null);
  assert.equal(ui.coach.childElementCount, 0);
  assert.equal(ui.coach.closest('.mod').hidden, true);
  assert.equal(ui.canvas.classList.contains('has-coach'), false);
  assert.equal(a.call('coachPicker').querySelector('.lib-dd-cur').textContent, 'No coach');
  const comment = a.call('renderMoveComment');
  assert.equal(comment.querySelector('.ip-move').textContent, 'e4');
  assert.ok(comment.querySelector('.ip-text').textContent.length > 0);
  a.replace('loadCoach', async () => ({restored:true}));
  await a.call('setCoach', 'mentor');
  assert.equal(a.store.settings.coach, 'mentor');
  assert.ok(ui.coach.querySelector('iframe').src.endsWith('animated_mentor_rig.html'));
  assert.equal(ui.coach.closest('.mod').hidden, false);
  assert.equal(ui.canvas.classList.contains('has-coach'), true);
  assert.equal(S.coach.restored, true);
});

test('rapid move navigation reacts only to the final move and holds each expression', t => {
  const a = app(t), ui = coachUI(a), advance = animationClock(a);
  const S = loadGame(a, '1. e4 e5 2. Nf3 Nc6');
  S.classif = [null, 'brilliant', 'mistake', 'blunder', 'good'];
  const {messages} = mountedCoach(a, ui);
  const visit = idx => { S.idx = idx; a.call('coachReactPly', idx); };
  const emotions = () => messages.filter(m => m.coachCmd === 'emotion').map(m => m.value);
  for (const idx of [1, 2, 3]) { visit(idx); advance(80); }
  visit(4); advance(249);
  assert.deepEqual(emotions(), []);
  assert.equal(messages.some(m => ['nod', 'shake', 'eyeRoll', 'raise'].includes(m.coachCmd)), false);
  advance(1);
  assert.deepEqual(emotions(), ['happy']);
  advance(100); visit(3); advance(250);
  assert.deepEqual(emotions(), ['happy'], 'a settled move must still respect the minimum hold');
  visit(2); advance(849);
  assert.deepEqual(emotions(), ['happy']);
  advance(1);
  assert.deepEqual(emotions(), ['happy', 'sad']);
  advance(2000);
  assert.deepEqual(emotions(), ['happy', 'sad'], 'skipped expressions are never replayed');
  visit(0); advance(250);
  assert.deepEqual(emotions(), ['happy', 'sad', 'neutral']);
});

test('ordinary move navigation still reacts, without restarting identical expressions', t => {
  const a = app(t), ui = coachUI(a), advance = animationClock(a);
  const S = loadGame(a, '1. e4 e5 2. Nf3');
  S.classif = [null, 'best', 'excellent', 'blunder'];
  const {messages} = mountedCoach(a, ui);
  for (const idx of [1, 2, 3]) {
    S.idx = idx; a.call('coachReactPly', idx); advance(1500);
  }
  assert.deepEqual(messages.filter(m => m.coachCmd === 'emotion').map(m => m.value), ['happy', 'angry']);
  assert.equal(messages.filter(m => m.coachCmd === 'look' && m.value === 'downleft').length, 3);
  assert.ok(messages.some(m => m.coachCmd === 'nod'));
  assert.ok(messages.some(m => ['shake', 'eyeRoll'].includes(m.coachCmd)));
});

test('removing or switching coaches cancels pending reactions and old prop timers', t => {
  const a = app(t), ui = coachUI(a), advance = animationClock(a);
  const S = loadGame(a, '1. e4 e5');
  S.idx = 1; S.classif[1] = 'brilliant';
  const old = mountedCoach(a, ui, 'professor');
  advance(250); // Raise the professor's book; its lowering timer is now pending.
  S.idx = 2; S.classif[2] = 'blunder'; a.call('coachReactPly', 2);
  S.settings.coach = ''; a.call('renderCoachAvatar');
  const oldCount = old.messages.length;
  old.frame.dispatchEvent(new a.dom.window.Event('load'));
  assert.equal(a.run('_coachReady'), false, 'a removed iframe cannot become active again');
  const replacement = mountedCoach(a, ui, 'mentor');
  S.idx = 0; a.call('coachReactPly', 0);
  advance(250);
  assert.deepEqual(replacement.messages.filter(m => m.coachCmd === 'emotion').map(m => m.value), ['neutral']);
  advance(2350);
  assert.equal(old.messages.length, oldCount);
  assert.equal(replacement.messages.some(m => m.coachCmd === 'raise'), false, 'old prop timers cannot target the new rig');
  assert.equal(replacement.messages.some(m => m.coachCmd === 'emotion' && m.value === 'angry'), false);
  // A direct switch must also clear pending reactions, even without going through No coach.
  S.idx = 2; a.call('coachReactPly', 2);
  const third = mountedCoach(a, ui, 'wise_grandma');
  S.idx = 0; a.call('coachReactPly', 0); advance(1500);
  assert.deepEqual(third.messages.filter(m => m.coachCmd === 'emotion').map(m => m.value), ['neutral']);
});

test('a prop gesture finishes before the same prop can be raised again', t => {
  const a = app(t), ui = coachUI(a), advance = animationClock(a);
  const {messages} = mountedCoach(a, ui, 'professor');
  a.call('coachSpecial'); advance(1200); a.call('coachSpecial');
  assert.equal(messages.filter(m => m.coachCmd === 'raise').length, 1);
  advance(1200);
  assert.equal(messages.filter(m => m.coachCmd === 'raise').length, 2);
  a.call('coachSpecial');
  assert.equal(messages.filter(m => m.coachCmd === 'raise').length, 3);
});
