// Shared isolated-world controller for every injected review placement.
// Page scripts never receive a runtime bridge, PGN, or engine observations.
(() => {
  const entries = new Set();
  const failures = new Map();
  let current = null, generation = 0, timer = null, retryTimer = null, api = null, storageListener = false;
  function cancel() {
    generation++;
    clearTimeout(retryTimer); retryTimer = null;
    if (current) {
      try {Promise.resolve(api.runtime.sendMessage({type:'cancelButtonPreview',key:current.key})).catch(() => {});} catch {}
    }
    current = null;
  }
  function number(value) {return Number.isFinite(value) && value >= 0 && value <= 100 ? value.toFixed(1) + '%' : null;}
  function render(entry, context) {
    const {button,summary} = entry;
    summary.hidden = button.disabled;
    summary.removeAttribute('title');
    if (!context?.key) {summary.textContent = 'Open your full game review'; return;}
    const result = current?.key === context.key ? current.result : null;
    if (!result?.ok) {
      summary.textContent = current?.done ? 'Accuracy preview unavailable' : 'Estimating accuracy…';
      return;
    }
    const side = context.flip === true ? 'b' : context.flip === false ? 'w' : null;
    const prefix = result.estimated ? '~' : '';
    if (!side) {
      summary.textContent = ['w','b'].map(color => (color === 'w' ? 'White ' : 'Black ') + prefix + (number(result.accuracy?.[color]) || '—')).join(' · ');
    } else {
      const score = number(result.accuracy?.[side]);
      summary.textContent = (result.players?.[side] || (side === 'w' ? 'White' : 'Black')) + ' · ' + (score ? prefix + score + ' accuracy' : 'No scored decisions');
      const counts = result.counts?.[side];
      if (counts && ['brilliant','great'].every(key => Number.isSafeInteger(counts[key]) && counts[key] >= 0)) {
        summary.textContent += ' · ' + counts.brilliant + ' Brilliant · ' + counts.great + ' Great';
      }
    }
    summary.title = result.estimated ? 'Estimated locally at depth 8. The full review may give a different score.' : 'From your saved full review.';
  }
  function refresh(force = false) {
    for (const entry of entries) if (!entry.button.isConnected) entries.delete(entry);
    const first = entries.values().next().value;
    const context = first?.getContext();
    if (!first || !context?.key || document.hidden) {
      if (current && !current.done) cancel();
      if (first) for (const entry of entries) render(entry,entry.getContext());
      return;
    }
    if (force || current && current.key !== context.key) cancel();
    if (!current) {
      const token = ++generation, state = {key:context.key,done:false,result:null}; current = state;
      try {
        Promise.resolve(api.runtime.sendMessage({type:'buttonPreview',key:context.key})).catch(() => null).then(result => {
          if (generation !== token || current !== state) return;
          // Re-read the authoritative path before accepting a late response.
          if (first.getContext()?.key !== state.key) {cancel(); refresh(); return;}
          state.done = true; state.result = result?.key === state.key ? result : null;
          for (const entry of entries) render(entry,entry.getContext());
          if (!state.result?.ok) {
            const attempt = failures.get(state.key) || 0;
            failures.set(state.key,attempt + 1);
            while (failures.size > 8) failures.delete(failures.keys().next().value);
            if (attempt < 3) retryTimer = setTimeout(() => {
              if (generation !== token || current !== state) return;
              current = null; retryTimer = null; refresh();
            },[2000,5000,10000][attempt]);
          }
        });
      } catch {state.done = true;}
    }
    for (const entry of entries) render(entry,entry.getContext());
  }
  function register(button,label,getContext,browserApi) {
    api ||= browserApi;
    const copy = document.createElement('span'); copy.className = 'chess-review-button-copy';
    const summary = document.createElement('span'); summary.className = 'chess-review-button-summary';
    summary.setAttribute('aria-live','polite'); summary.textContent = 'Estimating accuracy…';
    label.replaceWith(copy); copy.append(label,summary);
    entries.add({button,summary,getContext});
    button.addEventListener('click',() => {summary.hidden = true;});
    if (!timer) timer = setInterval(refresh,1000);
    if (!storageListener && api.storage?.onChanged) {
      storageListener = true;
      api.storage.onChanged.addListener((changes,area) => {if (area === 'local' && changes.library) refresh(true);});
    }
  }
  addEventListener('pagehide',() => {cancel(); clearInterval(timer); timer = null;});
  addEventListener('pageshow',() => {if (entries.size && !timer) timer = setInterval(refresh,1000); refresh();});
  addEventListener('popstate',() => refresh());
  document.addEventListener('visibilitychange',() => refresh());
  globalThis.ChessReviewButtonPreview = {register,refresh};
})();
