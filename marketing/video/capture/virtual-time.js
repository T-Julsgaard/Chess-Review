// Frame-accurate capture of the real UI. While a sequence records, the page's timers,
// requestAnimationFrame and CSS/Web animations advance only when the harness calls
// step(), so every frame is exact however slow the screenshot is. Installed into each
// frame with frame.evaluate(installVirtualTime); outside enter()/exit() it passes through.
export function installVirtualTime() {
  if (window.__vt) return;
  const real = {
    setTimeout: window.setTimeout.bind(window),
    clearTimeout: window.clearTimeout.bind(window),
    setInterval: window.setInterval.bind(window),
    raf: window.requestAnimationFrame.bind(window),
    caf: window.cancelAnimationFrame.bind(window),
    perfNow: performance.now.bind(performance),
    dateNow: Date.now,
  };
  const timers = new Map();   // virtual id -> { due, ms, fn, args, repeat }
  const rafs = new Map();     // virtual id -> callback
  const rearmed = new Map();  // virtual id -> real id, for timers still pending at exit()
  const tracked = new Map();  // Animation -> { base, at }
  const done = new WeakSet();
  let on = false, now = 0, dateBase = 0, nextId = 1e9;

  const call = (fn, args) => {
    try { typeof fn === 'function' ? fn(...args) : (0, eval)(String(fn)); } catch (e) { console.error(e); }
  };
  const add = (fn, ms, args, repeat) => {
    if (!on) return (repeat ? real.setInterval : real.setTimeout)(fn, ms, ...args);
    const id = nextId++;
    const delay = Math.max(0, Number(ms) || 0);
    timers.set(id, { due: now + delay, ms: delay, fn, args, repeat });
    return id;
  };
  const clear = (id) => {
    if (timers.delete(id)) return;
    if (rearmed.has(id)) { real.clearTimeout(rearmed.get(id)); rearmed.delete(id); return; }
    real.clearTimeout(id);
  };
  window.setTimeout = (fn, ms, ...args) => add(fn, ms, args, false);
  window.setInterval = (fn, ms, ...args) => add(fn, ms, args, true);
  window.clearTimeout = window.clearInterval = clear;
  window.requestAnimationFrame = (fn) => {
    if (!on) return real.raf(fn);
    const id = nextId++; rafs.set(id, fn); return id;
  };
  window.cancelAnimationFrame = (id) => { if (!rafs.delete(id)) real.caf(id); };

  // Pause every running animation and drive its currentTime from the virtual clock.
  const sync = () => {
    for (const a of document.getAnimations()) {
      if (done.has(a)) continue;
      let s = tracked.get(a);
      if (!s) {
        const t0 = a.currentTime ?? 0;
        a.pause();
        s = { base: t0, at: now };
        tracked.set(a, s);
      }
      const t = s.base + (now - s.at) * (a.playbackRate || 1);
      const end = a.effect ? a.effect.getComputedTiming().endTime : Infinity;
      if (Number.isFinite(end) && t >= end) { a.finish(); tracked.delete(a); done.add(a); }
      else a.currentTime = t;
    }
  };

  window.__vt = {
    real,
    get on() { return on; },
    enter() {
      if (on) return;
      on = true;
      now = real.perfNow();
      dateBase = real.dateNow() - now;
      performance.now = () => now;
      Date.now = () => Math.round(dateBase + now);
      sync();
    },
    step(dt) {
      const target = now + dt;
      for (;;) {
        let id = null, t = null;
        for (const [k, v] of timers) if (v.due <= target && (!t || v.due < t.due)) { id = k; t = v; }
        if (!t) break;
        now = Math.max(now, t.due);
        if (t.repeat) t.due += Math.max(1, t.ms); else timers.delete(id);
        call(t.fn, t.args);
      }
      now = target;
      const cbs = [...rafs.values()];
      rafs.clear();
      for (const cb of cbs) call(cb, [now]);
      sync();
    },
    sync,
    exit() {
      if (!on) return;
      on = false;
      delete performance.now;
      Date.now = real.dateNow;
      for (const [id, t] of timers) {
        const left = Math.max(0, t.due - now);
        rearmed.set(id, t.repeat ? real.setInterval(t.fn, t.ms, ...t.args) : real.setTimeout(t.fn, left, ...t.args));
      }
      timers.clear();
      for (const cb of rafs.values()) real.raf(cb);
      rafs.clear();
      for (const [a] of tracked) a.play();
      tracked.clear();
    },
  };
}
