import { browserAPI } from "./browser-compat.js";
import { UI_SETUPS } from "./lib/ui-setups.js";

// Keep this minimum version and marker fixed in future releases. Users who skip
// 0.4.0 still receive Modern; users who have migrated keep their later edits.
const RESET_RELEASE = "0.4.0";
const RESET_MARKER = "settingsResetFor040";
// 0.5.0 returns every tab style (Settings → Visual → Tabs) to its default once.
// Panel placements, layout and all other preferences are untouched. Keep this
// minimum version and marker fixed too, so later choices are never reset again.
const TAB_RESET_RELEASE = "0.5.0";
const TAB_RESET_MARKER = "tabStylesResetFor050";
const DEFAULT_TAB_STYLES = { ...UI_SETUPS.modern.designs, barStyle: "flat2" };
const PRESERVED_SETTINGS = [
  "sound", "soundVolume", "soundFx", "puzzleSuccessSound", "puzzleIncorrectSound",
  "moveAnim", "uiAnim", "animSpeed", "learningTransition",
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
  const resetTabs = versionAtLeast(browserAPI.runtime.getManifest().version, TAB_RESET_RELEASE);
  return navigator.locks.request("chess-review-release-settings", async () => {
    const stored = await browserAPI.storage.local.get([RESET_MARKER, TAB_RESET_MARKER, "settings", "layout", "layoutVersion"]);
    if (stored[RESET_MARKER]) {
      if (!resetTabs || stored[TAB_RESET_MARKER]) return;
      // Only the tab styles change. A setup whose designs no longer match
      // (for example Old) is labelled Custom on the next review startup.
      await browserAPI.storage.local.set({
        settings: { ...(stored.settings || {}), ...DEFAULT_TAB_STYLES },
        [TAB_RESET_MARKER]: true,
      });
      return;
    }

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
    // The full reset already saves the default tab styles, so it completes both steps.
    if (resetTabs) Object.assign(reset.settings, DEFAULT_TAB_STYLES);
    await browserAPI.storage.local.set({ ...reset, [RESET_MARKER]: true, ...(resetTabs ? { [TAB_RESET_MARKER]: true } : {}) });
  });
}
