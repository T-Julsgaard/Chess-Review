// Interface translation. Catalogs are bundled with the extension; nothing is fetched
// from the network.
//
//   await loadLanguage("fr");                load a bundled catalog (English needs none)
//   const i18n = createTranslator("fr");
//   i18n.t("language.settings.title")        stable identifier → text (English fallback)
//   i18n.text("Reset layout")                English source text → text (unchanged if missing)
//   i18n.format("Preview {0} effect", name)  translated template, arguments inserted as given
//   i18n.localize(element)                   translates a rendered subtree in place
//
// English is built in and never goes through a catalog. Other catalogs are only
// imported when someone chooses that language, so a broken or missing catalog
// can never affect English, and for other languages it falls back to English.
//
// See docs/TRANSLATIONS.md for adding a language or strings.
import { DEFAULT_LANGUAGE, isSupportedLanguage } from "./languages.js";
import en from "./messages/en.js";

export * from "./languages.js";

const CATALOGS = new Map([[DEFAULT_LANGUAGE, en]]);
const PLACEHOLDER = /\{(\d+)\}/g;
const LOCALIZED_ATTRIBUTES = ["title", "aria-label", "placeholder", "alt"];
const escapeRegExp = value => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const isRecord = value => !!value && typeof value === "object" && !Array.isArray(value);
const importCatalog = id => import(`./messages/${id}.js`);

// Keeps only string values, so a malformed entry is simply missing (English).
function stringTable(table) {
  if (!isRecord(table)) return {};
  return Object.fromEntries(Object.entries(table).filter(([key, value]) => typeof key === "string" && typeof value === "string" && value.trim()));
}
function cleanCatalog(catalog) {
  if (!isRecord(catalog)) return null;
  const context = isRecord(catalog.context)
    ? Object.fromEntries(Object.entries(catalog.context).map(([name, table]) => [name, stringTable(table)])) : {};
  return { messages: stringTable(catalog.messages), text: stringTable(catalog.text), context };
}

// Loads the catalog for `id`. Resolves true when it is ready, false when the
// language is unknown or its catalog could not be loaded (the interface then
// stays English). Never rejects.
const pending = new Map();
export function loadLanguage(id, importer = importCatalog) {
  if (CATALOGS.has(id)) return Promise.resolve(true);
  if (!isSupportedLanguage(id)) return Promise.resolve(false);
  if (!pending.has(id)) {
    pending.set(id, Promise.resolve().then(() => importer(id)).then(module => {
      const catalog = cleanCatalog(module?.default);
      if (!catalog) throw new TypeError("catalog has no default export");
      CATALOGS.set(id, catalog);
      compiled.delete(id);
      return true;
    }).catch(error => {
      console.warn(`[Chess Review] ${id} translations could not be loaded; showing English.`, error);
      return false;
    }).finally(() => pending.delete(id)));
  }
  return pending.get(id);
}
export function isLanguageLoaded(id) {
  return CATALOGS.has(id);
}

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
    const catalog = CATALOGS.get(id) || en;
    compiled.set(id, { catalog, templates: compileTemplates(catalog.text || {}) });
  }
  return compiled.get(id);
}

// A language whose catalog is not loaded yet gives the English translator.
export function createTranslator(languageId) {
  const language = isSupportedLanguage(languageId) && CATALOGS.has(languageId) ? languageId : DEFAULT_LANGUAGE;
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

  // Missing text stays English; surrounding whitespace is preserved. Any error
  // while translating shows the English text instead.
  function text(source, context = "") {
    if (english || typeof source !== "string" || !/[A-Za-z]/.test(source)) return source;
    try {
      const [, before, core, after] = /^(\s*)([\s\S]*?)(\s*)$/.exec(source);
      const translated = translateCore(core, context, 0);
      return typeof translated !== "string" || translated === core ? source : before + translated + after;
    } catch {
      return source;
    }
  }

  function format(template, ...args) {
    return fillPlaceholders(text(template), args);
  }

  // Translate rendered text nodes and labelling attributes below `root`.
  // Elements marked translate="no" (language names, user content) are left alone,
  // and data-i18n-context on an ancestor selects context-specific wording.
  function localize(root) {
    if (english || !root) return root;
    try {
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
    } catch (error) {
      console.warn("[Chess Review] translation skipped:", error);
    }
    return root;
  }

  return { language, t, text, format, localize };
}
