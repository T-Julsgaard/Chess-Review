// English source text for interface strings that have stable identifiers.
// Every other catalog falls back to these entries, so a missing translation
// shows English rather than an identifier.
//
// The existing settings panel is written with English literals in analysis.js.
// Those are translated by their English source text instead (see `text` in the
// other catalogs), so English needs no `text` table.
export default {
  messages: {
    "language.picker.title": "Choose your language",
    "language.picker.intro": "Pick the language for Chess Review. You can change it any time in Settings.",
    "language.picker.options": "Languages",
    "language.picker.suggested": "Suggested",
    "language.picker.confirm": "Continue",
    "language.picker.later": "Decide later",
    "language.settings.title": "Language",
    "language.settings.intro": "Changes apply straight away and are saved in this browser.",
    "language.settings.coverage": "Settings and the language choice are translated. The rest of Chess Review is still in English.",
    "language.name.en": "English",
    "language.name.zh-Hans": "Simplified Chinese",
  },
};
