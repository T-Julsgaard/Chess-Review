import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {season} from '../tests/helpers/profile-season.mjs';

// node scripts/learning-browser.mjs --working-tree --profile-streaming
export async function auditLearning({review, call, evaluate, sleep, waitFor, out}) {
  const run = code => evaluate(review, code), evidence = [];
  await sleep(250);
  await run("document.querySelector('.learning-announcement')&&document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))");
  for (const [width, height] of [[1920, 1080], [1366, 768], [600, 800], [360, 800]]) {
    await call('Emulation.setDeviceMetricsOverride', {width, height, deviceScaleFactor: 1, mobile: false}, review.sessionId);
    await run(`import('./analysis.js').then(async m => {
      m.S.settings.uiAnim = true; m.S.settings.profileDepth = 'off';
      await m.openProfile(); const w = m.profileWorkspace; w.site = 'lichess'; w.account = 'tester'; w.period = 'all';
      const signal = w.reset(); w.phase = 'loading'; w.renderHead(); w.renderLoading(signal); w.beginPreparation(signal);
      w.rows = Array.from({length: 40}, (_, i) => ({id: String(i), site: 'lichess', t: 1767225600 + i * 3600, me: 'w', opp: 'Opponent ' + i, n: 30, myMoves: 15, cls: 'blitz', res: ['w', 'l', 'd'][i % 3], url: 'https://lichess.org/abcd1234'}));
      w.updateGameMap(); w.updateLoadingProgress();
    })`);
    await waitFor(review, "!!document.querySelector('.profile-loader') && !!document.querySelector('.profile-game-map')", 'Simultaneous map and loading animation');
    await run(`import('./analysis.js').then(m => { const w = m.profileWorkspace; const base = w.rows;
      w.rows = Array.from({length: 190}, (_, i) => ({...base[i % base.length], id: String(i), t: 1767225600 + i * 3600}));
      w.updateGameMap(); w.collectFraction = .6; w.analysisProgress = {done: 60, remaining: 130, etaMs: 95000}; w.updateLoadingProgress();
    })`);
    await sleep(500);
    const measure = await run(`(() => { const map = document.querySelector('.profile-game-map'), caption = document.querySelector('.profile-map-caption'), shell = document.querySelector('.profile-shell');
      const r = n => { const b = n.getBoundingClientRect(); return {left:b.left, right:b.right, top:b.top, bottom:b.bottom}; };
      return {map:r(map), caption:r(caption), shell:r(shell), cancel:r(document.querySelector('.profile-loader button')), children:map.querySelectorAll('*').length, count:document.querySelector('.profile-map-summary').textContent, overflow:shell.scrollWidth-shell.clientWidth};
    })()`);
    assert.equal(measure.children, 1); assert.equal(measure.count, '190 games');
    assert.ok(measure.map.left >= 0 && measure.map.right <= width + 1);
    assert.ok(measure.shell.bottom <= height + 1); assert.ok(measure.caption.bottom <= measure.shell.top || measure.caption.right <= measure.shell.left, JSON.stringify({width, height, ...measure}));
    assert.ok(measure.overflow <= 1);
    assert.ok(measure.cancel.bottom <= measure.shell.bottom, 'Cancellation stays visible: ' + JSON.stringify(measure));
    evidence.push({width, height, ...measure});
    const shot = await call('Page.captureScreenshot', {format: 'png'}, review.sessionId);
    await fs.writeFile(path.join(out, `profile-streaming-${width}x${height}.png`), Buffer.from(shot.data, 'base64'));
    await run(`import('./analysis.js').then(m => { const w = m.profileWorkspace, base = w.rows;
      w.rows = Array.from({length: 10000}, (_, i) => ({...base[i % base.length], id: String(i), t: 1767225600 + i * 60})); w.updateGameMap();
    })`);
    assert.match(await run("document.querySelector('.profile-game-map').getAttribute('aria-label')"), /^10[,.]000 games/);
    await run("import('./analysis.js').then(m => m.profileWorkspace.close())");
  }
  // Exercise preparation through the real background/offscreen/Stockfish route.
  const game = season()[0];
  const global = await call('Runtime.evaluate', {expression: 'globalThis'}, review.sessionId);
  try {
    const response = await call('Runtime.callFunctionOn', {objectId: global.result.objectId, awaitPromise: true, returnByValue: true,
      arguments: [{value: game}], functionDeclaration: (async function(row) {
        const [m, {browserAPI}, cache, pgn] = await Promise.all([import('./analysis.js'), import('./browser-compat.js'), import('./gamecache.js'), import('./lib/profile/pgn-source.js')]);
        await browserAPI.storage.local.set({'profile:v1:games:chesscom:tester': {rows: [row], months: [], since: 0, updatedAt: Date.now()}});
        await cache.setCachedMonth(pgn.monthUrl('tester', row.t), [{url: row.url, pgn: '[Result "1-0"]\n\n1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7 1-0'}]);
        m.S.settings.profileDepth = 'fast'; m.S.settings.profileSample = 'all';
        await m.openProfile(); const w = m.profileWorkspace; w.site = 'chesscom'; w.account = 'tester'; w.period = 'all';
        await w.load();
        const result = {phase: w.phase, games: w.report?.engine?.games, job: w.job, map: !!document.querySelector('.profile-game-map')};
        await w.close(); return result;
      }).toString()}, review.sessionId);
    if (response.exceptionDetails) throw Error(JSON.stringify(response.exceptionDetails));
    const result = response.result.value;
    assert.equal(result.phase, 'deck'); assert.equal(result.games, 1); assert.equal(result.job.failed, 0);
    assert.ok(result.job.id.startsWith('profile-')); assert.ok(result.map);
    evidence.push({engine: result});
  } finally { await call('Runtime.releaseObject', {objectId: global.result.objectId}, review.sessionId); }
  await fs.writeFile(path.join(out, 'profile-streaming-evidence.json'), JSON.stringify(evidence, null, 2));
}
