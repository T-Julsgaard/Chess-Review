// background.js — MV3 background (a real service worker on Chrome; Firefox has no MV3 service
// worker support, so it falls back to manifest.json's "background.scripts" and runs this as a
// module background page instead — see browser-compat.js for the chrome/browser API split that
// falls out of that). Handles the keyboard shortcut and the in-page "Free game review" button. The
// toolbar icon itself uses a default_popup (popup.html), so a click ALWAYS opens the anchored popup
// — whether the icon is pinned or tucked in the overflow menu — and the popup runs the analyze flow
// from there. (openPopup() can't anchor a popup for an unpinned action, which is why we don't drive
// the click from here anymore.)

import { analyzeActiveTab, openAnalysisTab, reloadActiveAndAnalyze, loadGameFromTab, isSupportedChessUrl } from "./analyze-flow.js";
import { browserAPI } from "./browser-compat.js";
import { resetSettingsForRelease } from "./release-settings.js";
import {createImportRequest, checkImport} from "./lib/import-request.js";
import {createButtonPreviewService} from './lib/button-preview-service.js';
import {createPreviewRunner} from './lib/preview-runner.js';
import {rememberAccount, siteForUrl} from './lib/identity.js';
import {createProfileEngineHost} from './lib/profile/engine-sample.js';
import {createProfileStore} from './lib/profile/store.js';
import {loadProfilePgn} from './lib/profile/pgn-source.js';
import {decodeProfile} from './lib/profile/share.js';

// Player profile engine jobs share the offscreen document with review-button previews on
// Chrome; Firefox runs them in this background page. The document stays open while a job runs.
let profileBusy = false;
const previewRunner = createPreviewRunner(browserAPI, undefined, {keepOpen:() => profileBusy});
const buttonPreviews = createButtonPreviewService({api:browserAPI,loadGame:loadGameFromTab,runPreview:previewRunner});
// Created on first use so importing this module touches no storage (Firefox only; Chrome uses the offscreen host).
let localProfileHost = null;
function profileHost() {
  if (localProfileHost === null) localProfileHost = browserAPI.offscreen?.createDocument ? false
    : createProfileEngineHost({store:createProfileStore(browserAPI.storage.local), loadPgn:loadProfilePgn, onBusy:busy => {profileBusy = busy;}});
  return localProfileHost;
}
async function profileEngineRequest(msg) {
  const action = msg.action === 'start' || msg.action === 'cancel' ? msg.action : 'status';
  const host = profileHost();
  if (host) return action === 'start' ? host.start(msg.job) : action === 'cancel' ? host.cancel() : host.status();
  if (action === 'status' && !profileBusy) return {active:false};
  await previewRunner.ensureDocument?.();
  return browserAPI.runtime.sendMessage({target:'profile-engine-host', action, job:msg.job});
}
// Offscreen documents only expose chrome.runtime. Keep storage and cached PGN
// access here, where the normal profile store also supplies its write locks.
async function profileHostData(msg) {
  const args = Array.isArray(msg.args) ? msg.args : [];
  if (msg.action === 'loadPgn') return loadProfilePgn(args[0], args[1], undefined, args[2]);
  if (!['loadEngine', 'saveEngine', 'saveJob'].includes(msg.action)) throw Error('Unknown profile data request');
  return createProfileStore(browserAPI.storage.local)[msg.action](...args);
}
browserAPI.tabs?.onRemoved?.addListener(tabId => buttonPreviews.cancel(tabId));
browserAPI.tabs?.onUpdated?.addListener((tabId,change) => {if (change.url || change.status === 'loading') buttonPreviews.cancel(tabId);});

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

// Leaderboards were removed. Drop their local opt-in, player key, country and
// queued practice scores; learning progress and statistics are untouched.
const RETIRED_LEADERBOARD_KEYS = ["leaderboard:v1", "leaderboard:practice:v1", "leaderboardPreferences:v1", "leaderboardCountry:v1"];

browserAPI.runtime.onInstalled.addListener(details => {
  if (details?.reason === "update") Promise.resolve(browserAPI.storage.local.remove?.(RETIRED_LEADERBOARD_KEYS)).catch(err => {
    console.warn("[Chess Review] retired leaderboard data could not be removed:", err);
  });
  return resetSettingsForRelease(details).catch(err => {
    console.error("[Chess Review] release settings reset failed:", err);
  });
});

// Shared game (from a share link caught by content.js) → open the analysis.
// "Free game review" button injected into the chess.com game-over modal → same flow as the popup.
browserAPI.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.type === 'buttonPreview' || msg?.type === 'cancelButtonPreview') {
    if (sender.frameId !== 0 || !sender.tab || !isSupportedChessUrl(sender.url || sender.tab.url)) return;
    if (msg.type === 'cancelButtonPreview') {buttonPreviews.cancel(sender.tab.id,msg.key); return;}
    buttonPreviews.get(sender.tab.id,msg.key).then(sendResponse);
    return true;
  }
  // A content script saw who is signed in. Only the site's own top frame may report its account.
  if (msg?.type === 'accountSeen') {
    const site = siteForUrl(sender.url || sender.tab?.url);
    if (sender.frameId === 0 && sender.tab && site && site === msg.site) {
      rememberAccount(browserAPI.storage.local, site, msg.name, msg.via).catch(() => {});
    }
    return;
  }
  if (msg?.type === 'profileEngine') {
    // Extension pages opened in a tab also have sender.tab. Content scripts
    // share our id, so check the page URL before accepting an engine request.
    if (sender.id !== browserAPI.runtime.id || sender.url?.split(/[?#]/)[0] !== browserAPI.runtime.getURL('analysis.html')) return;
    profileEngineRequest(msg).then(sendResponse, error => sendResponse({ok:false, reason:error?.message || 'unavailable'}));
    return true;
  }
  if (msg?.type === 'profileHostData') {
    if (sender.id !== browserAPI.runtime.id || sender.tab || sender.url !== browserAPI.runtime.getURL('preview.html')) return;
    profileHostData(msg).then(value => sendResponse({ok:true, value}), error => sendResponse({ok:false, reason:error?.message || 'Profile data unavailable'}));
    return true;
  }
  if (msg?.type === 'profileEngineBusy') {
    if (sender.id !== browserAPI.runtime.id || sender.tab) return;
    profileBusy = !!msg.busy;
    if (!profileBusy && previewRunner.idle?.() && browserAPI.offscreen?.closeDocument) browserAPI.offscreen.closeDocument().catch(() => {});
    return;
  }
  // A shared player profile link (#p=…): decoded here, never fetched, then shown read-only on the board.
  if (msg?.type === 'openProfile' && typeof msg.encoded === 'string') {
    decodeProfile(msg.encoded).then(profile => openAnalysisTab({source:'profile', profile}, {sourceTabId:sender.tab?.id}))
      .then(() => sendResponse({ok:true}), error => {stashError(error); sendResponse({ok:false, error:error.message});});
    return true;
  }
  if (msg && msg.type === "openShared" && msg.payload && msg.payload.pgn) {
    // A shared link carries the sender's game, never the sender's viewing identity.
    const payload = {...msg.payload, meta:{...(msg.payload.meta || {})}};
    delete payload.meta.perspective;
    openAnalysisTab(payload, {sourceTabId:sender.tab?.id}).then(() => sendResponse({ok:true}), error => {
      stashError(error);sendResponse({ok:false,error:error.message});
    });
    return true;
  }
  if (msg && msg.type === "freeGameReview") {
    buttonPreviews.cancel(sender.tab?.id);
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
