// English source text for interface strings that have stable identifiers.
// Every other catalog falls back to these entries, so a missing translation
// shows English rather than an identifier.
//
// The existing settings panel is written with English literals in analysis.js.
// Those are translated by their English source text instead (see `text` in the
// other catalogs), so English needs no `text` table.
export default {
  messages: {
    "language.settings.title": "Language",
    "language.settings.intro": "Changes apply straight away and are saved in this browser.",
    "language.settings.coverage": "Only Settings is translated so far. The rest of Chess Review is still in English.",
    "language.name.en": "English",
    "language.name.pt-BR": "Brazilian Portuguese",
    "language.name.es": "Spanish",
    "language.name.ru": "Russian",
    "language.name.tr": "Turkish",
    "language.name.id": "Indonesian",
    "language.name.fr": "French",
    "language.name.it": "Italian",
    "language.name.vi": "Vietnamese",
    "language.name.de": "German",
    "language.name.pl": "Polish",
    "language.name.uk": "Ukrainian",
    "language.name.ar": "Arabic",
    "language.name.hi": "Hindi",
    "language.name.zh-Hans": "Simplified Chinese",
    "language.name.da": "Danish",
  },
};
