// Supported interface languages. To add one:
//   1. add an entry below (id is a BCP 47 tag; include the script when the
//      language has more than one, e.g. zh-Hans vs zh-Hant),
//   2. add lib/i18n/messages/<id>.js (see docs/TRANSLATIONS.md).
// `flag` names a bundled flag in flags/<flag>.svg. The flag is decoration only;
// the native name is what identifies the language.
//
// English is always the default. The browser's language is never used to pick
// one: people choose in Settings → Language, which Settings opens on.
const language = (id, nativeName, flag) => Object.freeze({id, nativeName, flag});
export const LANGUAGES = Object.freeze([
  language("en", "English", "GB"),
  language("pt-BR", "Português (Brasil)", "BR"),
  language("es", "Español", "ES"),
  language("ru", "Русский", "RU"),
  language("tr", "Türkçe", "TR"),
  language("id", "Bahasa Indonesia", "ID"),
  language("fr", "Français", "FR"),
  language("it", "Italiano", "IT"),
  language("vi", "Tiếng Việt", "VN"),
  language("de", "Deutsch", "DE"),
  language("pl", "Polski", "PL"),
  language("uk", "Українська", "UA"),
  language("ar", "العربية", "SA"),
  language("hi", "हिन्दी", "IN"),
  language("zh-Hans", "简体中文", "CN"),
  language("da", "Dansk", "DK"),
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
