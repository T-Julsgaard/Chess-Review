# Player profile — objective and progress

## Implementation tracker

First complete release built on 2026-11-16. The feature is a "Spotify Wrapped" style recap of a
player's games, opened from the **Player profile** button beside **Learn with Chess review**.
The review panels fade out, one profile panel takes their footprint, and the board becomes the
picture for every slide. This file travels with the repository so development can continue on
another computer; the design decisions are recorded in [PLAYER_PROFILE_PLAN.md](PLAYER_PROFILE_PLAN.md).

- [x] Stage 0: measurements. The replay of one game costs about 1–4 ms with `lib/chess.js` (a
  300-game synthetic season aggregates in about 25 ms in the test suite); a full season of a
  few thousand games replays in seconds, chunked in 14 ms slices that yield to the page. The
  engine sample reuses the review-button preview discipline (depth 8, one line, one worker per
  lane, 9 s cap per game); the presets below are derived from the measured 4–6 s per game of
  that pass. Real archive timings depend on Chess.com's CDN; months are fetched serially with a
  150 ms pause and finished months are cached, so a second visit costs one request.
- [x] Stage 1: data layer — `lib/profile/features.js` (replay → feature row), `sources.js`
  (Chess.com monthly archives and Lichess NDJSON normalised to one shape, incremental months),
  `store.js` (versioned rows per site+account, bounded engine cache of 2000 entries, job
  record), `collector.js` (periods, orchestration, cancel, progress). `tests/profile-features.test.mjs`.
- [x] Stage 2: insights — `lib/profile/insights.js` (totals, ratings, openings, opponents,
  streaks, habits in local time, terminations, clock, material, signature moves, engine figures),
  `archetypes.js` (twelve historical twins with documented triggers), `deck.js` (fourteen
  slides). `tests/profile-insights.test.mjs`.
- [x] Stage 3: library tier — folded into the engine tier: a fully reviewed library game is not
  re-sampled by the engine when its id is already cached; the deck labels every accuracy figure
  as a depth-8 estimate from the sample. (See "Changes from the plan".)
- [x] Stage 4: engine tier — `lib/profile/engine-sample.js` (candidate-first, time-stratified
  sample; depth-8 pass; job host with worker lanes, cache, cancel), `pgn-source.js` (PGN from the
  cached month or the Lichess export), hosted by `preview.js` (Chrome offscreen document) or the
  background page (Firefox) and routed through `background.js`. `tests/profile-engine.test.mjs`.
- [x] Stage 5: UI — `lib/profile/workspace.js`, `board.js`, `profile.css`, the toggle, settings
  category and shared-profile startup in `analysis.js`. Keyboard (arrows, Home, End, Escape),
  count-ups, slide transitions, reduced motion, chooser/empty/error/partial states, mutual
  exclusion with learning. `tests/profile-workspace.test.mjs`.
- [x] Stage 6: share — `lib/profile/share.js` (deflated base64url payload, sanitised on decode),
  the GitHub Pages viewer in `profile/`, `#p=` handling in both
  content scripts and `profile-viewer-content.js`, `openProfile` in the background.
- [x] Stage 7: settings (default period, engine budget, bots toggle, storage usage, delete),
  `PRIVACY.md`, `README.md`, this tracker, full test suite, lint and package build.

## Fully usable now

Open any review, press **Player profile**. The panels fade into one profile panel; the board
plays the cover after **Build profile**. Known accounts (signed-in, remembered or recurring in
your reviewed games) are prefilled. Saved games load immediately and newer games refresh in the background.
The slides are: cover, the numbers, rating journey, your openings, your historical twin, signature
moves, your rival, greatest hits, comebacks and the one that got away, chess habits, on the clock,
then and now, how your games end, and the overview. Each slide drives the board: first moves, progressive
win/draw/loss fill, peak-rating position, favourite line playback, the twin's famous game or your
most twin-like game, a destination heat-map, the rival's latest decisive position, the comeback
from its low point, your week as a weekday-by-hour heat-map, the longest think, a then/now split,
your latest checkmate and the overview tiles. Select a tile to revisit its chapter. Every number has a sample and, where a game is involved,
an **Open** link to the platform.

