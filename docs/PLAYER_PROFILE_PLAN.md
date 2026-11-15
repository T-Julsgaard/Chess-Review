# Player profile ("Chess Wrapped") — implementation plan and prompt

This file is written to be pasted into a fresh Claude Code conversation as the task
prompt. It also travels with the repository as the feature tracker, in the same way
`docs/LEARN_WITH_CHESS_REVIEW.md` tracks the learning workspace. Keep the
"Implementation tracker" section updated as stages land. Sections marked
**Decision needed** are open questions for the maintainer; answer them before or
during the work, and record the answer in place.

---

## The prompt

You are working on **Chess Review**, a Chrome/Firefox extension in this repository
that reviews Chess.com and Lichess games with a locally bundled Stockfish. Read
`README.md`, `docs/REPOSITORY.md`, `docs/LEARN_WITH_CHESS_REVIEW.md` and
`docs/IDENTITY.md` first. Follow the global commit rules (commit every finished
stage with a descriptive message and the Claude co-author trailer; never push;
stage files by path). Run `npm test` (currently 1797 tests, about 35 s) and
`npm run lint` before each commit.

Build a **Player profile**: a "Spotify Wrapped"-style recap of the user's chess,
opened from a button next to the existing **Learn with Chess review** button at the
bottom of the review layout. When pressed, the review panels (Accuracy, Move list,
Engine, Evaluation) fade out and one Player profile panel fades in, in the same
place and in the same visual language. The board stays where it is and becomes the
visualization surface: each slide drives the board (plays an opening, highlights a
heat-map, replays a comeback, shows the position of a record game). The user steps
through slides with next/previous, keyboard arrows and position dots, and finishes
on a share slide. **Return to Game review** restores the exact review state, the
same way the learning workspace does today.

### Hard constraints

1. **No backend, no analytics.** Everything runs locally; the only network traffic
   is the public Chess.com and Lichess APIs the extension already calls. The
   privacy policy (`PRIVACY.md`) must be updated to describe the new storage and
   requests exactly.
2. **Never run the full review (depth 16, two lines) over a player's whole
   history.** A full review costs tens of seconds per game. The profile must be
   usable after a short wait: tier 0 slides within seconds, and the optional
   engine-backed slides within a user-chosen budget of roughly 2 to 30 minutes on
   the user's own machine. Partial results are shown as they arrive; nothing
   blocks on the engine.
3. **Chess.com API etiquette.** Requests stay serial, honour 429 and
   `Retry-After` (see `fetchWithRetry` in `chesscom.js`), reuse the existing
   month cache (`gamecache.js`), and fetch each finished month at most once ever.
   Lichess uses one streaming NDJSON export per refresh with `since=`.
4. **Nothing fabricated.** Every number has a sample size; every insight carries
   the games (and plies) it rests on so the board can show them and the user can
   open them in the normal review. Insights with too small a sample are hidden,
   never padded. Borrowed figures (Chess.com's own `accuracies`, Lichess server
   evals) are never mixed into our accuracy numbers (see Decision needed, D4).
5. **Reuse, don't duplicate.** Use `lib/chess.js` for replay, `Chess` opening
   book lookup from `data/book.json` for opening names, `lib/identity.js` and
   `lib/player-history.js` for "who is the user", `lib/game-statistics.js` for
   per-game insights on already-reviewed games, the `PreviewEngine` pattern in
   `lib/preview-analysis.js` for cheap engine passes, `lib/overview-reveal.js`
   for count-up animations, and the learning workspace's morph pattern
   (`lib/learning/workspace.js`, `stage.classList.add('learning-active')`, inert
   `.mod` panels, `restoreBoard`) for the panel takeover. Respect `uiAnim`,
   `prefers-reduced-motion`, themes, board/piece preferences and all three layout
   setups (Old, Modern, Custom).
6. **Both sites, both browsers.** Chess.com and Lichess profiles; Chrome
   (offscreen document available) and Firefox (background page). Keep heavy work
   off the main thread.
7. Write `docs/PLAYER_PROFILE.md` as the living tracker (copy the prompt verbatim
   into it, as the learning tracker did) and keep it current per stage.

---

## What already exists (so you don't rediscover it)

