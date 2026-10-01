// tests/__mocks__/indexed-db.js - Mock for IndexedDB wrapper
import { vi } from 'vitest';

export const DB_NAME = "ChessReviewOpenings";
export const DB_VERSION = 2;
export const STORE_NAME = "openings";
export const STAGING_STORE_NAME = "openings_staging";

let dbPromise = null;

export function openDb() {
  if (dbPromise) return dbPromise;
  dbPromise = Promise.resolve({
    transaction: vi.fn(() => ({
      objectStore: vi.fn(() => ({
        get: vi.fn(() => ({ onsuccess: null, onerror: null, result: null })),
        getAll: vi.fn(() => ({ onsuccess: null, onerror: null, result: [] })),
        put: vi.fn(() => ({ onsuccess: null, onerror: null })),
        clear: vi.fn(() => ({ onsuccess: null, onerror: null })),
        count: vi.fn(() => ({ onsuccess: null, onerror: null, result: 0 })),
        index: vi.fn(() => ({
          getAll: vi.fn(() => ({ onsuccess: null, onerror: null, result: [] })),
          get: vi.fn(() => ({ onsuccess: null, onerror: null, result: null })),
        })),
      })),
    })),
    close: vi.fn(),
  });
  return dbPromise;
}

export async function getOpening(epd) { return null; }
export async function getOpeningsByEco(eco) { return []; }
export async function putOpening(entry) {}
export async function putOpenings(entries) {}
export async function clearOpenings() {}
export async function countOpenings() { return 0; }
export async function getAllOpenings() { return []; }
export function closeDb() { dbPromise = null; }