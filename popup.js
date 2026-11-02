// popup.js — UI logic. A module, so we can import the shared helper functions.
import { openAnalysisTab, analyzeActiveTab, reloadActiveAndAnalyze, isSupportedChessUrl, openBlankWorkspaceTab, analyzeChesscomUrl } from "./analyze-flow.js";
import { parseGameId } from "./chesscom.js";
import { parseLichessGameId, parseLichessFlip, fetchGamePgn as fetchLichessPgn } from "./lichess.js";
import { browserAPI } from "./browser-compat.js";
import {mountFluidActions} from "./lib/fluid-actions.js";
import {createImportRequest} from "./lib/import-request.js";

const $ = (id) => document.getElementById(id);
const screenPreview = new window.URLSearchParams(window.location.search).has('screen-preview');
const statusEl = $("status");
let activeImport = null;
const disposeFluidActions=mountFluidActions(document.querySelector(".popup-actions"));
window.addEventListener("pagehide",disposeFluidActions,{once:true});
function beginImport() {
  activeImport?.request.cancel();
  const operation = {request:createImportRequest()}; activeImport = operation;
  for(const id of ["analyzeCurrent","analyzeManual","openWorkspace","openPosition"])$(id).disabled=true;
  $("cancelImport").hidden=false;
  return operation;
}
function finishImport(operation) {
  operation.request.dispose();
  if(activeImport!==operation)return;
  activeImport=null;for(const id of ["analyzeCurrent","analyzeManual","openWorkspace","openPosition"])$(id).disabled=false;
  $("cancelImport").hidden=true;
}
const importCurrent = operation => activeImport === operation && !operation.request.signal.aborted;

function setStatus(msg, isError = false) {
  statusEl.textContent = msg || "";
  statusEl.classList.toggle("error", !!isError);
}

// A PGN has either header tags ([Event "…"]) or movetext (1. e4 …). Detect it FIRST, before any
// URL check: a chess.com/Lichess PGN export embeds the site URL in its [Site]/[Link] tags, so a
// substring test for "chess.com" would otherwise misroute the whole PGN into an archive lookup.
function looksLikePgn(s) {
  return /\[\s*\w+\s+"[^"]*"\s*\]/.test(s) || /\b1\.\s*[A-Za-z]/.test(s);
}

// Keep the action menu open on every site so the user can choose a review or a blank workspace.
async function runCurrentAnalysis() {
  if(screenPreview)return setStatus("Preview actions are disabled.");
  const operation=beginImport(),signal=operation.request.signal;
  setStatus("Fetching game …");
  try {
    await analyzeActiveTab(undefined,null,{signal});
    if(!importCurrent(operation))return;
    setStatus("Opening analysis …");
    finishImport(operation);window.close();
  } catch (err) {
    if(activeImport!==operation)return;
    if (err.code === "NO_GAME") {
      // The chess SPA may not have exposed the just-finished game yet → reload once and retry.
      try {
        setStatus("Loading the game page …");
        await reloadActiveAndAnalyze(undefined, err.tabId, {signal});
        if(!importCurrent(operation))return;
        setStatus("Opening analysis …");
        finishImport(operation);window.close();
        return;
      } catch (err2) { if(activeImport!==operation)return;err = err2; }
    }
    setStatus(err.message, true);
    $("manual").open = true;
    $("manualInput").focus();
  } finally {
    finishImport(operation);
  }
}

