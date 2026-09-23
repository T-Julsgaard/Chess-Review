// openings-db.js — Openings database module with IndexedDB persistence and auto-updater.
// Loads from local data/openings-db.json on first run, then updates from GitHub every ~30 days.

import { browserAPI } from "./browser-compat.js";
import {
  openDb,
  getOpening,
  putOpenings,
  clearOpenings,
  countOpenings,
  getAllOpenings,
  closeDb,
  STORE_NAME,
  STAGING_STORE_NAME,
} from "./indexed-db.js";

const OPENINGS_DB_URL = "https://raw.githubusercontent.com/lichess-org/chess-openings/main/eco.tsv";
const LOCAL_DB_URL = "data/openings-db.json";
export const UPDATE_INTERVAL_DAYS = 30;
export const UPDATE_ALARM_NAME = "openings-db-update";

let OPENINGS_DB = null;
let INIT_PROMISE = null;

function epdOf(fen) {
  return fen.split(" ").slice(0, 4).join(" ");
}

function parseEcoTsv(tsv) {
  const lines = tsv.trim().split("\n");
  const openings = [];
  for (const line of lines) {
    if (!line || line.startsWith("#")) continue;
    const [eco, name, fen] = line.split("\t");
    if (eco && name && fen) {
      openings.push({ eco, name, fen });
    }
  }
  return openings;
}

function buildEntries(openings) {
  const map = new Map();
  for (const op of openings) {
    const epd = epdOf(op.fen);
    if (!map.has(epd)) {
      map.set(epd, { epd, eco: op.eco, name: op.name, moves: [] });
    }
  }
  return Array.from(map.values());
}

async function loadLocalDb() {
  const res = await fetch(browserAPI.runtime.getURL(LOCAL_DB_URL));
  if (!res.ok) throw new Error(`Failed to load ${LOCAL_DB_URL}: ${res.status}`);
  return await res.json();
}

async function fetchRemoteDb() {
  const res = await fetch(OPENINGS_DB_URL);
  if (!res.ok) throw new Error(`Failed to fetch remote openings: ${res.status}`);
  const tsv = await res.text();
  const openings = parseEcoTsv(tsv);
  return buildEntries(openings);
}

function validateEntries(entries) {
  if (!Array.isArray(entries) || entries.length === 0) return false;
  for (const e of entries) {
    if (!e.epd || !Array.isArray(e.moves)) return false;
    if (typeof e.epd !== "string" || typeof e.eco !== "string" || typeof e.name !== "string") return false;
  }
  return true;
}

async function initializeDb() {
  const count = await countOpenings();
  if (count > 0) {
    console.log("[Openings DB] Database already initialized with", count, "entries");
    // Populate in-memory cache from IndexedDB for synchronous access
    if (!OPENINGS_DB) {
      const entries = await getAllOpenings();
      OPENINGS_DB = {};
      for (const entry of entries) {
        OPENINGS_DB[entry.epd] = entry;
      }
      console.log("[Openings DB] Loaded", Object.keys(OPENINGS_DB).length, "entries into memory");
    }
    return;
  }

  console.log("[Openings DB] Initializing from local file...");
  const localEntries = await loadLocalDb();
  if (!validateEntries(localEntries)) throw new Error("Local openings DB validation failed");
  await putOpenings(localEntries);
  console.log("[Openings DB] Initialized with", localEntries.length, "entries");
  // Populate in-memory cache for synchronous access
  OPENINGS_DB = {};
  for (const entry of localEntries) {
    OPENINGS_DB[entry.epd] = entry;
  }
}

export async function updateDb() {
  console.log("[Openings DB] Checking for updates...");
  try {
    const remoteEntries = await fetchRemoteDb();
    if (!validateEntries(remoteEntries)) throw new Error("Remote openings DB validation failed");

    const currentCount = await countOpenings();
    if (remoteEntries.length < currentCount * 0.5) {
      throw new Error("Remote DB suspiciously small, aborting update");
    }

    console.log("[Openings DB] Updating from", currentCount, "to", remoteEntries.length, "entries");
    
    // Atomic update: write to staging store first, then atomically swap
    await writeStagingStore(remoteEntries);
    await verifyStagingStore(remoteEntries.length);
    await atomicSwapStagingToMain();
    
    // Refresh in-memory cache
    OPENINGS_DB = {};
    for (const entry of remoteEntries) {
      OPENINGS_DB[entry.epd] = entry;
    }
    console.log("[Openings DB] Update complete");

    // Notify any listeners
    browserAPI.runtime.sendMessage({ type: "openingsDbUpdated" }).catch(() => {});
  } catch (e) {
    console.warn("[Openings DB] Update failed:", e);
    // Keep the old database - don't clear on failure
    await clearStagingStore(); // Clean up staging on failure
  }
}

