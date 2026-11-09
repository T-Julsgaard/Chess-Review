// Shared isolated-world controller for every injected review placement.
// Page scripts never receive a runtime bridge, PGN, or engine observations.
(() => {
  const entries = new Set();
  const failures = new Map();
  let fontPromise = null;
  let current = null, generation = 0, timer = null, retryTimer = null, api = null, storageListener = false, motion = true;
  function loadButtonFont() {
    // Lichess buttons use the page's own Noto Sans, so only Chess.com needs a bundled font.
    if (fontPromise || /(^|\.)lichess\.org$/i.test(location.hostname) || typeof FontFace !== 'function' || !document.fonts) return;
    // Load our unmodified OFL font once per page. FontFace accepts bytes, so a
    // page font-src policy need not allow extension/data font URLs.
    fontPromise = fetch(api.runtime.getURL('fonts/manrope.ttf')).then(response => {
      if (!response.ok) throw Error('Button font unavailable');
      return response.arrayBuffer();
    }).then(bytes => new FontFace('Chess Review Manrope',bytes,{weight:'200 800',style:'normal',display:'swap'}).load())
      .then(face => document.fonts.add(face)).catch(() => {});
  }
  function cancel() {
    generation++;
    clearTimeout(retryTimer); retryTimer = null;
    if (current) {
      try {Promise.resolve(api.runtime.sendMessage({type:'cancelButtonPreview',key:current.key})).catch(() => {});} catch {}
    }
    current = null;
  }
  function number(value) {return Number.isFinite(value) && value >= 0 && value <= 100 ? value.toFixed(1) + '%' : null;}
  function setSummary(entry, text, score = '', tail = '') {
    const value = text + score + tail;
    if (entry.summary.textContent === value) return;
    if (!score) {entry.summary.textContent = text; return;}
    const highlight = document.createElement('strong'); highlight.className = 'chess-review-button-accuracy'; highlight.textContent = score;
    entry.summary.replaceChildren(document.createTextNode(text),highlight,document.createTextNode(tail));
  }
  function setMotion(settings) {
    motion = settings?.uiAnim !== false;
    for (const {button} of entries) button.dataset.motion = motion ? 'on' : 'off';
  }
  function render(entry, context) {
    const {button,summary} = entry;
    summary.hidden = button.disabled;
    button.setAttribute('aria-busy',button.disabled ? 'true' : 'false');
    if (!button.disabled) button.classList.remove('is-opening');
    summary.removeAttribute('title');
    if (!context?.key) {button.dataset.preview = 'idle'; setSummary(entry,'Open your full game review'); return;}
    const result = current?.key === context.key ? current.result : null;
    if (!result?.ok) {
      button.dataset.preview = current?.done ? 'unavailable' : 'pending';
      setSummary(entry,current?.done ? 'Accuracy preview unavailable' : 'Estimating your game’s accuracy…');
      return;
    }
    button.dataset.preview = 'ready';
    // A side the extension has learned is the user's own account wins over board orientation.
    const own = result.me === 'w' || result.me === 'b' ? result.me : null;
    const side = own || (context.flip === true ? 'b' : context.flip === false ? 'w' : null);
    const prefix = result.estimated ? '~' : '';
    if (!side) {
      setSummary(entry,['w','b'].map(color => (color === 'w' ? 'White ' : 'Black ') + (number(result.accuracy?.[color]) ? prefix + number(result.accuracy[color]) : '—')).join(' · '));
    } else {
      const score = number(result.accuracy?.[side]);
      const player = own ? 'You' : result.players?.[side] || (side === 'w' ? 'White' : 'Black');
      setSummary(entry,player + (score ? ' played with ' : ' · No scored decisions'),score ? prefix + score : '',score ? ' accuracy' : '');
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
    loadButtonFont();
    const copy = document.createElement('span'); copy.className = 'chess-review-button-copy';
    const summary = document.createElement('span'); summary.className = 'chess-review-button-summary';
    summary.setAttribute('aria-live','polite'); summary.setAttribute('aria-atomic','true'); summary.textContent = 'Estimating your game’s accuracy…';
    label.replaceWith(copy); copy.append(label,summary);
    button.dataset.motion = motion ? 'on' : 'off';
    entries.add({button,summary,getContext});
    button.addEventListener('click',() => {summary.hidden = true; button.classList.add('is-opening'); button.setAttribute('aria-busy','true');});
    if (!timer) timer = setInterval(refresh,1000);
    if (!storageListener && api.storage?.onChanged) {
      storageListener = true;
      api.storage.onChanged.addListener((changes,area) => {
        if (area !== 'local') return;
        if (changes.settings) setMotion(changes.settings.newValue);
        if (changes.library) refresh(true);
      });
      try {Promise.resolve(api.storage.local?.get('settings')).then(stored => {if (stored) setMotion(stored.settings);}).catch(() => {});} catch {}
    }
  }
  addEventListener('pagehide',() => {cancel(); clearInterval(timer); timer = null;});
  addEventListener('pageshow',() => {if (entries.size && !timer) timer = setInterval(refresh,1000); refresh();});
  addEventListener('popstate',() => refresh());
  document.addEventListener('visibilitychange',() => refresh());
  globalThis.ChessReviewButtonPreview = {register,refresh};
})();
