import { browserAPI } from "./browser-compat.js";
import { UI_SETUPS, MODERN_LAYOUT } from "./lib/ui-setups.js";

// Keep this minimum version and marker fixed in future releases. Users who skip
// 0.4.0 still receive Modern; users who have migrated keep their later edits.
const RESET_RELEASE = "0.4.0";
const RESET_MARKER = "settingsResetFor040";
// 0.5.0 returns every tab style (Settings → Visual → Tabs) to its default once.
// Panel placements, layout and all other preferences are untouched, apart from
// the untouched 0.4.0 Modern eval bar described below. Keep this
// minimum version and marker fixed too, so later choices are never reset again.
const TAB_RESET_RELEASE = "0.5.0";
const TAB_RESET_MARKER = "tabStylesResetFor050";
const DEFAULT_TAB_STYLES = { ...UI_SETUPS.modern.designs, barStyle: "flat2" };
const PRESERVED_SETTINGS = [
  "sound", "soundVolume", "soundFx", "puzzleSuccessSound", "puzzleIncorrectSound",
  "moveAnim", "uiAnim", "animSpeed", "learningTransition",
];
// 0.4.0 saved the Modern arrangement on the first review. 0.5.0 moved its eval bar,
// so an untouched 0.4.0 arrangement would no longer count as Modern and would lose
// its responsive fit. Only that exact arrangement is updated; a layout the user
// edited is left as it is.
const MODERN_EVALBAR_040 = { x: 254.04, y: 52.42405289710294, w: 27.115889429536, h: 737.5521924833793, scale: 0.9038629809845334 };
function sameBox(box, expected) {
  return ["x", "y", "w", "h", "scale"].every(prop =>
    Math.abs((box?.[prop] ?? (prop === "scale" ? 1 : NaN)) - (expected[prop] ?? 1)) < 1e-6);
}
function untouchedModern040(layout) {
  if (!layout || typeof layout !== "object") return false;
  return Object.keys(layout).every(key => Object.hasOwn(MODERN_LAYOUT, key))
    && Object.entries(MODERN_LAYOUT).every(([key, box]) => sameBox(layout[key], key === "evalbar" ? MODERN_EVALBAR_040 : box));
}

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
      if (!resetTabs) return;
      const update = {};
      if (!stored[TAB_RESET_MARKER]) {
        // Only the tab styles change. A setup whose designs no longer match
        // (for example Old) is labelled Custom on the next review startup.
        update.settings = { ...(stored.settings || {}), ...DEFAULT_TAB_STYLES };
        update[TAB_RESET_MARKER] = true;
      }
      // Not tied to the tab-reset marker: an early 0.5.0 build completed that step
      // before the eval bar moved. An updated layout no longer matches, so this
      // still happens only once.
      if (untouchedModern040(stored.layout)) update.layout = { ...stored.layout, evalbar: { ...MODERN_LAYOUT.evalbar } };
      if (Object.keys(update).length) await browserAPI.storage.local.set(update);
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
