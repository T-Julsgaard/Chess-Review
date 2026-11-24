import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {app, loadGame, settle} from './helpers/app.mjs';
import {settingsStrings} from './helpers/settings-text.mjs';
import {LANGUAGES, DEFAULT_LANGUAGE, LANGUAGE_STORAGE_KEY, createTranslator, loadLanguage, isLanguageLoaded} from '../lib/i18n/index.js';
import en from '../lib/i18n/messages/en.js';
import zhHans from '../lib/i18n/messages/zh-Hans.js';
import {MOVE_GRADE_CONFIG} from '../move-grades.js';

const html = fs.readFileSync(new URL('../analysis.html', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
const GRADE_NAMES = ['Brilliant', 'Great', 'Best', 'Excellent', 'Good', 'Book', 'Inaccuracy', 'Mistake', 'Miss', 'Blunder'];
const OTHERS = LANGUAGES.filter(language => language.id !== DEFAULT_LANGUAGE);
const catalogOf = async id => (await import(`../lib/i18n/messages/${id}.js`)).default;
const placeholders = text => [...text.matchAll(/\{\d+\}/g)].map(match => match[0]).sort().join();

// Real startup through main(), as the toolbar, in-page button and shortcut all open it.
// settingsTab: null keeps the category the app itself opens Settings on.
function startup(t, {languages = ['en-US'], savedLanguage = null, url = 'https://extension.test/analysis.html#test-game'} = {}) {
  const a = app(t, {html, url, languages, savedLanguage, settingsTab: null});
  const style = a.dom.window.document.createElement('style'); style.textContent = css; a.dom.window.document.head.append(style);
  a.context.requestAnimationFrame = fn => { queueMicrotask(fn); return 0; };
  for (const name of ['resetSettingsForRelease', 'loadBook', 'loadCalibration', 'initTabZoom']) a.replace(name, async () => {});
  a.replace('startAnalysis', () => {});
  a.store.settings = {uiAnim: false};
  a.store['job:test-game'] = {pgn: '1. e4 e5 2. Nf3', meta: {}, source: 'pgn', analysis: null};
  a.announcements = 0;
  a.context.mountLearningAnnouncement = () => { a.announcements++; return {close() {}, dispose() {}}; };
  return a;
}
const toggleLabel = a => a.dom.window.document.querySelector('[data-settings-toggle]').getAttribute('aria-label');
const categoryName = a => a.dom.window.document.querySelector('.set-category-name').textContent;

test('English and the fifteen other languages each have a native name, a bundled flag and English fallbacks', async () => {
  assert.equal(DEFAULT_LANGUAGE, 'en');
  assert.equal(LANGUAGE_STORAGE_KEY, 'language');
  assert.deepEqual(LANGUAGES.map(language => language.id),
    ['en', 'pt-BR', 'es', 'ru', 'tr', 'id', 'fr', 'it', 'vi', 'de', 'pl', 'uk', 'ar', 'hi', 'zh-Hans', 'da']);
  assert.deepEqual(LANGUAGES.map(language => language.flag),
    ['GB', 'BR', 'ES', 'RU', 'TR', 'ID', 'FR', 'IT', 'VN', 'DE', 'PL', 'UA', 'SA', 'IN', 'CN', 'DK']);
  for (const language of LANGUAGES) {
    assert.ok(language.nativeName.trim(), language.id);
    assert.ok(fs.existsSync(new URL(`../flags/${language.flag}.svg`, import.meta.url)), language.flag);
    assert.ok(en.messages['language.name.' + language.id], `English name for ${language.id}`);
    assert.equal(await loadLanguage(language.id), true, language.id);
    const translator = createTranslator(language.id);
    assert.equal(translator.language, language.id);
    for (const id of Object.keys(en.messages)) assert.notEqual(translator.t(id), id, `${language.id} ${id}`);
  }
});

test('every catalog translates the same entries as Simplified Chinese, with matching placeholders and no move grades', async () => {
  // zh-Hans is checked against the live settings panel below, so the same keys
  // mean every other language covers the whole panel too.
  const textKeys = Object.keys(zhHans.text).sort();
  for (const {id} of OTHERS) {
    const catalog = await catalogOf(id);
    assert.deepEqual(Object.keys(catalog.messages).sort(), Object.keys(en.messages).sort(), `${id} messages`);
    assert.deepEqual(Object.keys(catalog.text).sort(), textKeys, `${id} text`);
    assert.deepEqual(Object.keys(catalog.context), Object.keys(zhHans.context), `${id} contexts`);
    for (const [name, table] of Object.entries(zhHans.context))
      assert.deepEqual(Object.keys(catalog.context[name]).sort(), Object.keys(table).sort(), `${id} ${name}`);
    const entries = [...Object.entries(catalog.messages).map(([key, value]) => [en.messages[key], value]),
      ...Object.entries(catalog.text), ...Object.values(catalog.context).flatMap(table => Object.entries(table))];
    for (const [source, value] of entries) {
      assert.equal(typeof value, 'string', `${id}: ${source}`);
      assert.ok(value.trim(), `${id}: ${source} is empty`);
      assert.equal(placeholders(value), placeholders(source), `${id}: ${source} → ${value}`);
    }
    for (const grade of GRADE_NAMES) assert.ok(!Object.hasOwn(catalog.text, grade), `${id} translates ${grade}`);
  }
  // Common Traditional-only forms must not slip into the Simplified catalog.
  for (const value of [...Object.values(zhHans.messages), ...Object.values(zhHans.text)])
    assert.doesNotMatch(value, /[發後點與學說這們會開關設語選擇對]/, value);
});

test('a catalog that is missing or broken leaves the interface in English and never throws', async t => {
  const warn = console.warn, warnings = [];
  console.warn = (...args) => warnings.push(args);
  t.after(() => { console.warn = warn; });
  assert.equal(await loadLanguage('xx'), false, 'Unknown languages are refused');
  assert.equal(createTranslator('xx').language, 'en');
  const english = createTranslator('en');
  assert.equal(english.text('Reset layout'), 'Reset layout');
  assert.equal(english.localize(null), null);
  // Simulate failures through the loader's importer, for a fresh module instance
  // so no catalog is loaded yet.
  const fresh = await import(`../lib/i18n/index.js?broken=${Date.now()}`);
  for (const importer of [() => Promise.reject(Error('file missing')), () => { throw SyntaxError('bad file'); },
    async () => ({}), async () => ({default: 'nonsense'})]) {
    assert.equal(await fresh.loadLanguage('fr', importer), false);
    assert.equal(fresh.isLanguageLoaded('fr'), false);
    const translator = fresh.createTranslator('fr');
    assert.equal(translator.language, 'en');
    assert.equal(translator.text('Reset layout'), 'Reset layout');
    assert.equal(translator.t('language.settings.title'), 'Language');
  }
  assert.equal(warnings.length, 4, 'Each failure is reported once');
  // Malformed entries are dropped; the rest of the catalog still works.
  assert.equal(await fresh.loadLanguage('de', async () => ({default: {messages: {'language.settings.title': 7},
    text: {'Reset layout': 'Layout zurücksetzen', 'Export': '', 'Import': null}, context: 'x'}})), true);
  const de = fresh.createTranslator('de');
  assert.equal(de.text('Reset layout'), 'Layout zurücksetzen');
  assert.equal(de.text('Export'), 'Export');
  assert.equal(de.text('Import'), 'Import');
  assert.equal(de.t('language.settings.title'), 'Language');
  assert.equal(isLanguageLoaded('en'), true);
});

test('missing translations fall back to English and placeholders, context and whitespace are handled', async () => {
  await loadLanguage('zh-Hans');
  const zh = createTranslator('zh-Hans'), english = createTranslator('en');
  assert.equal(zh.text('A sentence nobody translated'), 'A sentence nobody translated');
  assert.equal(zh.t('no.such.message'), 'no.such.message');
  assert.equal(english.text('Reset layout'), 'Reset layout');
  assert.equal(zh.text('Reset layout'), '重置布局');
  assert.equal(zh.text('  Reset layout\n'), '  重置布局\n');
  assert.equal(zh.text('Move sound'), '走子音效');
  assert.equal(zh.text('Puzzle success volume'), '答题正确音量');
  assert.equal(zh.text('Great, score range 9.5 to 9.9'), 'Great，评分范围 9.5 至 9.9');
  assert.equal(zh.text('Best, score 9'), 'Best，评分 9');
  assert.equal(zh.text('Blunder badge: Check'), 'Blunder 徽标：将军');
  assert.equal(zh.text('Blunder badge: Check', 'badge-symbol'), 'Blunder 徽标：对勾');
  assert.equal(zh.text('Check', 'badge-symbol'), '对勾');
  assert.equal(zh.text('05 · Weighted Snap'), '05 · 厚重咔嗒');
  assert.equal(zh.text('Sound 04'), '音效 04');
  assert.equal(zh.text('+3 st'), '+3 半音');
  assert.equal(zh.format('Preview {0} effect', 'Brilliant'), '预览 Brilliant 特效');
  await loadLanguage('fr');
  const fr = createTranslator('fr');
  assert.equal(fr.text('Move sound'), 'Son : Coup');
  assert.equal(fr.text('Check'), 'Échec');
  assert.equal(fr.text('Check', 'badge-symbol'), 'Coche');
  assert.equal(fr.text('Dark', 'board-squares'), 'Cases foncées');
});

test('move grade names are never translated', async () => {
  const names = new Set([...GRADE_NAMES, ...Object.values(MOVE_GRADE_CONFIG).map(config => config.label).filter(Boolean)]);
  for (const {id} of OTHERS) {
    await loadLanguage(id);
    const translator = createTranslator(id);
    for (const name of names) assert.equal(translator.text(name), name, `${id} ${name}`);
  }
});

test('localize translates text and labels but leaves translate="no" content alone', async t => {
  await loadLanguage('zh-Hans');
  const a = app(t), doc = a.dom.window.document, zh = createTranslator('zh-Hans');
  const root = doc.createElement('div');
  root.innerHTML = '<button title="Reset layout" aria-label="Move sound">Reset layout</button>'
    + '<span translate="no">Reset layout</span><span data-i18n-context="badge-symbol">Check</span><span>Check</span>';
  zh.localize(root);
  assert.equal(root.querySelector('button').textContent, '重置布局');
  assert.equal(root.querySelector('button').title, '重置布局');
  assert.equal(root.querySelector('button').getAttribute('aria-label'), '走子音效');
  assert.equal(root.querySelector('[translate="no"]').textContent, 'Reset layout');
  assert.equal(root.querySelector('[data-i18n-context]').textContent, '对勾');
  assert.equal(root.lastElementChild.textContent, '将军');
  root.querySelector('button').textContent = 'Reset layout';
  createTranslator('en').localize(root);
  assert.equal(root.querySelector('button').textContent, 'Reset layout');
});

test('Simplified Chinese settings are complete apart from names, move grades and units', async t => {
  await loadLanguage('zh-Hans');
  const coachNames = app(t).run('COACH_LIST').map(([, name]) => name);
  const fontNames = Object.values(app(t).run('BADGE_FONTS')).map(font => font.name);
  const english = new Set([...GRADE_NAMES, ...coachNames, ...fontNames, 'Cburnett', 'Merida', 'Lichess', 'Stockfish 18 NNUE', 'Stockfish 19 Lite']);
  const unit = /^[+\-−]?[\d.,]+\s?(?:px|ms|MB|KB|%|°|×)?$/;
  const states = [{},
    {bg: 'olive', bgFit: 'tile', reviewMode: 'dopamine', coach: 'old_soviet', coachPlain: false, enginePath: 'sf19lite', engineDepth: 18, ratingMode: 'moves'},
    {bg: 'slate', bgFit: 'cover', engineDepth: 12, engineSkill: 10, engineWorkers: 1, badgeSymbols: {brilliant: 'comet'}}];
  for (const state of states) {
    const a = app(t);
    loadGame(a, '1. e4 e5');
    Object.assign(a.state.settings, state);
    a.state.engineFallbackBuild = state.enginePath ? null : 'sf19lite';
    a.call('computeDerived'); a.call('buildUI'); a.call('renderAll');
    a.call('applyUiLanguage', 'zh-Hans');
    a.call('toggleSettings');
    const left = [...settingsStrings(a)].filter(([text]) => !english.has(text) && !unit.test(text) && !/^#[0-9a-f]{6}$/i.test(text));
    assert.deepEqual(left.map(([text, where]) => `${where}: ${text}`), [], JSON.stringify(state));
    await settle();
  }
});

test('first use is English with no prompt, whatever the browser language, and Settings opens on Visual with Language beneath it', async t => {
  for (const languages of [['zh-CN', 'en'], ['fr-FR'], ['de-DE', 'pt-BR'], ['en-US']]) {
    const a = startup(t, {languages}), doc = a.dom.window.document;
    await a.start(); await settle();
    assert.equal(doc.querySelector('.lang-overlay, [role="dialog"][aria-modal="true"]'), null, `No prompt for ${languages}`);
    assert.equal(a.announcements, 1, 'The intro tour is not held back');
    assert.equal(a.state.pgn, '1. e4 e5 2. Nf3');
    assert.equal(toggleLabel(a), 'Settings');
    assert.equal(Object.hasOwn(a.store, LANGUAGE_STORAGE_KEY), false, 'Nothing is guessed or saved');
    assert.ok(!a.writes.some(write => Object.hasOwn(write, LANGUAGE_STORAGE_KEY)));
    a.call('toggleSettings');
    assert.equal(a.state.settingsTab, 'visual');
    assert.equal(categoryName(a), 'Visual');
    assert.deepEqual([...doc.querySelectorAll('[data-category]')].slice(0, 2).map(option => option.dataset.category), ['visual', 'language']);
    doc.querySelector('[data-category="language"]').click();
    assert.equal(categoryName(a), 'Language');
    assert.equal(doc.querySelector('.set-language .set-note'), null, 'No notes under the language list');
    assert.equal(doc.querySelectorAll('.set-language-option').length, LANGUAGES.length);
    assert.equal(doc.querySelector('.set-language-option[aria-checked="true"]').dataset.language, 'en');
  }
});

test('Settings keeps the category chosen during a visit and opens on Visual again after a reload', async t => {
  const a = startup(t, {savedLanguage: 'en'}), doc = a.dom.window.document;
  await a.start();
  a.call('toggleSettings');
  assert.equal(categoryName(a), 'Visual');
  doc.querySelector('[data-category="engine"]').click();
  a.call('toggleSettings'); a.call('toggleSettings');
  assert.equal(doc.getElementById('settings').hidden, false);
  assert.equal(categoryName(a), 'Engine', 'Closing and reopening Settings keeps the category');
  const reloaded = startup(t, {savedLanguage: 'en'});
  await reloaded.start();
  reloaded.call('toggleSettings');
  assert.equal(categoryName(reloaded), 'Visual');
});

test('a saved language applies at startup without asking', async t => {
  for (const [id, settings, language] of [['zh-Hans', '设置', '外观'], ['de', 'Einstellungen', 'Darstellung'], ['ar', 'الإعدادات', 'المظهر']]) {
    const a = startup(t, {savedLanguage: id}), doc = a.dom.window.document;
    await a.start();
    assert.equal(doc.querySelector('.lang-overlay'), null);
    assert.equal(a.announcements, 1);
    assert.equal(toggleLabel(a), settings);
    a.call('toggleSettings');
    assert.equal(doc.getElementById('settings').lang, id);
    assert.equal(categoryName(a), language);
  }
});

test('an unknown saved value, or a catalog that fails to load, starts in English', async t => {
  const unknown = startup(t, {savedLanguage: 'zh-Hant'});
  await unknown.start();
  assert.equal(toggleLabel(unknown), 'Settings');
  assert.equal(unknown.announcements, 1);

  const broken = startup(t, {savedLanguage: 'fr'});
  broken.context.loadLanguage = async () => false;
  await broken.start();
  assert.equal(toggleLabel(broken), 'Settings');
  assert.equal(broken.announcements, 1, 'Startup carries on');
  assert.equal(broken.state.pgn, '1. e4 e5 2. Nf3');
  broken.call('toggleSettings');
  assert.equal(categoryName(broken), 'Visual');
  broken.dom.window.document.querySelector('[data-category="language"]').click();
  assert.equal(categoryName(broken), 'Language');
  // Choosing a language whose catalog cannot load keeps English and saves nothing.
  broken.dom.window.document.querySelector('.set-language-option[data-language="de"]').click();
  await settle();
  assert.equal(broken.store[LANGUAGE_STORAGE_KEY], 'fr', 'The earlier choice is kept as it was');
  assert.equal(categoryName(broken), 'Language');
});

test('a choice saved in another tab applies here', async t => {
  const a = startup(t, {savedLanguage: 'en'});
  await a.start();
  await a.call('languageStorageChanged', {[LANGUAGE_STORAGE_KEY]: {newValue: 'zh-Hans'}}, 'local');
  assert.equal(toggleLabel(a), '设置');
  await a.call('languageStorageChanged', {[LANGUAGE_STORAGE_KEY]: {newValue: 'xx'}}, 'local');
  await a.call('languageStorageChanged', {settings: {newValue: {}}}, 'local');
  assert.equal(toggleLabel(a), '设置');
  await a.call('languageStorageChanged', {[LANGUAGE_STORAGE_KEY]: {newValue: 'es'}}, 'local');
  assert.equal(toggleLabel(a), 'Ajustes');
});

test('Settings → Language switches immediately, keeps the game and remembers the choice', async t => {
  const a = startup(t, {savedLanguage: 'en'}), doc = a.dom.window.document;
  await a.start();
  a.call('go', 2);
  const positions = a.state.positions, idx = a.state.idx;
  a.call('toggleSettings');
  const menu = [...doc.querySelectorAll('.set-category .lib-dd-opt')];
  assert.equal(menu[0].dataset.category, 'visual', 'Visual is listed first');
  assert.equal(menu[1].dataset.category, 'language', 'Language is listed right beneath it');
  assert.match(menu[1].textContent, /Language.*Choose your language/);
  menu[1].click();
  const list = doc.querySelector('.set-language-list');
  assert.equal(list.getAttribute('role'), 'radiogroup');
  const choice = id => doc.querySelector(`.set-language-option[data-language="${id}"]`);
  assert.equal(choice('en').getAttribute('aria-checked'), 'true');
  assert.equal(choice('zh-Hans').querySelector('.set-language-native').lang, 'zh-Hans');
  assert.equal(choice('zh-Hans').querySelector('img').getAttribute('src'), 'flags/CN.svg');
  assert.equal(choice('pt-BR').querySelector('img').getAttribute('src'), 'flags/BR.svg');
  assert.equal(choice('da').querySelector('.set-language-native').textContent, 'Dansk');
  assert.equal(choice('da').querySelector('.set-language-alt').textContent, 'Danish');
  assert.doesNotMatch(doc.querySelector('.set-language').textContent, /still in English|saved in this browser/, 'No notes under the language list');

  choice('zh-Hans').focus(); choice('zh-Hans').click();
  await settle();
  assert.equal(a.store[LANGUAGE_STORAGE_KEY], 'zh-Hans');
  assert.equal(doc.getElementById('settings').hidden, false, 'Settings stay open');
  assert.equal(doc.getElementById('settings').lang, 'zh-Hans');
  assert.equal(categoryName(a), '语言');
  assert.equal(doc.querySelector('.set-category .lib-dd-btn .set-category-copy').dataset.eyebrow, '设置', 'The CSS eyebrow label is translated too');
  assert.doesNotMatch(css, /content:\s*["'][A-Za-z]/, 'Visible CSS text must come from translatable markup');
  assert.equal(choice('zh-Hans').getAttribute('aria-checked'), 'true');
  assert.equal(choice('en').querySelector('.set-language-alt').textContent, '英语');
  assert.equal(doc.activeElement, choice('zh-Hans'), 'Focus stays on the chosen language');
  assert.equal(a.state.positions, positions); assert.equal(a.state.idx, idx);
  assert.equal(a.state.settings.language, undefined, 'Kept apart from resettable settings');

  choice('fr').click();
  await settle();
  assert.equal(a.store[LANGUAGE_STORAGE_KEY], 'fr');
  assert.equal(categoryName(a), 'Langue');
  assert.equal(choice('en').querySelector('.set-language-alt').textContent, 'Anglais');

  choice('pt-BR').focus();
  choice('pt-BR').dispatchEvent(new a.dom.window.KeyboardEvent('keydown', {key: 'ArrowUp', bubbles: true}));
  await settle();
  assert.equal(a.store[LANGUAGE_STORAGE_KEY], 'en');
  assert.equal(categoryName(a), 'Language');
  assert.equal(doc.activeElement, choice('en'));
  assert.equal(a.state.idx, idx, 'Arrow keys in the list do not move through the game');
});

test('resetting every settings category leaves the language choice alone', async t => {
  const a = startup(t, {savedLanguage: 'zh-Hans'});
  await a.start();
  a.call('toggleSettings');
  await a.call('resetVisualSettings'); await a.call('resetEngineSettings'); await a.call('resetReviewSettings');
  await a.call('resetSettingKeys', a.run('SOUND_SETTING_KEYS'));
  await settle();
  assert.equal(a.store[LANGUAGE_STORAGE_KEY], 'zh-Hans');
  assert.equal(a.dom.window.document.getElementById('settings').lang, 'zh-Hans');
});