| Need | Where | Notes |
| --- | --- | --- |
| Chess.com archive fetch | `chesscom.js`: `fetchArchives`, `fetchMonthGames`, `fetchWithRetry` | Monthly archive objects carry `url, pgn, time_control, end_time, rated, time_class, rules, eco, accuracies?, white/black {username, rating, result}`. PGN headers include `UTCDate, UTCTime, StartTime, EndDate, EndTime, TimeControl, Termination, ECO, ECOUrl, WhiteElo, BlackElo, Link`; movetext has `{[%clk ...]}`. |
| Month cache | `gamecache.js` (`getCachedMonth`/`setCachedMonth`, 60 months, finished months only) | Do not store raw months beyond this; store a compact per-game feature row instead (see storage). |
| Lichess fetch | `lichess.js` (single game only) | Add `/api/games/user/{username}` NDJSON export with `clocks=true&opening=true&moves=true&since=`; unauthenticated rate is about 20 games/s. |
| Who is the user | `lib/identity.js` (`resolveIdentity`, `knownAccounts`), `lib/player-history.js` (`inferredPlayer`, `archivePlayers`), `S.username` | Resolve per site. Offer a username field when nothing is known, as the popup does. |
| Replay/legal moves/FEN | `lib/chess.js` | `loadPgn`, `history({verbose:true})`, `getComments()` for clocks. `parseClocks` in `analysis.js` shows the clock-comment matching. |
| Opening names | `data/book.json`, `analysis.js` `computeDerived` (ECO/ECOUrl fallback at ~line 991) | Chess.com also gives `ECOUrl`; Lichess export gives `opening.name/eco`. |
| Per-game insights for fully reviewed games | `lib/game-statistics.js` (`gameStatistics`): phases, cp loss, top-move match, clean streak, balanced/defending/winning accuracy, punish, bounce-back, only-moves, clock advantage, think times, time-trouble/snap/long-think accuracy | Already computed for every library game. The profile aggregates these across the library. |
| Saved reviews | `library` (max 300 records: `myAcc, opAcc, myRating, opRating, result, type, eco, opening, date, url, meta`) and `analysis:<id>` (`evals, bests, multipv`) | Use as the high-fidelity tier. |
| Cheap engine pass | `lib/preview-analysis.js` (`analyseButtonPreview`: depth 8, one line, 6 s budget, one worker, `publicMoveQuality`/`publicGameAccuracy`) and `lib/preview-runner.js` (offscreen host queue) | Template for the sampled engine tier. `engineWorkers` setting (default cores−1, max 4) exists for parallel workers. |
| Count-up/reveal animation | `lib/overview-reveal.js` (`createOverviewReveal`, 1200 ms, reduced-motion aware) | Reuse for slide numbers. |
| Panel takeover | `lib/learning/workspace.js` ~lines 140–200; entry in `analysis.js` `openLearning` (~line 1775), toggle button `#learningToggle` (~line 1644), `syncLearningToggle` | Copy the snapshot/restore discipline (idx, flipped, selectedSq, practice state, pause background analysis). |
| Share link | `analysis.js` `shareGame` (~line 558): `#gambit=<base64 JSON>` on a chess.com/lichess URL, read by `content.js` ~line 282 and `lichess-content.js` ~line 194 | Add a sibling `#profile=` fragment, compressed. |
| Tests | `tests/*.test.mjs`, `tests/helpers/app.mjs` (`app`, `loadGame`, `a.call(...)`) | Pure modules get unit tests; UI gets jsdom tests; add a `scripts/player-profile-audit.mjs` browser audit like the other `*-audit.mjs` scripts. |

---

## Data tiers (the key design decision)

Everything the profile shows comes from one of three tiers. Each insight declares
its tier so the UI can show tier-0 slides at once and fill engine slides later.

