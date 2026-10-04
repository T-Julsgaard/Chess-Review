import { browserAPI } from "./browser-compat.js";

// This is a one-off migration for 0.2.1. Keep both values fixed in future releases:
// users who skip this release must not have their settings reset by a later one.
const RESET_RELEASE = "0.2.1";
const RESET_MARKER = "settingsResetFor021";

export async function resetSettingsForRelease(details) {
  if (browserAPI.runtime.getManifest().version !== RESET_RELEASE) return;
  if (details.reason !== "install" && details.reason !== "update") return;
  const stored = await browserAPI.storage.local.get(RESET_MARKER);
  if (stored[RESET_MARKER]) return;

  // New installs already use the defaults. Mark them so reinstalling/reloading
  // the same release cannot subsequently wipe a user's new customizations.
  const reset = details.reason === "update" ? {
    settings: {},
    layout: null,
    layoutMode: "auto",
    // Invalidate old layouts and let startup restore the browser's default zoom.
    layoutVersion: 0,
  } : {};
  // Write the preferences and completion marker together. Never clear storage:
  // username, library entries (including favorites), analyses and caches survive.
  await browserAPI.storage.local.set({ ...reset, [RESET_MARKER]: true });
}
