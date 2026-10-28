# Privacy Policy — Chess Review

_Last updated: 2026-10-28_

Chess Review is a browser extension that reviews the chess games you play on
**Chess.com** and **Lichess**. This policy explains exactly what the extension
does with data. **Analysis runs locally. Game lookup requests go directly to the
chess platforms. No analytics or advertising services are used.** Optional online
puzzle rankings and sharing a game are explicit user actions described below.

## What the extension does

- When you open the extension on a finished game, it reads the game (the moves /
  PGN) and analyzes it locally using a **Stockfish chess engine that is bundled
  inside the extension** and runs in your browser. It then shows accuracy scores,
  move classifications, an evaluation graph, and an estimated rating.
- To fetch a game you ask it to review, it calls the **public Chess.com and
  Lichess APIs** (for example to retrieve the PGN of the game by its id, or the
  games of players detected on the page or in local game history). These requests go directly from your
  browser to those chess platforms — the same services you are already using.
- The content scripts read game identifiers, public player information, board
  orientation and available moves from Chess.com/Lichess pages to support
  review controls and game detection. This page access is separate from API requests.
- Lookup requests disclose the requested username/game identifier to the relevant
  platform, which also receives normal network information such as your IP address.

## What is stored, and where

The extension stores the following **locally on your device only**, using the
browser's `chrome.storage.local`:

- Your preferences (board/piece theme, chosen coach, engine settings).
- Learning progress: lesson/exercise results, opening study progress and bookmarks,
  puzzle results, unfinished activities, and timed-challenge history and personal bests.
  Learning content is bundled for offline use. Choosing a source puzzle link opens
  Lichess in a new tab; progress is not sent with that link.
- Player names and identifiers from the 50 most recent distinct games opened for
  analysis on each platform. Together with your saved game library (up to 300
  games), these support automatic player and board perspective detection.
  Chess.com and Lichess evidence are kept separate. Previously saved usernames
  may still be used as archive lookup candidates.
- A cache of public game/API responses, PGNs, and computed analysis, so
  re-opening a game does not require re-downloading or re-analyzing it.
- Chess.com monthly archive responses can contain other games and optional
  platform-provided accuracy fields. Those responses may be cached locally;
  displayed review scores are calculated by the extension, not read from those fields.

The cache, preferences, and computed analysis stay on your device. A public username
or game ID is sent to the relevant chess platform when needed for a game lookup,
as described above. You can clear local data by removing the extension or clearing
its storage in your browser.

## Optional puzzle leaderboards

Developer debugger can import a CSV for temporary leaderboard previews. Imported
rows stay in the current tab's memory and disappear on reload or **Clear test
data**. They are not written to browser storage or uploaded. Online leaderboard
requests and ranked submissions are blocked while that preview is active.

Leaderboards are disabled until an online service is configured in a release.
Opening a configured leaderboard fetches public rankings from a Cloudflare Worker;
Cloudflare receives normal network information, including your IP address. The
rankings refresh every 30 seconds while open. Viewing does not upload your local
progress or require a player key.

To participate, you explicitly verify on the service's hosted Turnstile page,
connect a private player key, then choose **Play ranked**. The key and generated
player name are stored locally. Firefox requests optional authentication-data
and puzzle-interaction consent before connecting. Ranked play sends the key, session identifiers and
puzzle move sequences to the service to verify results. Your games, PGNs, chess-site
identity, browsing history, settings and historical local progress are not sent.
Your generated name and verified scores are public.

The service stores a hash of your player key, generated name, creation time,
unique solved puzzle IDs, scores and achievement times, and a short-lived session
with assigned/previous puzzle IDs. Submitted moves are checked in memory; only a
digest and the previous result are retained for safe retries. One session per
player is retained and removed by scheduled cleanup after expiry. Scores and
unique solve IDs remain until you delete them. The service does not store raw IP
addresses; it uses daily rotating keyed digests for short-lived rate limiting.
Cloudflare processes network information for hosting, abuse prevention and
Turnstile verification under its own policies. Worker request logging is disabled.

Use **Player settings → Disconnect** to remove the key locally, or **Delete online
records** to delete your player and scores from the service. Cached public records
may remain visible for up to 30 seconds. Clearing extension storage alone does not
delete public scores. Keep the player key private and save it if you need future
access; the service does not collect an email address for recovery.

## Sharing a game

Choosing **Share game** copies a link to your clipboard. Its URL fragment contains
the PGN and game metadata, including player information and your selected player
name/perspective. The payload is encoded, **not encrypted**. Anyone you give the
complete link to can decode it. Review the information before sharing private PGNs.

The extension does not upload that payload to a developer server. URL fragments
are normally not included in HTTP requests, but the complete link is visible to
its recipient and any messaging service you use to share it. Opening the link
visits the chess platform named in the URL.

## What we do NOT do

- We do **not** upload your games, analysis or local learning history to a
  developer server. Optional ranked puzzle play uses the service described above.
- We do **not** use any analytics, telemetry, tracking, or advertising.
- We do **not** sell your data. Apart from the platform lookup requests above,
  the extension does not automatically send your games or analysis to third parties;
  you control whether to share a game link.
- We do **not** use your data to determine creditworthiness or for lending.
- Network access consists of chess-platform lookups and the optional configured
  leaderboard service; its verification page also loads Cloudflare Turnstile.

## Permissions

- **`storage` / `unlimitedStorage`** — to save your preferences and the local
  game cache described above.
- **`activeTab`** — only when you click the extension or press its shortcut, to
  read the current tab's URL and detect the Chess.com / Lichess game to review.
- **Host access to `chess.com` and `lichess.org`** — to add the review button to
  those game pages and to fetch your game's PGN from their public APIs.
- **Host access to the configured leaderboard origin**, when enabled in a release
  — to fetch rankings and verify explicitly chosen ranked puzzle play.
- **Firefox data permissions (`browsingActivity`, `websiteContent`)** — disclose
  the game identifiers and public player usernames used in those lookup requests.
  These permissions do not add tracking or telemetry. Optional `authenticationInfo`
  consent covers the player key used for online rankings; optional
  `technicalAndInteraction` consent covers ranked puzzle moves and scores.

## Contact

Questions about this policy: **Thomas@Julsgaard.dev**

Source code: <https://github.com/T-Julsgaard/Chess-Review>
