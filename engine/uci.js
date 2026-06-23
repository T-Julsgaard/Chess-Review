// engine/uci.js — thin wrapper around the Stockfish worker (UCI protocol).
// Runs positions sequentially via a queue; one engine instance at a time.
// Supports MultiPV (multiple lines per position) for the Engine panel.

// How long to wait for the engine's "readyok" handshake before declaring the build dead.
// If a build can't be instantiated (CSP change, missing/blocked wasm, a future browser
// change), the worker never replies — without this cap _ready would hang forever and every
// analysis would silently stall. On timeout the handshake REJECTS, which lets the caller
// fall back to the next build (see createEngine() in analysis.js).
const HANDSHAKE_TIMEOUT_MS = 10000;

export class Engine {
  constructor(scriptPath = "engine/stockfish.js", wasmPath = scriptPath.replace(/\.js$/, ".wasm")) {
    // Give Stockfish the explicit wasm path via the URL hash (nmrugg reads
    // self.location.hash as the wasm path). Use an absolute extension URL so it's
    // unambiguous regardless of the worker's base URL.
    const wasmUrl =
      typeof chrome !== "undefined" && chrome.runtime?.getURL
        ? chrome.runtime.getURL(wasmPath)
        : wasmPath;
    this.scriptPath = scriptPath;
    this.dead = false;
    // A worker whose script URL is bad throws synchronously from the constructor — treat that the
    // same as any other load failure so createEngine() can fall back instead of crashing the page.
    try {
      this.worker = new Worker(`${scriptPath}#${wasmUrl}`);
    } catch (e) {
      this.dead = true;
      this._ready = Promise.reject(new Error(`engine worker could not be created (${scriptPath}): ${e?.message || e}`));
      this._ready.catch(() => {}); // pre-attach so an unconsumed rejection never warns
      return;
    }
    this.queue = [];
    this.current = null;
    this.multipv = 1;
    // Listen BEFORE the handshake, so a (possibly synchronous) reply isn't lost.
    this.worker.onmessage = (e) => this._onLine(typeof e.data === "string" ? e.data : e.data?.data || "");
    // A runtime error in the worker (failed wasm instantiation, a crash mid-search) surfaces here.
    // During the handshake it rejects _ready (→ fall back); after readiness it fails any in-flight
    // job so a Promise.all over the batch can't hang forever on a dead worker.
    this.worker.onerror = (e) => this._onWorkerError(e?.message || "engine worker error");
    this._ready = this._handshake();
  }

  _onWorkerError(message) {
    this.dead = true;
    const err = new Error(message);
    if (this._onFail) { this._failHandshake(err); return; }
    // Past the handshake: reject the running job and everything queued behind it.
    if (this.current) { try { this.current.reject(err); } catch {} this.current = null; }
    while (this.queue.length) { const j = this.queue.shift(); try { j.reject(err); } catch {} }
  }

  _failHandshake(err) {
    clearTimeout(this._handshakeTimer);
    const fail = this._onFail;
    this._onReady = null;
    this._onFail = null;
    if (fail) fail(err);
  }

  _send(cmd) {
    if (this.dead || !this.worker) return;
    try { this.worker.postMessage(cmd); } catch {}
  }

  /**
   * Set global UCI options (e.g. Hash, "Skill Level"). Sent once the engine is ready.
   * opts = { Hash: 32, "Skill Level": 20, ... }
   */
  async setOptions(opts = {}) {
    await this._ready;
    for (const [name, value] of Object.entries(opts)) {
      if (value == null) continue;
      this._send(`setoption name ${name} value ${value}`);
    }
  }

  /** Abort the ongoing search (bestmove comes quickly) — used by live analysis. */
  stop() {
    try { this._send("stop"); } catch {}
  }

  _handshake() {
    return new Promise((resolve, reject) => {
      this._onReady = resolve;
      this._onFail = reject;
      this._handshakeTimer = setTimeout(
        () => this._failHandshake(new Error(`engine handshake timed out (${this.scriptPath})`)),
        HANDSHAKE_TIMEOUT_MS,
      );
      this._send("uci");
    });
  }

  _onLine(line) {
    if (!line) return;
    if (line.includes("uciok")) {
      this._send("isready");
      return;
    }
    if (line.includes("readyok")) {
      if (this._onReady) {
        clearTimeout(this._handshakeTimer);
        const ready = this._onReady;
        this._onReady = null;
        this._onFail = null;
        ready();
      }
      this._pump();
      return;
    }
    if (!this.current) return;

    if (line.startsWith("info ") && line.includes(" score ")) {
      const score = this._parseScore(line);
      if (score) {
        const mpv = parseInt((line.match(/ multipv (\d+)/) || [])[1] || "1", 10);
        const pvMatch = line.match(/ pv (.+)$/);
        const pv = pvMatch ? pvMatch[1].trim() : "";
        this.current.lines[mpv] = { score, pv };
        if (mpv === 1) {
          this.current.lastScore = score;
          if (pv) this.current.lastPv = pv;
        }
      }
      return;
    }
    if (line.startsWith("bestmove")) {
      const best = line.split(/\s+/)[1] || null;
      const job = this.current;
      this.current = null;
      const lines = Object.keys(job.lines)
        .sort((a, b) => +a - +b)
        .map((k) => job.lines[k]);
      job.resolve({
        bestmove: best && best !== "(none)" ? best : null,
        score: job.lastScore || { cp: 0 },
        pv: job.lastPv || "",
        lines,
      });
      this._pump();
    }
  }

  _parseScore(line) {
    const cp = line.match(/ score cp (-?\d+)/);
    if (cp) return { cp: parseInt(cp[1], 10) };
    const mate = line.match(/ score mate (-?\d+)/);
    if (mate) return { mate: parseInt(mate[1], 10) };
    return null;
  }

  _pump() {
    if (this.current || this.queue.length === 0) return;
    this.current = this.queue.shift();
    if (this.current.multipv !== this.multipv) {
      this.multipv = this.current.multipv;
      this._send(`setoption name MultiPV value ${this.multipv}`);
    }
    this._send("ucinewgame");
    this._send(`position fen ${this.current.fen}`);
    this._send(`go depth ${this.current.depth}`);
  }

  /**
   * Analyze one position.
   * Returns { bestmove, score:{cp|mate}, pv, lines:[{score,pv}] }.
   * lines are sorted best→worst (multipv 1..n), seen from the side to move.
   */
  async analyse(fen, depth = 12, multipv = 1) {
    await this._ready;
    if (this.dead) throw new Error("engine is no longer running");
    return new Promise((resolve, reject) => {
      this.queue.push({ fen, depth, multipv, resolve, reject, lastScore: null, lastPv: "", lines: {} });
      this._pump();
    });
  }

  terminate() {
    this.dead = true;
    try { this._send("quit"); } catch {}
    try { this.worker?.terminate(); } catch {}
  }
}
