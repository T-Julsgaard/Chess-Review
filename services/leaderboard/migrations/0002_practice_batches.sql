-- Retire audience/lifetime caps. Abuse is bounded by request limits and a
-- weighted daily write budget instead of limiting legitimate account counts.
DROP TRIGGER bound_players;
DROP TRIGGER release_players;
DROP TRIGGER bound_solves;
DROP TRIGGER release_solves;
DELETE FROM quotas WHERE key IN ('players','solves');

CREATE TABLE practice_batches (
  player_id TEXT PRIMARY KEY REFERENCES players(id) ON DELETE CASCADE,
  id TEXT NOT NULL UNIQUE,
  revision INTEGER NOT NULL DEFAULT 0,
  puzzles TEXT NOT NULL,
  accepted TEXT NOT NULL DEFAULT '[]',
  expires_at INTEGER NOT NULL,
  last_hash TEXT,
  last_response TEXT
);
CREATE INDEX practice_expiry ON practice_batches(expires_at);
CREATE TRIGGER verified_practice_batch AFTER UPDATE ON practice_batches
WHEN NEW.revision > OLD.revision BEGIN
  INSERT OR IGNORE INTO solves(player_id,puzzle_id)
    SELECT NEW.player_id,value FROM json_each(NEW.accepted);
END;
