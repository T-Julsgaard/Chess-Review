// Convert book.json to openings-db.json format for IndexedDB
import fs from "fs";

const book = JSON.parse(fs.readFileSync("data/book.json", "utf8"));
const epd = book.epd || {};

const entries = [];
for (const [key, val] of Object.entries(epd)) {
  if (Array.isArray(val)) {
    entries.push({ epd: key, eco: val[0], name: val[1], moves: [] });
  } else {
    // val === 0 means unnamed position
    entries.push({ epd: key, eco: "", name: "", moves: [] });
  }
}

fs.writeFileSync("data/openings-db.json", JSON.stringify(entries));
console.log(`Created data/openings-db.json with ${entries.length} entries`);