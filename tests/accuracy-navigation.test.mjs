import test from 'node:test';
import assert from 'node:assert/strict';
import {app, loadGame} from './helpers/app.mjs';

function navigation(t) {
  const a = app(t); loadGame(a, '1. e4 e5 2. Nf3 Nc6');
  a.call('computeDerived'); a.call('buildUI'); a.call('renderAll');
  const rail = a.dom.window.document.querySelector('.acc-navigation');
  const surface = rail.querySelector('.acc-nav-current'), animations = [];
  let painted = {x: 4, width: 80, height: 30};
  Object.defineProperties(rail, {offsetWidth: {value: 250}, clientLeft: {value: 1}});
  rail.getBoundingClientRect = () => ({left: 100, width: 125});
  [...rail.querySelectorAll('button')].forEach((button, i) => Object.defineProperties(button, {
    offsetLeft: {value: 4 + i * 80}, offsetWidth: {value: 80}, offsetHeight: {value: 30},
  }));
  surface.getBoundingClientRect = () => ({left: 100 + (painted.x + 1) * .5, width: painted.width * .5, height: painted.height * .5});
  for (const layer of rail.querySelectorAll('.acc-nav-current,.acc-nav-wake')) layer.animate = (frames, options) => {
    const animation = {frames, options, cancelled: false, cancel() {this.cancelled = true;}};
    animations.push(animation); return animation;
  };
  a.call('renderStats');
  a.state.settings.moveAnim = true;
  return {a, rail, surface, animations, paint: value => {painted = value;}};
}

test('liquid reversals continue from the painted shape in a scaled panel and cancel old animations', t => {
  const {a, rail, animations, paint} = navigation(t);
  a.call('setAccuracyPage', 2);
  assert.equal(animations.length, 2);
  assert.equal(animations[0].frames[0].transform, 'translateX(4px) scale(1,1)');
  assert.equal(animations[0].frames.at(-1).transform, 'translateX(164px) scale(1,1)');
  assert.ok(animations[0].frames[12].transform.includes('scale('));
  assert.ok(animations[1].options.duration > animations[0].options.duration);
  paint({x: 78, width: 120, height: 25});
  a.call('setAccuracyPage', 0);
  assert.equal(animations[0].cancelled, true); assert.equal(animations[1].cancelled, true);
  assert.equal(animations[2].frames[0].transform, 'translateX(78px) scale(1.5,0.8333333333333334)');
  assert.equal(animations[2].frames.at(-1).transform, 'translateX(4px) scale(1,1)');
  assert.equal(rail.querySelectorAll('[aria-selected="true"]').length, 1);
  const count = animations.length;
  a.call('renderStats'); assert.equal(animations.length, count, 'Result updates do not restart the flow');
});

test('disabled and reduced motion settle selection immediately and cancel any previous flow', t => {
  const {a, surface, animations} = navigation(t);
  a.call('setAccuracyPage', 2);
  a.state.settings.moveAnim = false; a.call('setAccuracyPage', 1);
  assert.equal(animations.length, 2); assert.ok(animations.every(item => item.cancelled));
  assert.equal(surface.style.transform, 'translateX(84px) scale(1,1)');
  a.state.settings.moveAnim = true; a.dom.window.matchMedia = () => ({matches: true});
  a.call('setAccuracyPage', 0);
  assert.equal(animations.length, 2);
  assert.equal(surface.style.transform, 'translateX(4px) scale(1,1)');
});

test('page turns animate the results while player names remain outside the incoming animation', t => {
  const {a} = navigation(t), animated = [];
  a.dom.window.HTMLElement.prototype.animate = function(frames, options) {
    const animation = {cancel() {}};
    animated.push({node: this, frames, options, animation});
    return animation;
  };
  for (const page of [1, 2, 0, 2, 1]) {
    animated.length = 0;
    a.call('setAccuracyPage', page);
    const incoming = a.dom.window.document.querySelector('.acc-page:not(.acc-turn-leaf)');
    const names = incoming.querySelector('.acc-players');
    const turns = animated.filter(item => item.options.duration === 280);
    assert.ok(turns.length);
    assert.ok(turns.every(item => !item.node.contains(names)));
    assert.equal(incoming.querySelector('.acc-players .acc-reveal-slot'), null);
    const outgoing = animated.find(item => item.node.classList.contains('acc-turn-leaf'));
    assert.ok(outgoing);
    outgoing.animation.onfinish();
    assert.equal(outgoing.node.isConnected, false);
  }
});
