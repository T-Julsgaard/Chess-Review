import {fetchArchives, fetchMonthGames, gameMeta} from '../chesscom.js';
import {getCachedMonth, setCachedMonth} from '../gamecache.js';
import {checkImport, importDelay} from './import-request.js';
import {collectLichess, ProfileAccountNotFoundError} from './profile/sources.js';
import {monthUrl} from './profile/pgn-source.js';

export function monthStart(date, offset = 0) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + offset, 1));
}

// Keep the provider's PGN, including clocks, for an immediate handoff to Review.
export function playerArchive(site, username) {
  let verified = false;
  return async function loadMonth(month, signal, publish) {
    const since = month.getTime() / 1000;
    if (site === 'lichess') {
      await collectLichess(username, {since, before: monthStart(month, 1).getTime() / 1000,
        includePgn: true, signal, onBatch(batch) {
          publish(batch.filter(game => game.pgn).map(game => ({
            pgn: game.pgn, white: game.white.name, black: game.black.name,
            result: game.result, date: game.startTime, speed: game.timeClass,
            meta: {gameId: game.id, url: game.url, timeClass: game.timeClass, endTime: game.endTime},
          })));
        }});
      return;
    }
    const url = monthUrl(username, since);
    const past = month < monthStart(new Date());
    let games = past ? await getCachedMonth(url) : null;
    checkImport(signal);
    if (!games) {
      games = await fetchMonthGames(url, {signal});
      if (past && games.length) void setCachedMonth(url, games);
    }
    // A missing player and a quiet month both return an empty monthly archive.
    if (!games.length && !verified) {
      try { await fetchArchives(username, {signal}); }
      catch (error) {
        if (error.status === 404) throw new ProfileAccountNotFoundError('chesscom', username);
        throw error;
      }
    }
    verified = true;
    const rows = [];
    for (const game of games) {
      if (!game.pgn || game.rules && game.rules !== 'chess') continue;
      const score = /^\[Result\s+"(1-0|0-1|1\/2-1\/2)"\]/m.exec(game.pgn)?.[1];
      if (!score) continue;
      const meta = gameMeta(game);
      rows.push({pgn: game.pgn, white: meta.white.user, black: meta.black.user,
        result: score === '1-0' ? 'w' : score === '0-1' ? 'b' : 'd',
        date: meta.endTime, speed: meta.timeClass, meta});
    }
    rows.sort((a, b) => b.date - a.date);
    for (let start = 0; start < rows.length; start += 40) {
      if (start) await importDelay(0, signal);
      checkImport(signal);
      publish(rows.slice(start, start + 40));
    }
  };
}
