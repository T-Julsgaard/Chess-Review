import { DatabaseSync } from 'node:sqlite';
import { searchKey } from './analyze-games.mjs';

// Bounded page cache; one durable transaction per completed search. No history map in RAM.
export class SearchCache {
  constructor(file, configHash, { readonly = false } = {}) {
    this.db = new DatabaseSync(file, { readOnly: readonly }); this.configHash = configHash;
    this.db.exec('PRAGMA cache_size=-8192; PRAGMA busy_timeout=10000;');
    if (!readonly) {
      this.db.exec('PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; CREATE TABLE IF NOT EXISTS searches(key TEXT PRIMARY KEY, payload TEXT NOT NULL); CREATE TABLE IF NOT EXISTS completed(id TEXT PRIMARY KEY); CREATE TABLE IF NOT EXISTS metadata(config TEXT NOT NULL);');
      const previous = this.db.prepare('SELECT config FROM metadata').get();
      if (previous && previous.config !== configHash) { this.close(); throw Error('Cache configuration mismatch'); }
      if (!previous) this.db.prepare('INSERT INTO metadata VALUES(?)').run(configHash);
    } else if (this.db.prepare('SELECT config FROM metadata').get()?.config !== configHash) { this.close(); throw Error('Cache configuration mismatch'); }
    this.getRow = this.db.prepare('SELECT payload FROM searches WHERE key=?');
    if (!readonly) this.putRow = this.db.prepare('INSERT INTO searches VALUES(?, ?)');
  }
  get(key) {
    const result = this.getRow.get(key); if (!result) return undefined;
    const row = JSON.parse(result.payload);
    if (row.key !== key || searchKey(this.configHash, row.history, row.played) !== key || !row.score || !row.bestmove) throw Error('Corrupt search cache');
    return row;
  }
  has(key) { return this.get(key) != null; }
  set(key, row) { if (row.key !== key || searchKey(this.configHash, row.history, row.played) !== key) throw Error('Invalid search cache key'); this.putRow.run(key, JSON.stringify(row)); }
  complete(id) { this.db.prepare('INSERT OR IGNORE INTO completed VALUES(?)').run(id); }
  completed(id) { return Boolean(this.db.prepare('SELECT id FROM completed WHERE id=?').get(id)); }
  close() { this.db.close(); }
}
