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
  const {messages} = mountedCoach(a, ui, 'mentor');
  for (const idx of [1, 2, 3]) {
    S.idx = idx; a.call('coachReactPly', idx); advance(1500);
  }
  assert.deepEqual(messages.filter(m => m.coachCmd === 'emotion').map(m => m.value), ['happy', 'angry']);
  assert.equal(messages.filter(m => m.coachCmd === 'look' && m.value === 'downleft').length, 3);
  assert.ok(messages.some(m => m.coachCmd === 'nod'));
  assert.ok(messages.some(m => ['shake', 'eyeRoll'].includes(m.coachCmd)));
});

test('Soviet move reactions use restrained, mutually exclusive action percentages', t => {
  const a = app(t), ui = coachUI(a); animationClock(a); loadGame(a, '1. e4 e5');
  const {messages} = mountedCoach(a, ui);
  a.run('Math.random = () => __random');
  let now = 0, tea = 0;
  a.context.performance = {now:() => now};
  a.replace('coachSipCup', chance => { assert.equal(chance, 1); tea++; });
  for (const [classes, expected] of [
    [['brilliant', 'great'], {nod:35, tea:15, quiet:50}],
    [['best', 'excellent'], {nod:18, tea:10, quiet:72}],
    [['good', 'book'], {tea:5, quiet:95}],
    [['inacc', 'mistake', 'miss'], {shake:12, eyeRoll:28, quiet:60}],
    [['blunder'], {shake:25, eyeRoll:30, quiet:45}],
  ]) {
    for (const cls of classes) {
      const counts = {};
      for (let i = 0; i < 100; i++) {
        now += 8000; tea = 0; messages.length = 0; a.context.__random = (i + .5) / 100;
        a.call('coachSovietReaction', cls);
        assert.ok(messages.length + tea <= 1, 'a reaction cannot stack a nod with tea');
        const action = tea ? 'tea' : messages[0]?.coachCmd || 'quiet';
        counts[action] = (counts[action] || 0) + 1;
      }
      assert.deepEqual(counts, expected, cls);
    }
  }
});

