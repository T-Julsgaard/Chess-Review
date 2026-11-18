// Interface translation. Catalogs are bundled with the extension; nothing is fetched.
//
//   const i18n = createTranslator("zh-Hans");
//   i18n.t("language.picker.title")          stable identifier → text (English fallback)
//   i18n.text("Reset layout")                English source text → text (unchanged if missing)
//   i18n.format("Preview {0} effect", name)  translated template, arguments inserted as given
//   i18n.localize(element)                   translates a rendered subtree in place
//
// See docs/TRANSLATIONS.md for adding a language or strings.
import { DEFAULT_LANGUAGE, isSupportedLanguage } from "./languages.js";
import en from "./messages/en.js";
import zhHans from "./messages/zh-Hans.js";

export * from "./languages.js";

const CATALOGS = Object.freeze({ "en": en, "zh-Hans": zhHans });
const PLACEHOLDER = /\{(\d+)\}/g;
const LOCALIZED_ATTRIBUTES = ["title", "aria-label", "placeholder", "alt"];
const escapeRegExp = value => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export function fillPlaceholders(template, args = []) {
  return String(template).replace(PLACEHOLDER, (match, index) => index < args.length ? String(args[index]) : match);
}

// "{0} badge: {1}" → /^(.+?) badge: (.+?)$/. Longer fixed text is tried first, so
// "{0}, score range {1} to {2}" wins over "{0}, score {1}".
function compileTemplates(table) {
  return Object.entries(table).filter(([key]) => /\{\d+\}/.test(key)).map(([key, value]) => {
    let source = "^", last = 0;
    const order = [];
    for (const match of key.matchAll(PLACEHOLDER)) {
      source += escapeRegExp(key.slice(last, match.index)) + "(.+?)";
      order.push(Number(match[1]));
      last = match.index + match[0].length;
    }
    source += escapeRegExp(key.slice(last)) + "$";
    return { pattern: new RegExp(source, "s"), order, value, fixed: key.replace(PLACEHOLDER, "").length };
  }).sort((a, b) => b.fixed - a.fixed);
}

const compiled = new Map();
function compiledCatalog(id) {
  if (!compiled.has(id)) {
    const catalog = CATALOGS[id] || {};
    compiled.set(id, { catalog, templates: compileTemplates(catalog.text || {}) });
  }
  return compiled.get(id);
}

export function createTranslator(languageId) {
  const language = isSupportedLanguage(languageId) && CATALOGS[languageId] ? languageId : DEFAULT_LANGUAGE;
  const english = language === DEFAULT_LANGUAGE;
  const { catalog, templates } = compiledCatalog(language);
  const table = catalog.text || {};

  function t(id, ...args) {
    const message = catalog.messages?.[id] ?? en.messages[id] ?? id;
    return fillPlaceholders(message, args);
  }

  function translateCore(source, context, depth) {
    const contextual = context && catalog.context?.[context];
    if (contextual && Object.hasOwn(contextual, source)) return contextual[source];
    if (Object.hasOwn(table, source)) return table[source];
    if (depth > 3) return source;
    for (const template of templates) {
      const match = template.pattern.exec(source);
      if (!match) continue;
      const args = [];
      template.order.forEach((index, group) => { args[index] = translateCore(match[group + 1], context, depth + 1); });
      const translated = fillPlaceholders(template.value, args);
      if (translated !== source) return translated;
    }
    return source;
  }

  // Missing text stays English; surrounding whitespace is preserved.
  function text(source, context = "") {
    if (english || typeof source !== "string" || !/[A-Za-z]/.test(source)) return source;
    const [, before, core, after] = /^(\s*)([\s\S]*?)(\s*)$/.exec(source);
    const translated = translateCore(core, context, 0);
    return translated === core ? source : before + translated + after;
  }

  function format(template, ...args) {
    return fillPlaceholders(text(template), args);
  }

  // Translate rendered text nodes and labelling attributes below `root`.
  // Elements marked translate="no" (language names, user content) are left alone,
  // and data-i18n-context on an ancestor selects context-specific wording.
  function localize(root) {
    if (english || !root) return root;
    const skip = node => node?.closest?.('[translate="no"]');
    const contextOf = node => node?.closest?.("[data-i18n-context]")?.dataset.i18nContext || "";
    const walker = root.ownerDocument.createTreeWalker(root, 4); // NodeFilter.SHOW_TEXT
    while (walker.nextNode()) {
      const node = walker.currentNode, parent = node.parentElement;
      if (skip(parent)) continue;
      const translated = text(node.data, contextOf(parent));
      if (translated !== node.data) node.data = translated;
    }
    const selector = LOCALIZED_ATTRIBUTES.map(name => `[${name}]`).join(",");
    for (const element of [root, ...root.querySelectorAll(selector)]) {
      if (skip(element)) continue;
      for (const name of LOCALIZED_ATTRIBUTES) {
        const value = element.getAttribute?.(name);
        if (value == null) continue;
        const translated = text(value, contextOf(element));
        if (translated !== value) element.setAttribute(name, translated);
      }
    }
    return root;
  }

  return { language, t, text, format, localize };
}
