// browser-compat.js — Firefox's `browser.*` namespace is Promise-native; Chrome's `chrome.*`
// namespace only gained Promise support under Manifest V3. Prefer the native `browser` global
// (Firefox/Zen) and fall back to `chrome` (Chrome/Chromium), so every `await browserAPI.x()` call
// resolves the same way in both. Falls through to `undefined` outside an extension context (e.g.
// the pure-Node tooling that imports gamecache.js).
export const browserAPI =
  typeof browser !== "undefined" ? browser
  : typeof chrome !== "undefined" ? chrome
  : undefined;