Section headings identify each chapter at a glance. The results board preserves fractional
win/draw/loss squares. Rating journey has a game-mode selector; hovering over the chart or
focusing it and using arrows reveals each plotted date and rating. On game slides, Left/Right
step through moves (full games load on first use); Page Up/Page Down and the navigation buttons
change slides. Pieces assemble and disassemble through the board edges.

The engine check never starts by itself. The Then-and-now slide offers **Run engine check** with
Quick (about 40 games, 2 min), Standard (about 150, 10 min) or Deep (about 400, 30 min). The job
runs in the extension's offscreen document (Chrome) or background page (Firefox), so the review
tab can be closed; results are cached per game and a stale job can be resumed. Engine figures
fill the Then-and-now and On-the-clock slides and verify the comeback and choke with winning
chances.
Chrome's offscreen host uses runtime messages for profile storage and cached PGN lookups;
the background process performs those operations because offscreen documents cannot use storage APIs.

Share copies a link to `https://t-julsgaard.github.io/Chess-Review/profile/#p=…`. Without the
extension the page decodes the fragment in the browser and opens the extension's own Story
workspace on it in shared mode (`profile/viewer.js` subclasses `StoryWorkspace` and loads the
extension's stylesheets), so the chapters, board charts, twin portrait and game replays look as
they do in Chess Review. A viewed game fetches its moves directly from Chess.com or Lichess and
evaluates with the bundled Stockfish 19 Lite, with the review's move sounds. The page adds install
nudges: "Visit Chrome Web Store" and "Visit Firefox Add-ons" in the top bar (the visitor's own
browser in green), an install dialog behind the panel's green "Build your own", and a "Your turn"
card on the last chapter. On the web the Left/Right arrows only step through a game on the board;
chapters turn with Next/Previous or Page Up/Down. The time-control switch is hidden there, since the
link carries the report and not the games. The month-by-month chapter is counted from the games, so
the link carries its totals (`report.season`, checked by `sharedSeason`); the intro's mosaic of
every game and an accuracy chapter without a finished accuracy check have nothing to draw from a
link and stay off. When the extension is installed (`profile-viewer-content.js` marks the page) the
nudges hide and the same link opens the full deck on the board.

## Changes from the plan, and why

- **Library tier folded into the engine tier.** The plan had a separate "reviewed games"
  tier using `gameStatistics` over the library. Mixing depth-16 library numbers with depth-8
  sample numbers in one average would have produced figures of two different fidelities under one
  label, which the plan itself forbids. The sample now treats cached games as free and labels all
  accuracy figures as depth-8 estimates. A later release can surface library figures separately.
- **Bot games.** Lichess marks computer opponents (AI level, BOT title). Chess.com's public
  archive does not include games against its own computer, so the toggle affects Lichess only.
- **Account chooser.** Any username can be typed for a tier-0 profile (decision D2); the engine
  check is offered for every loaded account because the offscreen job only ever reads public
  games the browser already fetched. Nothing distinguishes "own" accounts reliably enough to gate
  it without false negatives.
- **No separate `#profile=` fragment on chess.com links.** The fragment is `#p=` everywhere
  (viewer page, chess.com, lichess) to keep links short.

## Documented assumptions

Signature-move baselines are round assumptions about typical club play, not measurements: both
knights out by move 4 in 35% of games, castled by move 8 in 45%, queenside castling in 12% of
castled games, opposite-side castling in 15% where both castle, fianchetto 25%, queen trade by
move 20 in 15%, early queen 12%, opening pawn investment 10%, kingside pawn storm 12%, bishop pair
kept to move 25 in 30% of long games, endgame reached 30%, 2.2 checks per game, en passant 5%,
underpromotion 0.5%. A habit is shown when the player's rate is distinctive relative to the
baseline and the sample is large enough; the template says the player's own rate.

Archetype triggers are the weighted traits in `lib/profile/archetypes.js`, normalised against
round reference values (for example sacrifice wins 30%, draws 15%, endgame share 50%, 110 plies
per game, bullet share 60%). The reason shown is built from the three largest contributions
with the player's own figures. The three famous games (Morphy 1858, Anderssen 1851, Réti 1910)
are public-domain move lists verified legal and mating by the test suite.

Time trouble: own clock below a tenth of the base time (or ten seconds) before a move. Snap
move: under five seconds of thinking after removing the increment. Session: games at most
twenty minutes apart. Tilt check: the next game within two hours. Night: 23:00–05:00 local time.

## Where to continue

- Data and aggregation: `lib/profile/features.js`, `sources.js`, `store.js`, `collector.js`, `insights.js`
- Twin and copy: `lib/profile/archetypes.js`, `deck.js`
- Engine sample and hosting: `lib/profile/engine-sample.js`, `pgn-source.js`, `preview.js`, `background.js`, `lib/preview-runner.js`
- Workspace and board: `lib/profile/workspace.js`, `board.js`, `profile.css`; entry and settings in `analysis.js` (`openProfile`, `profileSettings`)
- Share: `lib/profile/share.js`, `profile/` (GitHub Pages viewer), `profile-viewer-content.js`, `content.js`, `lichess-content.js`
- Tests: `tests/profile-*.test.mjs`, synthetic season in `tests/helpers/profile-season.mjs`
- Verify: `npm test`, `npm run lint`, `npm run verify:source`, `npm run build`

## Original objective (verbatim)

Besides the "learn with chess review" button I'd like a "Player profile" And this will essentially be like a "Spotify wrapped" but for your chess games. We'll use either the users already analyzed games inside the extension or perhaps if needed pull some / all of their previous games (however we can't have them normally analyze all of their previous games, that'd take forever) But before we access how /which data we need, we need to figure out what's important to show, i think i'll let you have a lot of creative freedom on this. Figure out what a player would like to see on this recap, some of my suggestions is like What historical player they play as, and then a reason for why that is, and then also which opponent they had the most and what their win rate and stuff like that is against that player in different time modes. Come up with more relevant stuff they'd like to see.
Some more suggestions could be total games played, wins, draws, losses, hours spent playing chess, total moves made. Average accuracy in whatever time game mode. rating change over time. Favorite opening and win rates displayed with the different most played openings. Highest accuracy game over x amount of moves. Strongest opponent beaten, longest winning streak, biggest comeback.

Chess habits, favorite time to play, late night chess win rate vs day. Most active chess day. Whether accuracy drops or rises of x amount of games. How often they choke a winning position (i.e. not form
Signature moves, like patterns e.g. early knights out or queen trades or aggressive kingside play)
End it all of with a share link so that the player can share this with another player.

Some of these things might be unrealistic to get - I'm not sure - if e.g. some of the items will have the users sit and wait for hours on the analysis to finish then let's not have that. But we can accept a wait between 2-30 minutes. running locally on the users pc.

The player review section should remain on the same board as when normally analyzing the game, but afer it's pressed essentially the tabs that currently help the user analyse the game will fade it one tab that will now display the information on their player profile. It should feel and look intuitive and easy to get an overview of. And the user can go to next page/slide to get more information and the board will be used sort of a visualization / viewing experience for what is shown. I'm open to letting this feature import information through the api that we need to acess this stuff however we just don't want a scenario where the user has to analyzse all of their played games in a normal analysis (16 depth) locally, that would take forever, however let's say there's only one thing that we need from all of their games, e.g. winrate, then if it's not messy use of the api then we can export data from all of their chess.com games, so we remain flexible on this part.

The full implementation prompt, with the settled decisions, is in [PLAYER_PROFILE_PLAN.md](PLAYER_PROFILE_PLAN.md).
