// data/build-openings-db.js — builds the IndexedDB openings database from lichess-org/chess-openings.
// Run with: node data/build-openings-db.js
// Outputs: data/openings-db.json (for IndexedDB import) and data/book.json (legacy fetch fallback).

import fs from "fs";
import https from "https";
import { Chess } from "../lib/chess.js";

const OPENINGS_DB_BASE_URL = "https://raw.githubusercontent.com/lichess-org/chess-openings/master";
const OPENINGS_DB_FILES = ["a.tsv", "b.tsv", "c.tsv", "d.tsv", "e.tsv"];

function downloadTsv(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        return;
      }
      let data = "";
      res.on("data", (chunk) => data += chunk);
      res.on("end", () => resolve(data));
    }).on("error", reject);
  });
}

function pgnToFen(pgn) {
  try {
    const chess = new Chess();
    chess.loadPgn(pgn);
    return chess.fen();
  } catch {
    return null;
  }
}

function parseEcoTsv(tsv) {
  const lines = tsv.trim().split("\n");
  const openings = [];
  for (const line of lines) {
    if (!line || line.startsWith("#")) continue;
    const [eco = "", name = "", pgn] = line.replace(/\r$/, "").split("\t");
    if (pgn) {
      const fen = pgnToFen(pgn);
      if (fen) {
        openings.push({ eco, name, fen });
      }
    }
  }
  return openings;
}

function epdOf(fen) {
  return fen.split(" ").slice(0, 4).join(" ");
}

function buildDatabases(openings) {
  // For IndexedDB: key = epd, value = { epd, eco, name, moves: [] }
  // For book.json (legacy): key = epd, value = [eco, name] or 0
  const indexedDb = {};
  const legacyBook = { epd: {} };

  for (const op of openings) {
    const epd = epdOf(op.fen);
    // IndexedDB format
    if (!indexedDb[epd]) {
      indexedDb[epd] = { epd, eco: op.eco, name: op.name, moves: [] };
    }
    // Legacy format - first entry wins for named, 0 for unnamed
    if (!legacyBook.epd[epd]) {
      legacyBook.epd[epd] = (op.eco || op.name) ? [op.eco, op.name] : 0;
    }
  }

  // Count named positions
  let namedCount = 0;
  for (const v of Object.values(legacyBook.epd)) {
    if (Array.isArray(v)) namedCount++;
  }

  return { indexedDb, legacyBook: { version: new Date().toISOString().split("T")[0], source: "lichess-org/chess-openings", count: Object.keys(indexedDb).length, named: namedCount, epd: legacyBook.epd } };
}

async function main() {
  console.log("Downloading TSV files from lichess-org/chess-openings...");
  const allOpenings = [];
  
  for (const file of OPENINGS_DB_FILES) {
    const url = `${OPENINGS_DB_BASE_URL}/${file}`;
    console.log(`Fetching ${file}...`);
    const tsv = await downloadTsv(url);
    const openings = parseEcoTsv(tsv);
    console.log(`  Found ${openings.length} positions in ${file}`);
    allOpenings.push(...openings);
  }
  
  console.log(`Total parsed: ${allOpenings.length} opening positions`);

  const { indexedDb, legacyBook } = buildDatabases(allOpenings);

  // Write IndexedDB import file
  fs.writeFileSync("data/openings-db.json", JSON.stringify(Object.values(indexedDb)));
  console.log(`Wrote data/openings-db.json with ${Object.keys(indexedDb).length} entries`);

  // Write legacy book.json
  fs.writeFileSync("data/book.json", JSON.stringify(legacyBook));
  console.log("Wrote data/book.json");

  console.log("Done!");
}

main().catch((e) => { console.error(e); process.exit(1); });