test('Soviet nods and shakes share an eight-second pause while expressions and eye reactions still respond', t => {
  const a = app(t), ui = coachUI(a), advance = animationClock(a);
  const S = loadGame(a, '1. e4 e5 2. Nf3 Nc6');
  S.classif = [null, 'best', 'excellent', 'blunder', 'mistake'];
  const {messages} = mountedCoach(a, ui);
  a.run('Math.random = () => 0.1');
  for (const idx of [1, 2, 3]) { S.idx = idx; a.call('coachReactPly', idx); advance(1500); }
  assert.deepEqual(messages.filter(m => ['nod', 'shake'].includes(m.coachCmd)).map(m => m.coachCmd), ['nod']);
  assert.deepEqual(messages.filter(m => m.coachCmd === 'emotion').map(m => m.value), ['happy', 'angry']);
  a.run('Math.random = () => 0.2');
  S.idx = 4; a.call('coachReactPly', 4); advance(1500);
  assert.ok(messages.some(m => m.coachCmd === 'eyeRoll'), 'eyes still react during the head cooldown');
  advance(3000); a.run('Math.random = () => 0.1');
  S.idx = 3; a.call('coachReactPly', 3); advance(1500);
  assert.equal(messages.filter(m => m.coachCmd === 'shake').length, 1);
  mountedCoach(a, ui, 'mentor'); mountedCoach(a, ui);
  messages.length = 0;
  const resetAt = a.run('_coachSovietHeadAt');
  assert.equal(resetAt, -Infinity, 'changing coaches resets the gesture pause');
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

test('Soviet idle ticks delegate to the rig so longer rare animations can finish', t => {
  const a = app(t), ui = coachUI(a), advance = animationClock(a);
  loadGame(a, '1. e4 e5');
  const {messages} = mountedCoach(a, ui);
  advance(2000); messages.length = 0; advance(20000);
  assert.ok(messages.some(m => m.coachCmd === 'ambient'));
  assert.equal(messages.some(m => ['look', 'nod', 'shrug', 'raise', 'eyeRoll'].includes(m.coachCmd)), false);
});

test('nearby cursor tracking is coalesced, scaled and cleared on leave or coach changes', t => {
  const a = app(t), ui = coachUI(a); animationClock(a);
  loadGame(a, '1. e4 e5');
  let next = 0; const paints = new Map();
  a.context.requestAnimationFrame = fn => { const id = ++next; paints.set(id, fn); return id; };
  a.context.cancelAnimationFrame = id => paints.delete(id);
  const paint = () => { const pending = [...paints.values()]; paints.clear(); pending.forEach(fn => fn()); };
  const move = (x, y, type = 'mouse') => {
    const event = new a.dom.window.MouseEvent('pointermove', {clientX:x, clientY:y});
    Object.defineProperty(event, 'pointerType', {value:type});
    a.dom.window.document.dispatchEvent(event);
  };
  const {frame, messages} = mountedCoach(a, ui);
  frame.getBoundingClientRect = () => ({left:500, top:200, right:700, bottom:500, width:200, height:300});
  const pointerMessages = () => messages.filter(m => m.coachCmd === 'pointer');
  move(50, 50); paint(); assert.equal(pointerMessages().length, 0);
  move(550, 230); move(650, 260);
  assert.equal(paints.size, 1); paint();
  assert.deepEqual(JSON.parse(JSON.stringify(pointerMessages().at(-1).value)), {x:0.75,y:0.2});
  move(750, 350); paint();
  assert.equal(pointerMessages().at(-1).value.x, 1.25, 'vicinity extends beyond the portrait');
  move(850, 350); paint(); assert.equal(pointerMessages().at(-1).value, null);
  move(600, 300, 'touch'); paint(); assert.equal(a.run('_coachPointerActive'), false);
  move(600, 300); paint();
  a.dom.window.dispatchEvent(new a.dom.window.Event('blur'));
  assert.equal(pointerMessages().at(-1).value, null);
  move(600, 300); paint();
  a.dom.window.document.dispatchEvent(new a.dom.window.Event('pointerleave'));
  assert.equal(a.run('_coachPointerActive'), false);
  move(600, 300); paint(); move(620, 300);
  const replacement = mountedCoach(a, ui, 'mentor');
  assert.equal(paints.size, 0, 'switching cancels pending pointer messages');
  assert.equal(pointerMessages().at(-1).value, null);
  assert.equal(replacement.messages.some(m => m.coachCmd === 'pointer'), false);
  a.state.settings.coach = ''; a.call('renderCoachAvatar');
  move(600, 300); assert.equal(paints.size, 0);
});

test('pressing the painted coach shakes once and consumes the click; empty space and reorganizing pass through', t => {
  const a = app(t), ui = coachUI(a); animationClock(a); loadGame(a, '1. e4 e5');
  const {frame, messages} = mountedCoach(a, ui);
  frame.getBoundingClientRect = () => ({left:400, top:100, right:550, bottom:300, width:150, height:200});
  Object.defineProperties(frame, {clientWidth:{value:300},clientHeight:{value:400}});
  let covered = false;
  a.dom.window.document.elementFromPoint = () => covered ? ui.canvas : frame;
  const figure = a.dom.window.document.createElement('div'); figure.id = 'figure';
  const path = a.dom.window.document.createElement('span'); figure.append(path);
  const hits = [], child = {elementFromPoint(x, y) { hits.push([x,y]); return x > 80 && x < 220 ? path : null; }};
  Object.defineProperty(frame, 'contentDocument', {value:child});
  let beneath = 0;
  for (const name of ['pointerdown','pointerup','click']) a.dom.window.document.addEventListener(name, () => beneath++);
  const event = (name, x, button = 0) => {
    const ev = new a.dom.window.MouseEvent(name, {clientX:x,clientY:160,button,bubbles:true,cancelable:true});
    Object.defineProperty(ev, 'pointerId', {value:1});
    a.dom.window.document.dispatchEvent(ev); return ev;
  };
  assert.equal(event('pointerdown', 475).defaultPrevented, true);
  assert.deepEqual(hits.at(-1), [150,120], 'hit testing accounts for portrait scale');
  assert.equal(event('pointerup', 475).defaultPrevented, true);
  assert.equal(event('click', 475).defaultPrevented, true);
  assert.equal(beneath, 0, 'pressing the coach cannot activate a control behind him');
  assert.equal(messages.filter(m => m.coachCmd === 'shake').length, 1);
  assert.equal(frame.style.pointerEvents, '', 'hit testing restores click-through behavior');
  event('pointerdown', 405); event('pointerup', 405); event('click', 405);
  assert.equal(beneath, 3, 'transparent parts of the portrait preserve underlying controls');
  a.state.reorganize = true;
  event('pointerdown', 475); event('pointerup', 475); event('click', 475);
  assert.equal(beneath, 6, 'layout editing keeps its normal drag interaction');
  a.state.reorganize = false;
  event('pointerdown', 475, 2);
  assert.equal(messages.filter(m => m.coachCmd === 'shake').length, 1, 'right clicks do not shake');
  event('pointerdown', 475); event('pointercancel', 475); event('click', 405);
  assert.equal(beneath, 8, 'cancelled touches cannot swallow a later unrelated click');
  covered = true;
  const shakes = messages.filter(m => m.coachCmd === 'shake').length;
  event('pointerdown', 475); event('pointerup', 475); event('click', 475);
  assert.equal(beneath, 11, 'a settings panel over the coach receives normal input');
  assert.equal(messages.filter(m => m.coachCmd === 'shake').length, shakes);
  assert.equal(frame.style.pointerEvents, '');
});
