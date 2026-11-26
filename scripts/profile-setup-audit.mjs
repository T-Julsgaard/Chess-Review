import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

// node scripts/learning-browser.mjs --working-tree --profile-setup
export async function auditLearning({review, call, evaluate, sleep, out}) {
  const run = code => evaluate(review, code), evidence = [];
  await sleep(400);
  await run("document.querySelector('.learning-announcement')&&document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))");
  for (const [width, height] of [[1920, 1080], [1366, 768], [800, 900], [600, 800], [360, 800]]) {
    await call('Emulation.setDeviceMetricsOverride', {width, height, deviceScaleFactor: 1, mobile: false}, review.sessionId);
    await run(`import('./analysis.js').then(async m => {
      m.S.settings.uiAnim = true; await m.openProfile();
      const w = m.profileWorkspace; w.site = 'chesscom'; w.period = 'year';
      w.accounts = {chesscom: 'tester', lichess: 'tester-li'}; w.renderSetup({focus: false});
    })`);
    await sleep(850);
    const layout = await run(`(() => {
      const host = document.querySelector('.profile-slide-host'), form = host.querySelector('form');
      const rect = node => node.getBoundingClientRect();
      const center = node => rect(node).left + rect(node).width / 2;
      const card = form.querySelector('.profile-setup-card'), intro = form.querySelector('.profile-setup-intro');
      return {centerOffset: center(form) - center(host), introOffset: center(intro) - center(card),
        textAlign: getComputedStyle(intro).textAlign, buttonWidth: rect(form.querySelector('.profile-build')).width,
        actionsWidth: rect(form.querySelector('.profile-setup-actions')).width,
        overflow: host.scrollWidth - host.clientWidth, verticalOverflow: host.scrollHeight - host.clientHeight};
    })()`);
    assert.ok(Math.abs(layout.centerOffset) < 2, `${width}: form centered in the panel`);
    assert.ok(Math.abs(layout.introOffset) < 2, `${width}: heading aligned with the form card`);
    assert.equal(layout.textAlign, 'center');
    assert.ok(Math.abs(layout.buttonWidth - layout.actionsWidth) < 2, `${width}: full-width primary action`);
    assert.ok(layout.overflow <= 1, `${width}: setup has no horizontal overflow`);
    if (width >= 1000) assert.ok(layout.verticalOverflow <= 1, `${width}: default setup fits without scrolling`);
    evidence.push({width, height, layout});
    const initial = await call('Page.captureScreenshot', {format: 'png'}, review.sessionId);
    await fs.writeFile(path.join(out, `profile-setup-default-${width}x${height}.png`), Buffer.from(initial.data, 'base64'));
    for (const label of ['Both', 'Custom period', 'Chess.com', 'Past 12 months']) {
      const moving = await run(`(() => {
        const form = document.querySelector('.profile-setup'), actions = form.querySelector('.profile-setup-actions');
        const before = actions.getBoundingClientRect().top;
        [...form.querySelectorAll('[role=radio]')].find(b => b.textContent === ${JSON.stringify(label)}).click();
        return {before, first: actions.getBoundingClientRect().top,
          animations: form.getAnimations({subtree: true}).length};
      })()`);
      assert.ok(moving.animations > 0, `${width}: ${label} moves the layout`);
      assert.ok(Math.abs(moving.before - moving.first) < 2, `${width}: ${label} starts at its previous position: ${JSON.stringify(moving)}`);
      await run("import('./analysis.js').then(m => m.profileWorkspace.setupMotion.finished)");
      // The date range folds on its own timeline, separately from the site layout.
      await sleep(400);
      const settled = await run(`(() => {
        const host = document.querySelector('.profile-slide-host'), form = host.querySelector('form');
        return {top: form.querySelector('.profile-setup-actions').getBoundingClientRect().top,
          overflow: host.scrollWidth - host.clientWidth,
          custom: !form.querySelector('.profile-custom-period').hidden,
          names: form.querySelectorAll('input[type=text]').length};
      })()`);
      if (label === 'Custom period' || label === 'Past 12 months')
        assert.ok(Math.abs(moving.before - settled.top) > 2, `${width}: ${label} reaches a different position`);
      assert.ok(settled.overflow <= 1, `${width}: no horizontal overflow: ${settled.overflow}`);
      if (label === 'Both') assert.equal(settled.names, 2);
      if (label === 'Custom period') {
        assert.equal(settled.custom, true);
        await run(`(() => {
          const host = document.querySelector('.profile-slide-host'), panel = host.querySelector('.profile-custom-period');
          if (panel.getBoundingClientRect().bottom > host.getBoundingClientRect().bottom)
            host.scrollTop += panel.getBoundingClientRect().top - host.getBoundingClientRect().top - 12;
        })()`);
        const shot = await call('Page.captureScreenshot', {format: 'png'}, review.sessionId);
        await fs.writeFile(path.join(out, `profile-setup-${width}x${height}.png`), Buffer.from(shot.data, 'base64'));
        await run("document.querySelector('.profile-slide-host').scrollTop = 0");
      }
      evidence.push({width, height, label, moving, settled});
    }
    const rapid = await run(`import('./analysis.js').then(async m => {
      const form = document.querySelector('.profile-setup');
      const choose = text => [...form.querySelectorAll('[role=radio]')].find(b => b.textContent === text).click();
      const input = form.querySelector('input[type=text]'); input.value = 'typed-name'; input.dispatchEvent(new Event('input'));
      for (let i = 0; i < 4; i++) { choose('Both'); choose('Chess.com'); choose('Custom period'); choose('This year'); }
      await m.profileWorkspace.setupMotion.finished;
      return {sameInput: input === form.querySelector('input[type=text]'), value: input.value,
        animations: form.getAnimations({subtree: true}).filter(a => a.effect.getKeyframes().some(k => k.translate)).length};
    })`);
    assert.equal(rapid.sameInput, true); assert.equal(rapid.value, 'typed-name'); assert.equal(rapid.animations, 0);
    await run("import('./analysis.js').then(m => m.profileWorkspace.close())");
  }
  await call('Emulation.setEmulatedMedia', {features: [{name: 'prefers-reduced-motion', value: 'reduce'}]}, review.sessionId);
  await run("import('./analysis.js').then(async m => { await m.openProfile(); m.profileWorkspace.site = 'chesscom'; m.profileWorkspace.renderSetup(); })");
  assert.equal(await run(`(() => {
    const form = document.querySelector('.profile-setup');
    [...form.querySelectorAll('[role=radio]')].find(b => b.textContent === 'Both').click();
    return form.getAnimations({subtree: true}).length;
  })()`), 0, 'Reduced motion switches instantly');
  await call('Emulation.setEmulatedMedia', {features: []}, review.sessionId);
  await run("import('./analysis.js').then(m => { m.S.settings.uiAnim = false; m.profileWorkspace.renderSetup(); })");
  assert.equal(await run(`(() => {
    const form = document.querySelector('.profile-setup');
    [...form.querySelectorAll('[role=radio]')].find(b => b.textContent === 'Custom period').click();
    return form.getAnimations({subtree: true}).filter(a => a.effect.getKeyframes().some(k => k.translate)).length;
  })()`), 0, 'Disabled interface motion switches instantly');
  await run("import('./analysis.js').then(m => m.profileWorkspace.close())");
  await fs.writeFile(path.join(out, 'profile-setup-results.json'), JSON.stringify(evidence, null, 2));
  console.log('Profile setup browser audit passed: ' + out);
}
