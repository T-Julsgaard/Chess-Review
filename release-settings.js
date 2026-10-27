import { browserAPI } from "./browser-compat.js";
import { UI_SETUPS } from "./lib/ui-setups.js";

// Keep this minimum version and marker fixed in future releases. Users who skip
// 0.4.0 still receive Modern; users who have migrated keep their later edits.
const RESET_RELEASE = "0.4.0";
const RESET_MARKER = "settingsResetFor040";
const PRESERVED_SETTINGS = [
  "sound", "soundVolume", "soundFx", "puzzleSuccessSound", "puzzleIncorrectSound",
  "moveAnim", "animSpeed", "learningTransition",
];

function versionAtLeast(actual, minimum) {
  const current = actual.split(".").map(Number), required = minimum.split(".").map(Number);
  for (let i = 0; i < Math.max(current.length, required.length); i++) {
    const difference = (current[i] || 0) - (required[i] || 0);
    if (difference) return difference > 0;
  }
  return true;
}

export async function resetSettingsForRelease(details) {
  if (!versionAtLeast(browserAPI.runtime.getManifest().version, RESET_RELEASE)) return;
  if (!["install", "update", "startup"].includes(details.reason)) return;
  // Background update handling and review startup share an origin-scoped lock.
  // A review must wait for the reset before loading or saving any preferences.
  return navigator.locks.request("chess-review-release-settings", async () => {
    const stored = await browserAPI.storage.local.get([RESET_MARKER, "settings", "layout", "layoutVersion"]);
    if (stored[RESET_MARKER]) return;

    // Seed the same durable defaults for upgrades and new installations. Startup
    // retries a missed update before reading preferences or painting the workspace.
    const preserved = Object.fromEntries(PRESERVED_SETTINGS
      .filter(key => Object.hasOwn(stored.settings || {}, key))
      .map(key => [key, stored.settings[key]]));
    const reset = {
      settings: { ...preserved, ...UI_SETUPS.modern.designs,
        uiSetup: "modern", uiSetupBase: "modern", engineLines: 2, classifyLines: 2 },
      layout: null,
      layoutMode: UI_SETUPS.modern.layoutMode,
      // Invalidate old layouts and let startup restore the browser's default zoom.
      layoutVersion: 0,
    };
    // Write preferences and completion together. Never clear storage: username,
    // library entries (including favorites), analyses, caches, player history,
    // learning progress and the independent announcement markers survive.
    await browserAPI.storage.local.set({ ...reset, [RESET_MARKER]: true });
  });
}
