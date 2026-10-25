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
