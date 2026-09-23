// background.js — MV3 background (a real service worker on Chrome; Firefox has no MV3 service
// worker support, so it falls back to manifest.json's "background.scripts" and runs this as a
// classic background page instead — see browser-compat.js for the chrome/browser API split that
// falls out of that). Handles the keyboard shortcut and the in-page "Free game review" button. The
// toolbar icon itself uses a default_popup (popup.html), so a click ALWAYS opens the anchored popup
// — whether the icon is pinned or tucked in the overflow menu — and the popup runs the analyze flow
// from there. (openPopup() can't anchor a popup for an unpinned action, which is why we don't drive
// the click from here anymore.)

import { analyzeActiveTab, openAnalysisTab, reloadActiveAndAnalyze } from "./analyze-flow.js";
import { browserAPI } from "./browser-compat.js";
import { initOpeningsDb, updateDb, UPDATE_ALARM_NAME } from "./openings-db.js";

// Shared game (from a share link caught by content.js) → open the analysis.
// "Free game review" button injected into the chess.com game-over modal → same flow as the popup.
browserAPI.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg && msg.type === "openShared" && msg.payload && msg.payload.pgn) {
    openAnalysisTab(msg.payload);
  }
  if (msg && msg.type === "freeGameReview") {
    // Reply once the flow finishes (analysis tab opened, or fell back) so the in-page button can
    // drop its "Opening review…" cue immediately instead of waiting out its 5s hard cap.
    runAnalyze(stashError).finally(() => { try { sendResponse({ done: true }); } catch {} });
    return true; // keep the message channel open for the async sendResponse
  }
});

// Keyboard shortcut: the service worker has no UI → on failure, just flash a badge.
browserAPI.commands.onCommand.addListener((command) => {
  if (command === "analyze-current") runAnalyze(showBadgeError);
});

// Initialize openings database and schedule 30-day update alarm on startup
initOpeningsDb().catch(console.error);

// Also handle alarm in background (service worker) - use static import for MV3 compatibility
if (browserAPI.alarms) {
  browserAPI.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === UPDATE_ALARM_NAME) {
      updateDb().catch(console.warn);
    }
  });
}

async function runAnalyze(onFail) {
  const { username } = await browserAPI.storage.local.get("username");
  try {
    await analyzeActiveTab(username);
  } catch (err) {
    // Only a "can't see the game on the page" failure is worth a reload (the SPA hasn't exposed
    // the finished game yet). Username/archive/network errors won't be fixed by reloading.
    if (err.code !== "NO_GAME") { onFail(err); return; }
    try {
      await reloadActiveAndAnalyze(username);
    } catch (err2) {
      console.warn("[Chess Analyzer] couldn't analyze active game:", (err2 && err2.message) || err.message);
      onFail(err2 || err);
    }
  }
}

// Stash the failure reason so the popup can surface it (with the paste box open) next time it opens.
function stashError(err) {
  try { browserAPI.storage.local.set({ pendingError: (err && err.message) || "" }); } catch {}
}

function showBadgeError() {
  browserAPI.action.setBadgeText({ text: "!" });
  browserAPI.action.setBadgeBackgroundColor({ color: "#c0392b" });
  setTimeout(() => browserAPI.action.setBadgeText({ text: "" }), 4000);
}
