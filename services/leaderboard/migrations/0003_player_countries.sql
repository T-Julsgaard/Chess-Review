PRAGMA foreign_keys = ON;
CREATE TABLE player_countries (
  player_id TEXT PRIMARY KEY REFERENCES players(id) ON DELETE CASCADE,
  country TEXT NOT NULL CHECK(length(country) BETWEEN 1 AND 12)
);
