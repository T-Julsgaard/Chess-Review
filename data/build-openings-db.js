// data/build-openings-db.js — builds the IndexedDB openings database from lichess-org/chess-openings.
// Run with: node data/build-openings-db.js
// Outputs: data/openings-db.json (for IndexedDB import) and data/book.json (legacy fetch fallback).

import fs from "fs";
import https from "https";

const LICHESS_OPENINGS_URL = "https://raw.githubusercontent.com/lichess-org/chess-openings/master/eco.tsv";

function downloadEcoTsv() {
  return new Promise((resolve, reject) => {
    https.get(LICHESS_OPENINGS_URL, (res) => {
      let data = "";
      res.on("data", (chunk) => data += chunk);
      res.on("end", () => resolve(data));
    }).on("error", reject);
  });
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

function epdOf(fen) {
  return fen.split(" ").slice(0, 4).join(" ");
}

function buildDatabases(openings) {
  // For IndexedDB: key = epd, value = { eco, name, moves: [] }
  // For book.json (legacy): key = epd, value = [eco, name] or 0
  const indexedDb = {};
  const legacyBook = { epd: {} };

  for (const op of openings) {
    const epd = epdOf(op.fen);
    // IndexedDB format
    if (!indexedDb[epd]) {
      indexedDb[epd] = { eco: op.eco, name: op.name, moves: [] };
    }
    // Legacy format - first entry wins for named, 0 for unnamed
    if (!legacyBook.epd[epd]) {
      legacyBook.epd[epd] = [op.eco, op.name];
    }
  }

  // Count named positions
  let namedCount = 0;
  for (const v of Object.values(legacyBook.epd)) {
    if (Array.isArray(v)) namedCount++;
  }

  return { indexedDb, legacyBook: { version: new Date().toISOString().split("T")[0], source: "lichess-org/chess-openings", count: openings.length, named: namedCount, epd: legacyBook.epd } };
}

async function main() {
  console.log("Downloading ECO TSV from lichess-org/chess-openings...");
  const tsv = await downloadEcoTsv();
  console.log("Parsing...");
  const openings = parseEcoTsv(tsv);
  console.log(`Found ${openings.length} opening positions`);

  const { indexedDb, legacyBook } = buildDatabases(openings);

  // Write IndexedDB import file
  fs.writeFileSync("data/openings-db.json", JSON.stringify(indexedDb));
  console.log("Wrote data/openings-db.json");

  // Write legacy book.json
  fs.writeFileSync("data/book.json", JSON.stringify(legacyBook));
  console.log("Wrote data/book.json");

  console.log("Done!");
}

main().catch((e) => { console.error(e); process.exit(1); });