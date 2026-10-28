import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {JSDOM} from 'jsdom';

const rig = new URL('../data/coaches-anim/rigs/', import.meta.url);
const html = fs.readFileSync(new URL('old_soviet_rework_rig.html', rig), 'utf8');
const source = fs.readFileSync(new URL('old_soviet_rework_rig.js', rig), 'utf8');
const names = ['sip', 'ponder', 'whistle', 'chuckle', 'wink', 'doze'];

function portrait(t) {
  const dom = new JSDOM(html); t.after(() => dom.window.close());
  const document = dom.window.document, events = new Map(), timers = new Map();
  let now = 0, next = 0, queue = [], random = .5, onMotionChange;
  Object.defineProperty(document, 'hidden', {value:false, writable:true});
  const motion = {matches:false, addEventListener(_, fn) { onMotionChange = fn; }};
  const window = {matchMedia:() => motion, addEventListener:(name, fn) => events.set(name, fn)};
  const context = vm.createContext({document, window, performance:{now:() => now},
    requestAnimationFrame:fn => queue.push(fn),
    setTimeout(fn, delay) { const id = ++next; timers.set(id, {fn, delay, at:now + delay}); return id; },
    clearTimeout:id => timers.delete(id), setInterval() {}, clearInterval() {},
    Math:Object.assign(Object.create(Math), {random:() => random})});
  vm.runInContext(source, context);
  const advance = ms => {
    const end = now + ms;
    while (now < end) {
      now = Math.min(end, now + 1000 / 60);
      const frames = queue; queue = []; frames.forEach(fn => fn(now));
    }
  };
  const active = () => names.find(name => document.getElementById('c-' + name).classList.contains('on'));
  const node = id => document.getElementById(id);
  return {document, node, coach:window.coach, window, active, advance,
    send:coachCmd => events.get('message')({data:{coachCmd}}),
    reduced(value) { motion.matches = value; onMotionChange(); },
    hidden(value) { document.hidden = value; document.dispatchEvent(new dom.window.Event('visibilitychange')); },
    random(value) { random = value; },
    fireIdle() {
      const [id, timer] = [...timers].find(([, timer]) => timer.delay >= 22000);
      assert.ok(timer.delay <= 42000); timers.delete(id); now = timer.at; timer.fn();
    }};
}

for (const name of names) {
  test(`Soviet ${name} animates once and returns to the current review expression`, t => {
    const a = portrait(t);
    a.coach.setEmotion('skeptical'); a.advance(2000);
    const mouth = a.node('mouth').getAttribute('d');
    const lids = ['lidL', 'lidR'].map(id => a.node(id).getAttribute('transform'));
    a.node('c-' + name).click(); a.advance(900);
    assert.equal(a.active(), name);
    assert.notEqual(a.node('headrig').getAttribute('transform'), null);
    assert.equal(a.coach.sip(), false, 'one vignette owns the rig at a time');
    a.send('ambient'); a.advance(100);
    assert.equal(a.active(), name, 'parent idle ticks must let a vignette finish');
    a.advance(8000);
    assert.equal(a.active(), undefined);
    for (const id of ['headrig', 'torso', 'cuprig', 'moustache']) assert.equal(a.node(id).getAttribute('transform'), null);
    assert.equal(a.node('mouth').getAttribute('d'), mouth);
    assert.deepEqual(['lidL', 'lidR'].map(id => a.node(id).getAttribute('transform')), lids);
  });
}