**Tier 0 — API + replay, no engine. All games in the selected period.**
One archive listing plus one request per month (Chess.com) or one NDJSON stream
(Lichess), then a `chess.js` replay of every game in a worker. Replay of a few
thousand games takes seconds. Yields: results, ratings, time classes, opponents,
openings, dates and local hour (from `end_time`/`UTCDate+UTCTime`), game duration
(`StartTime`/`EndTime`, or `createdAt`/`lastMoveAt`), move counts, clocks,
terminations (checkmate, resignation, timeout, abandonment, agreement, repetition,
stalemate, insufficient material), material balance per ply, castling, queen
trades, piece activity, checks, captures, promotions, en passant, checkmate
patterns, pawn storms, fianchettos, development order. This tier powers roughly
two thirds of the slides and the whole archetype classifier.

**Tier 1 — Fully reviewed library games (depth 16).** Up to 300 games already in
the library with `gameStatistics` available. Highest fidelity, clearly labelled
"from your reviewed games", used for brilliant/blunder counts, accuracy records,
clock-condition accuracy, and as ground truth for the sampled tier.

**Tier 2 — Sampled cheap engine pass (optional, budgeted).** A depth-8 single-line
pass (the `PreviewEngine` pattern, 4 to 6 s per game per worker) on a sample
chosen to answer specific questions:

- a time-stratified sample (equal games per month) for the accuracy trend;
- candidate games found by tier-0 pre-filters, verified by the engine:
  comebacks (wins where the user was down three or more points of material at some
  point), chokes (non-wins where the user was up three or more points), and
  highest-accuracy candidates (short decisive games with no material lost);
- the three most frequent opponents' games, for a per-rival accuracy line.

Budget presets: **Quick** (about 2 min, roughly 40 games), **Standard** (about
10 min, roughly 150 games) and **Deep** (about 30 min, roughly 400 games) at one
worker; scale by `engineWorkers`. Measure real per-game cost in Stage 0 and derive
the counts from the measurement, not from these guesses. Results are cached per
game id, so re-running only touches new games. The pass is pausable, cancellable,
survives closing the tab (resume from the cache), and never starts while a normal
review is analysing.

Rule of thumb: if a slide can be built from tier 0 it is built from tier 0, and
the engine only adds a labelled "verified by engine" figure.

---

## Slides (first full deck)