async function writeStagingStore(entries) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STAGING_STORE_NAME, "readwrite");
    const store = tx.objectStore(STAGING_STORE_NAME);
    const clearReq = store.clear();
    clearReq.onsuccess = () => {
      let completed = 0;
      let hasError = false;
      for (const entry of entries) {
        const req = store.put(entry);
        req.onsuccess = () => {
          completed++;
          if (completed === entries.length && !hasError) resolve();
        };
        req.onerror = () => {
          if (!hasError) {
            hasError = true;
            reject(req.error);
          }
        };
      }
    };
    clearReq.onerror = () => reject(clearReq.error);
    tx.onerror = () => reject(tx.error);
  });
}

async function verifyStagingStore(expectedCount) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STAGING_STORE_NAME, "readonly");
    const store = tx.objectStore(STAGING_STORE_NAME);
    const countReq = store.count();
    countReq.onsuccess = () => {
      if (countReq.result === expectedCount) resolve();
      else reject(new Error(`Staging store count mismatch: expected ${expectedCount}, got ${countReq.result}`));
    };
    countReq.onerror = () => reject(countReq.error);
  });
}

async function atomicSwapStagingToMain() {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    // Single transaction: clear main store and copy from staging
    const tx = db.transaction([STORE_NAME, STAGING_STORE_NAME], "readwrite");
    const mainStore = tx.objectStore(STORE_NAME);
    const stagingStore = tx.objectStore(STAGING_STORE_NAME);
    
    const clearReq = mainStore.clear();
    clearReq.onsuccess = () => {
      // Copy all entries from staging to main
      const cursorReq = stagingStore.openCursor();
      cursorReq.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          mainStore.put(cursor.value);
          cursor.continue();
        }
      };
    };
    clearReq.onerror = () => reject(clearReq.error);
    
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function clearStagingStore() {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STAGING_STORE_NAME, "readwrite");
    const store = tx.objectStore(STAGING_STORE_NAME);
    const req = store.clear();
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

async function scheduleUpdate() {
  const alarms = browserAPI.alarms;
  if (!alarms) return;

  const existing = await alarms.get(UPDATE_ALARM_NAME);
  if (existing) return;

  await alarms.create(UPDATE_ALARM_NAME, {
    periodInMinutes: UPDATE_INTERVAL_DAYS * 24 * 60,
  });
  console.log("[Openings DB] Scheduled update alarm for every", UPDATE_INTERVAL_DAYS, "days");
}

export async function initOpeningsDb() {
  if (INIT_PROMISE) return INIT_PROMISE;

  INIT_PROMISE = (async () => {
    try {
      await initializeDb();
      await scheduleUpdate();
      // Also run an update check on startup (non-blocking)
      updateDb().catch(() => {});
    } catch (e) {
      console.error("[Openings DB] Initialization failed:", e);
      // Fall back to in-memory from local file
      OPENINGS_DB = await loadLocalDb();
    }
  })();

  return INIT_PROMISE;
}

export async function lookupOpening(fen) {
  await initOpeningsDb();

  const epd = epdOf(fen);

  // Try IndexedDB first
  try {
    const entry = await getOpening(epd);
    if (entry) return { eco: entry.eco, name: entry.name };
  } catch {
    // Fall through to in-memory fallback
  }

  // Fallback to in-memory cache
  if (OPENINGS_DB && OPENINGS_DB[epd]) {
    return { eco: OPENINGS_DB[epd].eco, name: OPENINGS_DB[epd].name };
  }

  return undefined; // not in book
}

export function isBookMove(fen) {
  const epd = epdOf(fen);
  return OPENINGS_DB?.hasOwnProperty(epd) === true;
}

export function getOpeningName(fen) {
  const epd = epdOf(fen);
  return OPENINGS_DB?.[epd]?.name || null;
}

export function getOpeningEco(fen) {
  const epd = epdOf(fen);
  return OPENINGS_DB?.[epd]?.eco || null;
}

// For backward compatibility with analysis.js bookLookup
export function getLegacyBook() {
  if (!OPENINGS_DB) return { epd: {} };
  const epd = {};
  for (const [key, val] of Object.entries(OPENINGS_DB)) {
    epd[key] = [val.eco, val.name];
  }
  return { epd };
}