// Supported interface languages. To add one:
//   1. add an entry below (id is a BCP 47 tag; include the script when the
//      language has more than one, e.g. zh-Hans vs zh-Hant),
//   2. add lib/i18n/messages/<id>.js and register it in lib/i18n/index.js.
// `flag` names a bundled flag in flags/<flag>.svg. The flag is decoration only;
// the native name is what identifies the language.
export const LANGUAGES = Object.freeze([
  Object.freeze({id: "en", language: "en", nativeName: "English", flag: "GB"}),
  Object.freeze({id: "zh-Hans", language: "zh", script: "Hans", nativeName: "简体中文", flag: "CN"}),
]);
export const DEFAULT_LANGUAGE = "en";
// Its own storage key, apart from `settings`, so release resets and the
// "Reset all … settings" buttons never touch the language choice.
export const LANGUAGE_STORAGE_KEY = "language";

export function languageById(id) {
  return LANGUAGES.find(language => language.id === id) || null;
}
export function isSupportedLanguage(id) {
  return languageById(id) !== null;
}

// Chinese regions that write Traditional characters when a tag has no script.
const TRADITIONAL_REGIONS = new Set(["TW", "HK", "MO"]);
function parseTag(tag) {
  if (typeof tag !== "string" || !tag.trim()) return null;
  const normalized = tag.trim().replaceAll("_", "-");
  try {
    // maximize() fills in the likely script: zh → Hans, zh-TW → Hant, zh-SG → Hans.
    const locale = new Intl.Locale(normalized).maximize();
    return {language: locale.language.toLowerCase(), script: locale.script || "", region: locale.region || ""};
  } catch {
    // Without Intl.Locale (or for a malformed tag) read the subtags directly.
    const parts = normalized.split("-");
    if (!/^[a-z]{2,3}$/i.test(parts[0])) return null;
    const script = parts.find((part, index) => index && /^[a-z]{4}$/i.test(part)) || "";
    const region = (parts.find((part, index) => index && /^(?:[a-z]{2}|\d{3})$/i.test(part)) || "").toUpperCase();
    let fullScript = script ? script[0].toUpperCase() + script.slice(1).toLowerCase() : "";
    if (!fullScript && parts[0].toLowerCase() === "zh") fullScript = TRADITIONAL_REGIONS.has(region) ? "Hant" : "Hans";
    return {language: parts[0].toLowerCase(), script: fullScript, region};
  }
}

// The supported language for one browser tag, or null. Script matters:
// zh-TW / zh-Hant never resolve to Simplified Chinese.
export function matchLanguage(tag) {
  const parsed = parseTag(tag);
  if (!parsed) return null;
  const match = LANGUAGES.find(language => language.language === parsed.language
    && (!language.script || language.script === parsed.script));
  return match ? match.id : null;
}

// First supported language in the browser's ordered preferences, else English.
export function suggestLanguage(tags) {
  for (const tag of Array.isArray(tags) ? tags : [tags]) {
    const id = matchLanguage(tag);
    if (id) return id;
  }
  return DEFAULT_LANGUAGE;
}

export function browserLanguages(navigator = globalThis.navigator) {
  const list = Array.isArray(navigator?.languages) && navigator.languages.length ? navigator.languages : [navigator?.language];
  return list.filter(tag => typeof tag === "string" && tag);
}