Each slide: one headline, at most three supporting numbers, one board
visualization, and an evidence link ("Open this game") where a game is involved.
Copy is playful but factual; negatives are framed kindly ("the one that got
away"), never mocking. Hidden when the sample is too small.

| # | Slide | Content | Board visualization | Tier |
| --- | --- | --- | --- | --- |
| 1 | Cover | "Your chess, {period}". Username, flag (from `flags.js`), site, games counted, period picker. | The user's most-played first move as White animates, then their most-played reply as Black. | 0 |
| 2 | The numbers | Games, W/D/L with win rate, hours played, total moves made, pieces captured, checks given. Counts count up. | Squares light up progressively as the counters rise (64 squares as a progress fill). | 0 |
| 3 | Rating journey | Rating timeline per time class (sparkline per class), peak rating and date, biggest monthly gain, current vs start of period. | The final position of the peak-rating game. | 0 |
| 4 | Your openings | Top five openings as White and as Black with games and win rate; "most successful" and "most troublesome" opening (min 8 games). | The favourite line plays out move by move; the opening name types in. | 0 |
| 5 | Your historical twin | One historical player archetype with a two-sentence reason built from the user's own numbers, plus a runner-up. | A public-domain position from that player's games with their winning move animated; our own text, no copied annotations. | 0 (+1/2 for accuracy facts if available) |
| 6 | Signature moves | Three habits from the signature detector: e.g. "Both knights out by move 4 in 71% of games", "You trade queens early (move 12 avg.)", "Kingside pawn storm in 38% of games with opposite castling". | Heat-map overlay: where the user's pieces go most, or the squares their pawn storms hit. | 0 |
| 7 | Your rival | Most-played opponent: record per time class, last result, "rematches played straight after a loss" (revenge games). Also nemesis (most losses to) and favourite victim, if distinct. | The decisive position from the most recent game against the rival. | 0 (+2 for rival accuracy) |
| 8 | Greatest hits | Strongest opponent beaten (rated), longest win streak with dates, longest unbeaten run, record games-in-a-day. | The final position of the win against the strongest opponent; checkmate badge if mated. | 0 |
| 9 | Comeback and the one that got away | Biggest comeback (lowest material or eval, then win); biggest choke (largest advantage lost). Gentle copy. | Steps from the lowest point to the final position. | 0 proxy, 2 verified |
| 10 | Chess habits | Hour-of-day × weekday heat-map in local time, best hour band by win rate, late-night (23:00–05:00) vs daytime win rate, busiest day, longest session, games per week. | The board becomes the heat-map: 7 ranks = weekdays, 8 files = three-hour bands (rank 8 shows totals). | 0 |
| 11 | On the clock | Flag wins and flag losses, share of moves under 5 s, average think, time-trouble accuracy (tier 1/2), "you were ahead on the clock in X% of games". | Clock-pressure moments: the position of the longest think in the period. | 0 (+1/2) |
| 12 | Then and now | Accuracy trend (first vs second half of the period), blunder rate per 100 moves, tilt check: win rate in the game right after a loss vs after a win. | Split board: left half tinted for "then", right for "now", with the two accuracy figures. | 2 (+1), tilt is 0 |
| 13 | How your games end | Wins by checkmate/resignation/timeout/abandonment; losses the same; draws by type; favourite mating piece and pattern (back rank, smothered, ladder, queen-and-king). | The user's most recent checkmate delivered. | 0 |
| 14 | Share | Copy link, download a PNG card, "Open in review" for any highlighted game. Privacy note stating what the link contains. | A composed card preview. | — |

Slides 11 and 12 degrade: with no engine data they show their tier-0 facts and a
"Run engine check (≈N min)" button in place of the accuracy figures.

### Archetype classifier (slide 5)

Pure function over the tier-0 aggregate. Each archetype has explicit, documented
triggers and a template reason; choose the highest score, show the runner-up, and
require at least 30 games. Starting roster (adjust freely, keep 10 to 14):

| Archetype | Triggers (examples, normalised against the user's own games) |
| --- | --- |
| Tal | High sacrifice rate (material deficits that end in wins), high check rate, short decisive wins, low draw rate, 1.e4 |
| Morphy | Open games, gambits (pawn down by move 10 in the opening), both knights developed early, castles early, short wins |
| Capablanca | Many queen trades, high share of games reaching an endgame, high win rate in endgames, low blunder proxy, few checks |
| Petrosian | Low loss rate, long games, high draw rate, rarely down material, few early pawn storms |
| Karpov | High win rate while ahead on material, long games, low variance, closed openings (1.d4/1.c4) |
| Kasparov | 1.e4 and Sicilian as Black, long main-line openings, high capture rate, attacking pawn storms |
| Fischer | 1.e4 dominance, Najdorf/King's Indian as Black, high rated win rate, low draws |
| Nimzowitsch | Fianchettos, flank openings (1.Nf3/1.c4/1.b3), hypermodern replies (Nimzo/Queen's Indian), late pawn commitments |
| Alekhine | Complicated middlegames: high material-swing count per game, many checks, both wins and losses decisive |
| Lasker | Comebacks: many wins from material deficits, strong results after a loss, long games |
| Carlsen | Grinder: high win rate in long games, high endgame share, low resignation rate, converts small edges |
| Anand / Nakamura (speed) | Majority bullet/blitz, fast average think, many flag wins, high games per session |
| Rubinstein | Rook endgame frequency, endgame win rate, quiet openings |
| Steinitz | King safety first: late king exposure, many defended wins from a material deficit, early queen-side castling |

Each archetype ships with one famous public-domain position (FEN + 2–6 moves) in
`data/profile/archetypes.json` with our own one-line caption. Document the
triggers in `docs/PLAYER_PROFILE.md` so users can see why they got their twin.

### Signature-move detector (slide 6)

Replay-based pure functions, each returning `{rate, count, sample, gameIds}`:
early knights (both by move 4), early castling (by move 8) and side, opposite-side
castling, fianchetto (g3/b3/g6/b6 with bishop), queen trade (move number and rate),
early queen sortie (queen moved by move 5), gambit (pawn down at move 10 with no
compensation in material), kingside pawn storm (g/h pawn to rank 5+ with enemy king
on that side), bishop pair kept past move 25, knight preference (knights kept,
bishops traded), en passant count, promotions and underpromotions, average game
length, most-moved piece, favourite square per piece, checks per game, captures
per game. Choose the three most distinctive versus a neutral baseline (bundle a
small baseline from public Lichess data or use fixed thresholds; document which).

---

## Storage schema (all `chrome.storage.local`, versioned)

- `profile:v1:index` — per site+account: `{period, fetchedMonths[], lichessSince,
  lastBuilt, settingsKey, engineBudget}`.
- `profile:v1:games:<site>:<account>` — compact feature rows, about 250 bytes per
  game (id, end time, class, rated, colour, result, termination, ratings, opponent,
  ECO/opening, duration, moves, clocks summary, material-swing summary, signature
  flags, local hour/weekday). Chunk by year if a single value grows past 1 MB.
  5000 games ≈ 1.3 MB; fine under `unlimitedStorage`.
- `profile:v1:engine:<site>:<gameId>` — sampled depth-8 result (accuracy per side,
  eval curve downsampled to 32 points, worst/best plies). Cap at 2000 entries with
  the same LRU index pattern as `gamecache.js`.
- `profile:v1:report:<site>:<account>:<period>` — the computed slide payload (what
  the share link encodes), so reopening is instant.

Settings: a **Player profile** section with period default, engine budget preset,
"include games I played against bots" toggle, and **Delete profile data**. Document
all of it in `PRIVACY.md`.

---

## UI and transition

- Button: `#profileToggle`, same `icon-btn learning-toggle` style, to the right of
  `#learningToggle`, label **Player profile**; while open it reads **Return to Game
  review**. Both toggles are mutually exclusive (opening one while the other is
  open first closes it).
- Takeover: snapshot the review state exactly as `openLearning` does; pause
  background analysis; make `.mod` panels inert and fade them (300 ms, reduced
  motion: instant); mount one `.profile-shell` panel over the panel column
  occupying the union of the hidden panels' rectangles (recompute on resize, same
  as `positionCentered`). The board stays in place and keeps its theme; the
  profile draws overlays (heat-map cells, highlights, arrows) through the same
  `drawArrow`/`makePiece` hooks the learning workspace uses, and restores with
  `restoreBoard` on exit.
- Slide chrome: title, body, evidence row, prev/next, dots (`role="tablist"`),
  keyboard Left/Right/Home/End, optional autoplay (8 s) with pause on hover/focus.
  Progress: a slim bar showing "Reading your games… 412/1,230" then "Engine check
  3/150 (≈6 min left)". Tier-0 slides render while the engine runs; engine
  figures fill in place with the reveal animation when ready.
- States: no identity (ask for a username), empty (fewer than 10 games), fetch
  error (retry, keep cached months), partial (engine not run), narrow widths down
  to 320 px, both themes, reduced motion.
- Viewer mode: opening a `#profile=` link shows the recipient the deck read-only
  from the payload with a banner "Shared by {name}. Build your own →"; no refetch.

## Share (slide 14)

- Link: `carrierUrl#profile=<base64url(deflate-raw(JSON))>` using
  `CompressionStream` (Chrome and Firefox both support it); keep the payload under
  about 8 KB by including only the numbers, labels, a handful of FENs/short move
  lists for the board, and game URLs. No account tokens, no perspective data (same
  rule as `shareGame`). Read it in `content.js`/`lichess-content.js` next to the
  existing `#gambit=` handler.
- Card: render a 1200×630 PNG with `<canvas>` (headline numbers, twin, top
  opening, rival) and offer **Download card**. No external fonts; use bundled
  fonts from `fonts/`.
- Privacy note on the slide: what the link reveals (username, aggregate stats,
  linked games), and that the recipient needs the extension to view it.

---

## Stages (commit one at a time)

0. **Spike and measurements** (no UI). Scripts in `scripts/bench/`: fetch one real
   archive end to end with timings and payload size; replay 1000 games with
   `chess.js` in a worker and time it; run the depth-8 pass on 20 games and time per
   game with 1/2/4 workers. Write the numbers into `docs/PLAYER_PROFILE.md` and fix
   the budget presets from them.
1. **Data layer** `lib/profile/`: `sources/chesscom.js` (incremental months),
   `sources/lichess.js` (NDJSON with `since`), `features.js` (pure replay →
   feature row), `store.js` (schema above, versioned, LRU), `collector.js`
   (orchestration with progress, pause, cancel, resume; runs in a Worker). Tests
   with fixture PGNs covering every termination type, clocks present/absent,
   custom FEN rejection, bot games, aborted games.
2. **Aggregators** `lib/profile/insights/*.js`: results, ratings, openings,
   opponents, streaks, habits (local time), terminations, signature, archetype,
   comeback/choke proxy, tilt. Each returns `{value, sample, evidence}` or `null`,
   with documented minimum samples. Golden tests over a synthetic 300-game fixture.
3. **Library tier**: aggregate `gameStatistics` over library games into the same
   insight shapes, labelled `source:'review'`.
4. **Engine tier**: `lib/profile/engine-sample.js` (sample selection from tier-0
   candidates and time strata), `profile-engine-host` in the offscreen document
   (Chrome) / background (Firefox) reusing `PreviewEngine` with a worker pool
   bounded by `engineWorkers`; per-game cache; budget presets; never overlaps a
   running review.
5. **UI**: toggle button, takeover/restore, slide deck, board visualizations
   (heat-map overlay, progressive fill, move playback, split tint), progress bar,
   states, keyboard, reduced motion; jsdom tests plus
   `scripts/player-profile-audit.mjs` (screenshots at eight viewports, both
   themes, Old/Modern/Custom setups, return-to-review geometry).
6. **Share**: `#profile=` link, viewer mode, PNG card, privacy copy;
   `PRIVACY.md` and `README.md` updates.
7. **Settings and housekeeping**: Player profile settings section, delete data,
   storage caps verified, `docs/PLAYER_PROFILE.md` tracker complete, lint, full
   test suite, Chrome and Firefox smoke (`npm run test:browsers`).

Report after every stage: what is fully usable, what is measured, what is still
missing. If a slide cannot be made honest from available data, drop it and say so
rather than approximating silently.

---

## Decision needed (answer these; defaults apply if unanswered)

- **D1. Period.** Default **past 12 months**, with a picker offering This year,
  Past 12 months, All time, Last 100 games. Confirm the default.
- **D2. Whose profile.** Default: the resolved identity for the current site, with
  a username field when unknown. Should the user be able to type *any* username to
  build someone else's tier-0 profile (cheap, fun, but it is another person's
  public data)? Default: yes for tier 0, engine tier only for the user's own
  account.
- **D3. Engine budget default.** Default **Standard (about 10 min)** with Quick and
  Deep available, and an explicit **Run engine check** button rather than starting
  automatically. Confirm or choose auto-start.
- **D4. Borrowed data.** Chess.com's `accuracies` and Lichess server evals exist
  for a subset of games for free. Default: show them only as a clearly separate
  "Chess.com says / Lichess says" footnote, never merged into our figures, and
  not in the first release. Confirm.
- **D5. Tone.** Default: playful Spotify-style headlines with factual sub-lines;
  negatives framed kindly. Confirm, or ask for neutral copy.
- **D6. Share format.** Default: both the `#profile=` link (needs the extension)
  and a PNG card download. Confirm.
- **D7. Autoplay.** Default: off, with an optional play button. Confirm.
- **D8. Lichess in the first release?** Default: yes for tier 0 and 2 (the export
  is one request); the library tier works for both already. Confirm or defer.
- **D9. Bot games.** Default: excluded from all figures, with a settings toggle.
- **D10. Where the engine tier runs.** Default: the offscreen document on Chrome
  and the background page on Firefox (same as previews), so it survives the review
  tab being closed and resumes from the cache. Alternative: in the review tab only.

---

## Implementation tracker

- [ ] Stage 0: measurements recorded in `docs/PLAYER_PROFILE.md`
- [ ] Stage 1: data layer and collector with tests
- [ ] Stage 2: aggregators with golden tests
- [ ] Stage 3: library tier
- [ ] Stage 4: engine tier with budgets and cache
- [ ] Stage 5: UI, transition, board visualizations, audit script
- [ ] Stage 6: share link, viewer mode, PNG card, privacy docs
- [ ] Stage 7: settings, housekeeping, full verification
