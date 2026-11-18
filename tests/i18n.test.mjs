import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {app, loadGame, settle} from './helpers/app.mjs';
import {settingsStrings} from './helpers/settings-text.mjs';
import {LANGUAGES, DEFAULT_LANGUAGE, LANGUAGE_STORAGE_KEY, createTranslator, matchLanguage, suggestLanguage, browserLanguages} from '../lib/i18n/index.js';
import en from '../lib/i18n/messages/en.js';
import zhHans from '../lib/i18n/messages/zh-Hans.js';
import {MOVE_GRADE_CONFIG} from '../move-grades.js';

const html = fs.readFileSync(new URL('../analysis.html', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
const GRADE_NAMES = ['Brilliant', 'Great', 'Best', 'Excellent', 'Good', 'Book', 'Inaccuracy', 'Mistake', 'Miss', 'Blunder'];

// Real startup through main(), as the toolbar, in-page button and shortcut all open it.
function startup(t, {languages = ['en-US'], savedLanguage = null, url = 'https://extension.test/analysis.html#test-game'} = {}) {
  const a = app(t, {html, url, languages, savedLanguage});
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
const key = (a, name, init = {}) => {
  const event = new a.dom.window.KeyboardEvent('keydown', {key: name, bubbles: true, cancelable: true, ...init});
  (a.dom.window.document.activeElement || a.dom.window.document.body).dispatchEvent(event);
  return event;
};
const picker = a => a.dom.window.document.querySelector('.lang-card');
const option = (a, id) => a.dom.window.document.querySelector(`.lang-option[data-language="${id}"]`);

test('browser languages resolve by language and script, in preference order, with English as fallback', () => {
  for (const tag of ['en', 'en-US', 'en-GB', 'EN_au']) assert.equal(matchLanguage(tag), 'en', tag);
  for (const tag of ['zh', 'zh-CN', 'zh-SG', 'zh-Hans', 'zh-Hans-HK', 'zh_CN', 'zh-hans-cn']) assert.equal(matchLanguage(tag), 'zh-Hans', tag);
  for (const tag of ['zh-TW', 'zh-HK', 'zh-MO', 'zh-Hant', 'zh-Hant-CN', 'fr', 'ja-JP', '', ' ', '!!', null, undefined, 42])
    assert.equal(matchLanguage(tag), null, String(tag));
  assert.equal(suggestLanguage(['fr-FR', 'zh-CN', 'en']), 'zh-Hans');
  assert.equal(suggestLanguage(['en-US', 'zh-CN']), 'en');
  assert.equal(suggestLanguage(['zh-TW', 'zh-CN']), 'zh-Hans', 'Traditional is skipped, not mapped to Simplified');
  assert.equal(suggestLanguage(['zh-TW', 'fr']), 'en');
  assert.equal(suggestLanguage([]), 'en');
  assert.deepEqual(browserLanguages({languages: ['de', 'zh-CN'], language: 'de'}), ['de', 'zh-CN']);
  assert.deepEqual(browserLanguages({languages: [], language: 'zh-SG'}), ['zh-SG']);
  assert.deepEqual(browserLanguages({}), []);
});

test('script matching still works where Intl.Locale is unavailable', t => {
  const Locale = Intl.Locale;
  Intl.Locale = class { constructor() { throw TypeError('unsupported'); } };
  t.after(() => { Intl.Locale = Locale; });
  assert.equal(matchLanguage('zh'), 'zh-Hans');
  assert.equal(matchLanguage('zh-SG'), 'zh-Hans');
  assert.equal(matchLanguage('zh_Hans_HK'), 'zh-Hans');
  for (const tag of ['zh-TW', 'zh-HK', 'zh-Hant', 'zh-Hant-CN']) assert.equal(matchLanguage(tag), null, tag);
  assert.equal(matchLanguage('en-US'), 'en');
});

test('every language has a native name, a bundled flag and every stable message', () => {
  assert.equal(DEFAULT_LANGUAGE, 'en');
  assert.equal(LANGUAGE_STORAGE_KEY, 'language');
  assert.equal(new Set(LANGUAGES.map(language => language.id)).size, LANGUAGES.length);
  for (const language of LANGUAGES) {
    assert.ok(language.nativeName.trim(), language.id);
    assert.ok(fs.existsSync(new URL(`../flags/${language.flag}.svg`, import.meta.url)), language.flag);
    const translator = createTranslator(language.id);
    assert.equal(translator.language, language.id);
    for (const id of Object.keys(en.messages)) assert.notEqual(translator.t(id), id, `${language.id} ${id}`);
  }
  for (const id of Object.keys(en.messages)) assert.ok(Object.hasOwn(zhHans.messages, id), `zh-Hans lacks ${id}`);
  for (const id of Object.keys(zhHans.messages)) assert.ok(Object.hasOwn(en.messages, id), `zh-Hans has unknown ${id}`);
  // Common Traditional-only forms must not slip into the Simplified catalog.
  for (const value of [...Object.values(zhHans.messages), ...Object.values(zhHans.text)])
    assert.doesNotMatch(value, /[發後點與學說這們會開關設語選擇對]/, value);
});

test('missing translations fall back to English and placeholders, context and whitespace are handled', () => {
  const zh = createTranslator('zh-Hans'), english = createTranslator('en'), unsupported = createTranslator('fr');
  assert.equal(unsupported.language, 'en');
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
  assert.equal(zh.text('Check'), '将军');
  assert.equal(zh.text('Check', 'badge-symbol'), '对勾');
  assert.equal(zh.text('05 · Weighted Snap'), '05 · 厚重咔嗒');
  assert.equal(zh.text('?! · Dubious'), '?! · 存疑');
  assert.equal(zh.text('Sound 04'), '音效 04');
  assert.equal(zh.text('+3 st'), '+3 半音');
  assert.equal(zh.format('Preview {0} effect', 'Brilliant'), '预览 Brilliant 特效');
});

test('move grade names are never translated', () => {
  const zh = createTranslator('zh-Hans');
  const names = new Set([...GRADE_NAMES, ...Object.values(MOVE_GRADE_CONFIG).map(config => config.label).filter(Boolean)]);
  for (const name of names) {
    assert.equal(zh.text(name), name, name);
    assert.ok(!Object.hasOwn(zhHans.text, name), `${name} must stay English`);
  }
});

test('localize translates text and labels but leaves translate="no" content alone', t => {
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

test('first use shows the picker over the opened game, suggests the browser language and saves only a confirmed choice', async t => {
  const a = startup(t, {languages: ['fr-FR', 'zh-CN', 'en-US']}), doc = a.dom.window.document;
  await a.start();
  const card = picker(a);
  assert.ok(card, 'Picker shown on first use');
  assert.equal(card.getAttribute('role'), 'dialog');
  assert.equal(card.getAttribute('aria-modal'), 'true');
  assert.equal(card.lang, 'zh-Hans');
  assert.equal(card.querySelector('.lang-title').textContent, '选择语言');
  assert.equal(option(a, 'zh-Hans').getAttribute('aria-checked'), 'true');
  assert.equal(option(a, 'zh-Hans').querySelector('.lang-badge').textContent, '推荐');
  assert.equal(option(a, 'en').querySelector('.lang-badge').hidden, true);
  assert.equal(option(a, 'en').querySelector('.lang-native').textContent, 'English');
  assert.equal(option(a, 'en').querySelector('.lang-native').lang, 'en');
  assert.equal(option(a, 'zh-Hans').querySelector('.lang-flag').getAttribute('src'), 'flags/CN.svg');
  assert.equal(option(a, 'en').querySelector('.lang-flag').getAttribute('src'), 'flags/GB.svg');
  assert.equal(option(a, 'en').querySelector('.lang-flag').alt, '', 'The flag is decoration; the name identifies the language');
  assert.equal(doc.activeElement, option(a, 'zh-Hans'));
  assert.equal(doc.querySelector('.app').inert, true);
  assert.equal(a.announcements, 0, 'The puzzles announcement waits for the picker');
  assert.equal(a.state.pgn, '1. e4 e5 2. Nf3', 'The game being opened is loaded underneath');
  assert.equal(a.store[LANGUAGE_STORAGE_KEY], undefined, 'Nothing is saved before confirming');

  // Highlighting English previews the picker in English; confirming saves it.
  option(a, 'en').click();
  assert.equal(card.lang, 'en');
  assert.equal(card.querySelector('.lang-title').textContent, 'Choose your language');
  assert.equal(option(a, 'zh-Hans').querySelector('.lang-alt').textContent, 'Simplified Chinese');
  option(a, 'zh-Hans').click();
  card.querySelector('.lang-confirm').click();
  await settle();
  assert.equal(a.store[LANGUAGE_STORAGE_KEY], 'zh-Hans');
  assert.equal(picker(a), null);
  assert.equal(doc.querySelector('.app').inert, false);
  assert.equal(a.announcements, 1);
  assert.equal(doc.querySelector('[data-settings-toggle]').getAttribute('aria-label'), '设置');
  assert.equal(a.state.pgn, '1. e4 e5 2. Nf3');
  a.call('toggleSettings');
  assert.equal(doc.getElementById('settings').lang, 'zh-Hans');
  assert.equal(doc.querySelector('.set-category-name').textContent, '外观');
});

test('closing without confirming saves nothing and the picker returns on the next visit', async t => {
  const store = {};
  for (const close of ['escape', 'later']) {
    const a = startup(t, {languages: ['zh-TW', 'de-DE']}), doc = a.dom.window.document;
    Object.assign(a.store, store);
    await a.start();
    assert.ok(picker(a), `Picker offered again (${close})`);
    assert.equal(option(a, 'en').getAttribute('aria-checked'), 'true', 'Unsupported and Traditional locales suggest English');
    assert.equal(option(a, 'en').querySelector('.lang-badge').textContent, 'Suggested');
    if (close === 'escape') key(a, 'Escape'); else doc.querySelector('.lang-later').click();
    await settle();
    assert.equal(picker(a), null);
    assert.equal(doc.querySelector('.app').inert, false);
    assert.equal(a.announcements, 1);
    assert.equal(Object.hasOwn(a.store, LANGUAGE_STORAGE_KEY), false);
    assert.ok(!a.writes.some(write => Object.hasOwn(write, LANGUAGE_STORAGE_KEY)));
    assert.equal(doc.querySelector('[data-settings-toggle]').getAttribute('aria-label'), 'Settings');
    Object.assign(store, a.store);
  }
});

test('picker keyboard: arrows choose, Tab stays inside, Enter confirms and keys never reach the board', async t => {
  const a = startup(t, {languages: ['en-GB']}), doc = a.dom.window.document;
  await a.start();
  const before = a.state.idx;
  assert.equal(doc.activeElement, option(a, 'en'));
  key(a, 'ArrowDown');
  assert.equal(doc.activeElement, option(a, 'zh-Hans'));
  assert.equal(picker(a).lang, 'zh-Hans');
  key(a, 'ArrowDown');
  assert.equal(doc.activeElement, option(a, 'en'), 'Arrows wrap');
  key(a, 'End'); assert.equal(doc.activeElement, option(a, 'zh-Hans'));
  key(a, 'Home'); assert.equal(doc.activeElement, option(a, 'en'));
  key(a, 'ArrowLeft'); assert.equal(doc.activeElement, option(a, 'zh-Hans'));
  assert.equal(a.state.idx, before, 'Arrow keys do not step through the game');
  key(a, 'Tab'); assert.equal(doc.activeElement, doc.querySelector('.lang-later'));
  key(a, 'Tab'); assert.equal(doc.activeElement, doc.querySelector('.lang-confirm'));
  key(a, 'Tab'); assert.equal(doc.activeElement, option(a, 'zh-Hans'), 'Focus wraps to the chosen language');
  key(a, 'Tab', {shiftKey: true}); assert.equal(doc.activeElement, doc.querySelector('.lang-confirm'));
  option(a, 'zh-Hans').focus();
  assert.equal(option(a, 'en').tabIndex, -1, 'One tab stop for the group');
  key(a, 'Enter');
  await settle();
  assert.equal(picker(a), null);
  assert.equal(a.store[LANGUAGE_STORAGE_KEY], 'zh-Hans');
});

test('a saved language applies at startup without asking again', async t => {
  const a = startup(t, {languages: ['en-US'], savedLanguage: 'zh-Hans'}), doc = a.dom.window.document;
  await a.start();
  assert.equal(picker(a), null);
  assert.equal(a.announcements, 1);
  assert.equal(doc.querySelector('[data-settings-toggle]').getAttribute('aria-label'), '设置');
  a.call('toggleSettings');
  assert.equal(doc.querySelector('.set-category-name').textContent, '外观');
});

test('an unknown saved value counts as no choice', async t => {
  const a = startup(t, {languages: ['zh-SG'], savedLanguage: 'zh-Hant'});
  await a.start();
  assert.ok(picker(a));
  assert.equal(option(a, 'zh-Hans').getAttribute('aria-checked'), 'true');
});

test('the blank workspace asks too, and screen previews never ask', async t => {
  const blank = startup(t, {url: 'https://extension.test/analysis.html?workspace=blank'});
  await blank.start();
  assert.ok(picker(blank));
  const preview = app(t, {url: 'https://extension.test/analysis.html?screen-preview=workspace-blank', savedLanguage: null});
  preview.store.settingsResetFor040 = true;
  await preview.start();
  assert.equal(picker(preview), null);
});

test('a choice saved in another tab closes this picker and applies here', async t => {
  const a = startup(t, {languages: ['en-US']});
  await a.start();
  assert.ok(picker(a));
  a.call('languageStorageChanged', {[LANGUAGE_STORAGE_KEY]: {newValue: 'zh-Hans'}}, 'local');
  assert.equal(picker(a), null);
  assert.equal(a.announcements, 1);
  assert.equal(a.dom.window.document.querySelector('[data-settings-toggle]').getAttribute('aria-label'), '设置');
  a.call('languageStorageChanged', {[LANGUAGE_STORAGE_KEY]: {newValue: 'xx'}}, 'local');
  a.call('languageStorageChanged', {settings: {newValue: {}}}, 'local');
  assert.equal(a.dom.window.document.querySelector('[data-settings-toggle]').getAttribute('aria-label'), '设置');
});

test('Settings → Language switches immediately, keeps the game and remembers the choice', async t => {
  const a = startup(t, {savedLanguage: 'en'}), doc = a.dom.window.document;
  await a.start();
  a.call('go', 2);
  const positions = a.state.positions, idx = a.state.idx;
  a.call('toggleSettings');
  const menu = [...doc.querySelectorAll('.set-category .lib-dd-opt')];
  assert.equal(menu[0].dataset.category, 'language', 'Language is listed first');
  assert.match(menu[0].textContent, /Language.*English · 简体中文/);
  assert.equal(a.state.settingsTab, 'visual', 'Visual stays the default category');
  doc.querySelector('[data-category="language"]').click();
  const list = doc.querySelector('.set-language-list');
  assert.equal(list.getAttribute('role'), 'radiogroup');
  const choice = id => doc.querySelector(`.set-language-option[data-language="${id}"]`);
  assert.equal(choice('en').getAttribute('aria-checked'), 'true');
  assert.equal(choice('zh-Hans').querySelector('.set-language-native').lang, 'zh-Hans');
  assert.equal(choice('zh-Hans').querySelector('img').getAttribute('src'), 'flags/CN.svg');
  assert.match(doc.querySelector('.set-language').textContent, /rest of Chess Review is still in English/);

  choice('zh-Hans').focus(); choice('zh-Hans').click();
  await settle();
  assert.equal(a.store[LANGUAGE_STORAGE_KEY], 'zh-Hans');
  assert.equal(doc.getElementById('settings').hidden, false, 'Settings stay open');
  assert.equal(doc.getElementById('settings').lang, 'zh-Hans');
  assert.equal(doc.querySelector('.set-category-name').textContent, '语言');
  assert.equal(doc.querySelector('.set-category .lib-dd-btn .set-category-copy').dataset.eyebrow, '设置', 'The CSS eyebrow label is translated too');
  assert.doesNotMatch(css, /content:\s*["'][A-Za-z]/, 'Visible CSS text must come from translatable markup');
  assert.equal(choice('zh-Hans').getAttribute('aria-checked'), 'true');
  assert.equal(choice('en').querySelector('.set-language-alt').textContent, '英语');
  assert.equal(doc.activeElement, choice('zh-Hans'), 'Focus stays on the chosen language');
  assert.equal(a.state.positions, positions); assert.equal(a.state.idx, idx);
  assert.equal(a.state.settings.language, undefined, 'Kept apart from resettable settings');

  choice('zh-Hans').dispatchEvent(new a.dom.window.KeyboardEvent('keydown', {key: 'ArrowUp', bubbles: true}));
  await settle();
  assert.equal(a.store[LANGUAGE_STORAGE_KEY], 'en');
  assert.equal(doc.querySelector('.set-category-name').textContent, 'Language');
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
