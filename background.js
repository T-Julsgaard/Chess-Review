// background.js — MV3 background (a real service worker on Chrome; Firefox has no MV3 service
// worker support, so it falls back to manifest.json's "background.scripts" and runs this as a
// module background page instead — see browser-compat.js for the chrome/browser API split that
// falls out of that). Handles the keyboard shortcut and the in-page "Free game review" button. The
// toolbar icon itself uses a default_popup (popup.html), so a click ALWAYS opens the anchored popup
// — whether the icon is pinned or tucked in the overflow menu — and the popup runs the analyze flow
// from there. (openPopup() can't anchor a popup for an unpinned action, which is why we don't drive
// the click from here anymore.)

import { analyzeActiveTab, openAnalysisTab, reloadActiveAndAnalyze } from "./analyze-flow.js";
import { browserAPI } from "./browser-compat.js";
import { resetSettingsForRelease } from "./release-settings.js";
import {createImportRequest, checkImport} from "./lib/import-request.js";

const pendingReviews = new Map();
function reviewForTab(tabId, gameKey) {
  const previous = pendingReviews.get(tabId);
  if (previous?.gameKey === gameKey) return previous.promise;
  previous?.request.cancel();
  const entry = {gameKey, request:createImportRequest()};
  entry.promise = runAnalyze(stashError, tabId, entry.request.signal).finally(() => {
    entry.request.dispose();
    if(pendingReviews.get(tabId) === entry)pendingReviews.delete(tabId);
  });
  pendingReviews.set(tabId, entry);
  return entry.promise;
}

browserAPI.runtime.onInstalled.addListener(details =>
  resetSettingsForRelease(details).catch(err => {
    console.error("[Chess Review] release settings reset failed:", err);
  })
);

// Shared game (from a share link caught by content.js) → open the analysis.
// "Free game review" button injected into the chess.com game-over modal → same flow as the popup.
browserAPI.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg && msg.type === "openShared" && msg.payload && msg.payload.pgn) {
    openAnalysisTab(msg.payload, {sourceTabId:sender.tab?.id}).then(() => sendResponse({ok:true}), error => {
      stashError(error);sendResponse({ok:false,error:error.message});
    });
    return true;
  }
  if (msg && msg.type === "freeGameReview") {
    reviewForTab(sender.tab?.id, msg.gameKey || sender.tab?.url || "").then(result => {
      try {sendResponse(result);} catch {}
    });
    return true; // keep the message channel open for the async sendResponse
  }
});

// Keyboard shortcut: the service worker has no UI → on failure, just flash a badge.
browserAPI.commands.onCommand.addListener((command) => {
  if (command === "analyze-current") runAnalyze(showBadgeError);
});

async function runAnalyze(onFail, tabId = null, signal) {
  const request = createImportRequest(signal);
  try {
    checkImport(request.signal);
    await analyzeActiveTab(undefined, tabId, {signal:request.signal});
    return {ok:true};
  } catch (err) {
    // Only a "can't see the game on the page" failure is worth a reload (the SPA hasn't exposed
    // the finished game yet). Username/archive/network errors won't be fixed by reloading.
    if (err.code !== "NO_GAME") { if(!request.signal.aborted)onFail(err); return {ok:false,error:err.message}; }
    try {
      await reloadActiveAndAnalyze(undefined, err.tabId, {signal:request.signal});
      return {ok:true};
    } catch (err2) {
      console.warn("[Chess Analyzer] couldn't analyze active game:", (err2 && err2.message) || err.message);
      if(!request.signal.aborted)onFail(err2 || err);
      return {ok:false,error:(err2 || err).message};
    }
  } finally {request.dispose();}
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
