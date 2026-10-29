-- Repair any previously imported invalid names before enforcing every write.
UPDATE players SET name='Knight-' || lower(hex(randomblob(5)))
WHERE length(name) NOT BETWEEN 1 AND 25
  OR instr(name,char(0))>0
  OR name GLOB '*[^A-Za-z0-9 _-]*'
  OR substr(name,1,1) NOT GLOB '[A-Za-z0-9]'
  OR substr(name,-1,1) NOT GLOB '[A-Za-z0-9]';

CREATE TRIGGER validate_player_name_insert BEFORE INSERT ON players
WHEN length(NEW.name) NOT BETWEEN 1 AND 25
  OR instr(NEW.name,char(0))>0
  OR NEW.name GLOB '*[^A-Za-z0-9 _-]*'
  OR substr(NEW.name,1,1) NOT GLOB '[A-Za-z0-9]'
  OR substr(NEW.name,-1,1) NOT GLOB '[A-Za-z0-9]'
BEGIN
  SELECT RAISE(ABORT,'Invalid player name');
END;
CREATE TRIGGER validate_player_name_update BEFORE UPDATE OF name ON players
WHEN length(NEW.name) NOT BETWEEN 1 AND 25
  OR instr(NEW.name,char(0))>0
  OR NEW.name GLOB '*[^A-Za-z0-9 _-]*'
  OR substr(NEW.name,1,1) NOT GLOB '[A-Za-z0-9]'
  OR substr(NEW.name,-1,1) NOT GLOB '[A-Za-z0-9]'
BEGIN
  SELECT RAISE(ABORT,'Invalid player name');
END;
