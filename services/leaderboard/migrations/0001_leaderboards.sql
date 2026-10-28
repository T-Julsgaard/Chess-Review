PRAGMA foreign_keys = ON;
CREATE TABLE players (
  id TEXT PRIMARY KEY,
  token_hash TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE TABLE puzzles (
  id TEXT PRIMARY KEY,
  rating INTEGER NOT NULL,
  fen TEXT NOT NULL,
  solution TEXT NOT NULL
);
CREATE INDEX puzzles_rating ON puzzles(rating, id);
CREATE TABLE sessions (
  player_id TEXT PRIMARY KEY REFERENCES players(id) ON DELETE CASCADE,
  id TEXT NOT NULL UNIQUE,
  mode TEXT NOT NULL CHECK(mode IN ('solve-puzzle','timeAttack','knockout')),
  puzzle_id TEXT REFERENCES puzzles(id),
  score INTEGER NOT NULL DEFAULT 0 CHECK(score BETWEEN 0 AND 1000),
  lives INTEGER NOT NULL,
  revision INTEGER NOT NULL DEFAULT 0,
  started_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deadline INTEGER NOT NULL,
  seen TEXT NOT NULL DEFAULT '[]',
  last_hash TEXT,
  last_response TEXT
);
CREATE TABLE records (
  mode TEXT NOT NULL,
  player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  score INTEGER NOT NULL,
  achieved_at INTEGER NOT NULL,
  PRIMARY KEY(mode, player_id)
);
CREATE INDEX rankings ON records(mode, score DESC, achieved_at, player_id);
CREATE TABLE solves (
  player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  puzzle_id TEXT NOT NULL REFERENCES puzzles(id),
  PRIMARY KEY(player_id, puzzle_id)
);
CREATE TABLE quotas (key TEXT PRIMARY KEY, used INTEGER NOT NULL);
INSERT INTO quotas VALUES ('players',0),('solves',0);

CREATE TRIGGER bound_players BEFORE INSERT ON players BEGIN
  SELECT CASE WHEN (SELECT used FROM quotas WHERE key='players') >= 5000 THEN RAISE(ABORT,'capacity') END;
  UPDATE quotas SET used=used+1 WHERE key='players';
END;
CREATE TRIGGER release_players AFTER DELETE ON players BEGIN
  UPDATE quotas SET used=used-1 WHERE key='players';
END;
CREATE TRIGGER bound_solves BEFORE INSERT ON solves
WHEN NOT EXISTS(SELECT 1 FROM solves WHERE player_id=NEW.player_id AND puzzle_id=NEW.puzzle_id) BEGIN
  SELECT CASE WHEN (SELECT used FROM quotas WHERE key='solves') >= 100000 THEN RAISE(ABORT,'capacity') END;
  UPDATE quotas SET used=used+1 WHERE key='solves';
END;
CREATE TRIGGER release_solves AFTER DELETE ON solves BEGIN
  UPDATE quotas SET used=used-1 WHERE key='solves';
END;
CREATE TRIGGER practice_score AFTER INSERT ON solves BEGIN
  INSERT INTO records(mode,player_id,score,achieved_at)
    VALUES('solve-puzzle',NEW.player_id,1,unixepoch()*1000)
    ON CONFLICT(mode,player_id) DO UPDATE SET score=score+1,achieved_at=excluded.achieved_at;
END;
CREATE TRIGGER verified_score AFTER UPDATE ON sessions WHEN NEW.score > OLD.score BEGIN
  INSERT OR IGNORE INTO solves(player_id,puzzle_id)
    SELECT NEW.player_id,OLD.puzzle_id WHERE NEW.mode='solve-puzzle';
  INSERT INTO records(mode,player_id,score,achieved_at)
    SELECT NEW.mode,NEW.player_id,NEW.score,NEW.updated_at WHERE NEW.mode!='solve-puzzle'
    ON CONFLICT(mode,player_id) DO UPDATE SET score=excluded.score,achieved_at=excluded.achieved_at
    WHERE excluded.score > records.score;
END;