test('Soviet doze closes both eyes then startles awake; sip lifts tea and chuckle moves shoulders and moustache', t => {
  const a = portrait(t);
  a.coach.doze(); a.advance(4000);
  assert.match(a.node('lidL').getAttribute('transform'), /scale\(1 1\.000\)/);
  assert.match(a.node('headrig').getAttribute('transform'), /translate\(0 1[789]/);
  a.advance(1100);
  assert.match(a.node('headrig').getAttribute('transform'), /translate\(0 -/);
  a.advance(3500); a.coach.sip(); a.advance(1600);
  assert.match(a.node('cuprig').getAttribute('transform'), /translate\(0 -82\.00\)/);
  a.advance(5000); a.coach.chuckle(); a.advance(800);
  assert.match(a.node('torso').getAttribute('transform'), /translate\(0 -[1-5]/);
  assert.match(a.node('moustache').getAttribute('transform'), /translate\(0 -/);
});

test('ordinary Soviet idle moments keep the head level, with only a small tilt for pondering and whistling', t => {
  const a = portrait(t);
  for (const name of ['sip', 'ponder', 'whistle', 'chuckle', 'wink']) {
    a.coach[name]();
    for (let i = 0; i < 48; i++) {
      a.advance(100);
      const transform = a.node('headrig').getAttribute('transform');
      if (!transform) continue;
      const [, y, angle] = transform.match(/translate\(0 ([\d.-]+)\) rotate\(([\d.-]+)/);
      assert.equal(Number(y), 0, `${name} should not bob the head`);
      assert.ok(Math.abs(Number(angle)) <= 1.5, `${name} only needs a subtle tilt`);
    }
  }
  a.coach.nod();
  const heights = [];
  for (let i = 0; i < 80; i++) {
    a.advance(10);
    heights.push(Number(a.node('headrig').getAttribute('transform').match(/translate\(0 ([\d.-]+)/)[1]));
  }
  assert.ok(heights.every(y => y >= 0 && y <= 4), 'a nod is one small dip');
  const peak = heights.indexOf(Math.max(...heights));
  assert.ok(heights.slice(0, peak).every((y, i) => y <= heights[i + 1]));
  assert.ok(heights.slice(peak).every((y, i) => i === 0 || y <= heights[peak + i - 1]));
});

test('review commands interrupt rare moments without stale transforms or expression overrides', t => {
  for (const command of ['nod', 'shake', 'shrug', 'eyeRoll', 'look', 'setEmotion', 'raiseCup', 'talk']) {
    const a = portrait(t);
    a.coach.doze(); a.advance(3000);
    a.coach[command](command === 'look' ? 'left' : command === 'setEmotion' ? 'angry' : true);
    assert.equal(a.active(), undefined, command);
    assert.equal(a.node('cuprig').getAttribute('transform'), null, command);
    a.advance(1000);
    assert.equal(a.node('headrig').getAttribute('transform'), null, 'the interrupted doze cannot restart');
    assert.equal(a.coach.wink(), false, 'brief cooldown protects a reaction or ongoing speech/prop');
  }
});

test('automatic rare moments are weighted, avoid repeats and yield to attention, speech, props and reduced motion', t => {
  const a = portrait(t);
  a.random(.999); a.fireIdle(); assert.equal(a.active(), 'doze');
  a.advance(7000); a.fireIdle(); assert.equal(a.active(), 'wink', 'doze is excluded from the next selection');
  a.advance(2000); a.random(0); a.fireIdle(); assert.equal(a.active(), 'sip', 'tea leads the common end of the distribution');
  a.advance(5000);
  a.window.coachPointerGaze = {x:1, y:0}; a.fireIdle(); assert.equal(a.active(), undefined);
  a.window.coachPointerGaze = null;
  a.coach.talk(true); a.fireIdle(); assert.equal(a.active(), undefined); a.coach.talk(false);
  a.coach.raiseCup(true); a.fireIdle(); assert.equal(a.active(), undefined); a.coach.raiseCup(false);
  a.reduced(true); a.fireIdle(); assert.equal(a.active(), undefined); assert.equal(a.coach.doze(), false);
  a.reduced(false); a.hidden(true); a.fireIdle(); assert.equal(a.active(), undefined);
  a.hidden(false); a.advance(2000); a.coach.doze(); a.advance(1000); a.hidden(true);
  assert.equal(a.active(), undefined); assert.equal(a.node('headrig').getAttribute('transform'), null);
  a.hidden(false); a.coach.sip(); a.advance(1000); a.reduced(true);
  assert.equal(a.active(), undefined); assert.equal(a.node('cuprig').getAttribute('transform'), null);
  a.reduced(false); a.coach.doze(); a.advance(1000);
  a.window.coachPointerGaze = {x:1, y:0}; a.advance(1000);
  assert.equal(a.active(), undefined, 'approaching the coach wakes him up');
  assert.equal(a.node('eyeL').getAttribute('transform'), 'translate(5.00 0.00)');
});
