import { browserAPI } from "./browser-compat.js";

// This is a one-off migration for 0.3.0. Keep both values fixed in future releases:
// users who skip this release must not have their settings reset by a later one.
const RESET_RELEASE = "0.3.0";
const RESET_MARKER = "settingsResetFor030";

export async function resetSettingsForRelease(details) {
  if (browserAPI.runtime.getManifest().version !== RESET_RELEASE) return;
  if (!["install", "update", "startup"].includes(details.reason)) return;
  // Background update handling and review startup share an origin-scoped lock.
  // A review must wait for the reset before loading or saving any preferences.
  return navigator.locks.request("chess-review-release-settings", async () => {
    const stored = await browserAPI.storage.local.get([RESET_MARKER, "settings", "layout", "layoutVersion"]);
    if (stored[RESET_MARKER]) return;

    // Startup retries an interrupted/missed update before reading preferences.
    // With no previous preferences, this is a fresh install: only mark it done.
    const hasPreferences = stored.settings != null || stored.layout != null || stored.layoutVersion != null;
    const reset = details.reason === "update" || (details.reason === "startup" && hasPreferences) ? {
      settings: {},
      layout: null,
      layoutMode: "auto",
      // Invalidate old layouts and let startup restore the browser's default zoom.
      layoutVersion: 0,
    } : {};
    // Write preferences and completion together. Never clear storage: username,
    // library entries (including favorites), analyses and caches survive.
    await browserAPI.storage.local.set({ ...reset, [RESET_MARKER]: true });
  });
}