async function init() {
  if(screenPreview){
    $("manual").open=new window.URLSearchParams(window.location.search).get('screen-preview')==='popup-manual';
    $("manualInput").value='1. f3 e5 2. g4 Qh4#';
    setStatus("Sample popup — actions are disabled.");document.body.dataset.previewReady="true";return;
  }
  // If a background flow (keyboard shortcut / in-page button) just failed, surface that reason and
  // open the paste box instead of auto-retrying.
  try {
    const { pendingError } = await browserAPI.storage.local.get("pendingError");
    if (pendingError) {
      await browserAPI.storage.local.remove("pendingError");
      setStatus(pendingError, true);
      $("manual").open = true;
      $("manualInput").focus();
      return;
    }
  } catch {}

  let tab = null;
  try { [tab] = await browserAPI.tabs.query({ active: true, currentWindow: true }); } catch {}
  if (isSupportedChessUrl(tab && tab.url)) {
    setStatus("Ready to review the game in your active tab.");
  } else {
    setStatus("For game review, open a Chess.com or Lichess game, or paste a URL or PGN below.");
  }
}

$("openWorkspace").addEventListener("click",async()=>{
  if(screenPreview)return setStatus("Preview actions are disabled.");
  const operation=beginImport();setStatus("Opening Chess Review …");
  try {
    await openBlankWorkspaceTab({signal:operation.request.signal});
    if(importCurrent(operation)){finishImport(operation);window.close();}
  } catch(error) {
    if(importCurrent(operation))setStatus(error.message,true);
  } finally { finishImport(operation); }
});

$("analyzeCurrent").addEventListener("click", runCurrentAnalysis);
$("openPosition").addEventListener("click",async()=>{
  if(screenPreview)return setStatus("Preview actions are disabled.");
  const operation=beginImport();setStatus("Opening position editor …");
  try {
    await browserAPI.tabs.create({url:browserAPI.runtime.getURL("analysis.html?workspace=position")});
    if(importCurrent(operation)){finishImport(operation);window.close();}
  } catch(error) {if(importCurrent(operation))setStatus(error.message,true);}
  finally {finishImport(operation);}
});
$("cancelImport").addEventListener("click",()=>{
  if(!activeImport)return;
  const operation=activeImport;operation.request.cancel();finishImport(operation);
  setStatus("Import canceled. You can retry or paste another game.");
});

$("analyzeManual").addEventListener("click", async () => {
  if(screenPreview)return setStatus("Preview actions are disabled.");
  const raw = $("manualInput").value.trim();
  if (!raw) return setStatus("Paste a URL or PGN.", true);
  const operation=beginImport(),signal=operation.request.signal;
  try {
    // Order matters: pasted PGN text can contain site URLs in its tags, so detect those by
    // shape BEFORE any URL handling, or a chess.com PGN gets misrouted into an archive lookup.
    if (looksLikePgn(raw)) {
      // Full PGN (or bare movetext) → analyse directly, no username/archive needed.
      await openAnalysisTab({ pgn: raw, meta: {}, source: "pgn" }, {signal});
    } else if (/lichess\.org/i.test(raw)) {
      // Lichess URL → fetch the PGN straight from Lichess's public API (no username needed).
      const li = parseLichessGameId(raw);
      if (!li) throw new Error("Couldn't read a game ID from that Lichess URL.");
      setStatus("Fetching game from Lichess …");
      const pgn = await fetchLichessPgn(li.id, {signal});
      await openAnalysisTab({ pgn, meta: { url: `https://lichess.org/${li.id}`, gameId: li.id, flip: parseLichessFlip(raw) }, source: "url-lichess" }, {signal});
    } else if (parseGameId(raw) || /chess\.com|^https?:/i.test(raw)) {
      // chess.com URL → look it up via the API by game ID. Manual paste is an explicit "older game"
      // request, so search far back (the active-tab flow stays shallow for speed).
      setStatus("Searching game archives …");
      await analyzeChesscomUrl(raw, {signal});
    } else {
      // Unrecognised → last-ditch, treat as PGN so a stray paste still gets a chance.
      await openAnalysisTab({ pgn: raw, meta: {}, source: "pgn" }, {signal});
    }
    if(importCurrent(operation)){finishImport(operation);window.close();}
  } catch (err) {
    if(activeImport===operation)setStatus(err.message, true);
  } finally {
    finishImport(operation);
  }
});

init();
