import fs from 'node:fs';
import vm from 'node:vm';
import { JSDOM } from 'jsdom';
import { Chess } from '../../lib/chess.js';
import { flagCodeForCountryId, countryNameForId } from '../../flags.js';
import { BADGE_FONTS, MOVE_GRADE_CONFIG, moveGrade, gradeText, gradeLabel, gradeSvg } from '../../move-grades.js';
import { CATEGORY_LABEL_FONT, categoryLabelPng } from '../../lib/category-label.js';
import {expectedPoints, SF19_OUTCOME} from '../../lib/public-scoring.js';
import {calibratedReview,scoringEvidenceComplete} from '../../lib/calibrated-review.js';
import {analyseCalibratedPosition} from '../../lib/calibrated-search.js';
import {ConceptSession, conceptKey} from '../../lib/concepts/session.js';

// Execute the real application in a DOM, stubbing only browser/engine boundaries.
// Automatic startup and imports are omitted; production needs no test exports.
const raw = fs.readFileSync(new URL('../../analysis.js', import.meta.url), 'utf8');
const startup = raw.indexOf('(async function main()');
if (startup < 0) throw Error('Application startup marker missing');
const source = raw.slice(0, startup).replace(/^import .*;\r?\n/gm, '');

export function app(t, {hardware} = {}) {
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'https://extension.test/analysis.html#test-game', pretendToBeVisual: true });
  if (hardware) Object.defineProperties(dom.window.navigator, {
    hardwareConcurrency: {configurable:true,value:hardware.hardwareConcurrency},
    deviceMemory: {configurable:true,value:hardware.deviceMemory},
  });
  const store = {}, writes = [], timers = new Set();
  const browserAPI = {
    runtime: { getURL: p => `https://extension.test/${p}` },
    storage: { local: {
      async get(key) { return typeof key === 'string' ? { [key]: store[key] } : { ...store }; },
      async set(values) { writes.push(structuredClone(values)); Object.assign(store, structuredClone(values)); },
      async remove(key) { for (const k of Array.isArray(key) ? key : [key]) delete store[k]; },
    } },
  };
  const context = vm.createContext({
    window: dom.window, document: dom.window.document, navigator: dom.window.navigator,
    location: dom.window.location, Node: dom.window.Node, HTMLElement: dom.window.HTMLElement,
    getComputedStyle: dom.window.getComputedStyle, performance, structuredClone,
    URL, TextEncoder, btoa, console, Chess, flagCodeForCountryId, countryNameForId, browserAPI,
    BADGE_FONTS, MOVE_GRADE_CONFIG, moveGrade, gradeText, gradeLabel, gradeSvg,
    CATEGORY_LABEL_FONT, categoryLabelPng,
    expectedPoints, SF19_OUTCOME, calibratedReview, scoringEvidenceComplete, analyseCalibratedPosition,
    ConceptSession, conceptKey,
    Engine: class { constructor() { throw Error('Unexpected real engine'); } },
    fetch: async () => { throw Error('Unexpected network access'); },
    requestAnimationFrame: () => 0, cancelAnimationFrame() {},
    setTimeout(fn, ms) { const id = setTimeout(() => { timers.delete(id); fn(); }, ms); timers.add(id); return id; },
    clearTimeout(id) { clearTimeout(id); timers.delete(id); }, setInterval, clearInterval,
  });
  vm.runInContext(source, context, { filename: 'analysis.js' });
  const run = code => vm.runInContext(code, context);
  const state = run('S');
  Object.assign(state.settings, { sound: false, moveAnim: false, coach: '', showThreat: false, engineDepth: 4 });
  context.__publicCalibration = JSON.parse(fs.readFileSync(new URL('../../data/calibration.json', import.meta.url), 'utf8'));
  run('BOOK = {}; CALIB = { ...__publicCalibration, quality: { ...__publicCalibration.quality, outcome: { slopePerPawn: 0.3 } } };');
  const replace = (name, fn) => { context.__replacement = fn; run(`${name} = __replacement`); delete context.__replacement; };
  t.after(() => { for (const id of timers) clearTimeout(id); dom.window.close(); });
  return { run, state, context, dom, store, writes, replace,
    start: () => vm.runInContext(raw.slice(startup), context, { filename: 'analysis.js' }),
    call: (name, ...args) => run(name)(...args) };
}

export function loadGame(a, pgn, evals) {
  const S = a.state;
  S.pgn = pgn; S.meta = {}; S.headers = {}; S.openingHeader = null;
  S.positions = a.call('buildPositions', pgn); S.total = S.positions.length - 1;
  S.evals = evals || S.positions.map(() => ({ cp: 0 }));
  S.bests = S.positions.map(() => ({ bestmove: 'a1a1', score: { cp: 0 }, lines: [] }));
  S.players = { w: { name: 'White' }, b: { name: 'Black' } };
  S._sacCache = []; S._forcedCache = []; S.analyzing = false; S.progress = S.total;
  return S;
}

export function branch(a, ply = 0, idx = a.state.total - ply) {
  const S = a.state;
  S.analysisMode = true;
  S.variation = { branchIdx: ply, idx,
    positions: S.positions.slice(ply).map((p, i) => ({ ...p, eval: S.evals[ply + i], best: S.bests[ply + i] })),
  };
  return S.variation;
}

export function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

export async function settle() { for (let i = 0; i < 12; i++) await Promise.resolve(); }

export function fakeEngine(analyse = async () => ({ score: { cp: 0 }, bestmove: 'e2e4', lines: [] })) {
  return { dead: false, analyse, async setOptions() {}, stop() {}, cancelPending() {}, terminate() { this.dead = true; } };
}
