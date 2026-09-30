# Privacy Policy — Chess Review

_Last updated: 2026-09-30_

Chess Review is a browser extension that reviews the chess games you play on
**Chess.com** and **Lichess**. This policy explains exactly what the extension
does with data. **Analysis runs locally. Game lookup requests go directly to the
chess platforms. No data is sent to the developer or to an analytics or advertising
service by the extension.** Sharing a game is an explicit user action described below.

## What the extension does

- When you open the extension on a finished game, it reads the game (the moves /
  PGN) and analyzes it locally using a **Stockfish chess engine that is bundled
  inside the extension** and runs in your browser. It then shows accuracy scores,
  move classifications, an evaluation graph, and an estimated rating.
- To fetch a game you ask it to review, it calls the **public Chess.com and
  Lichess APIs** (for example to retrieve the PGN of the game by its id, or the
  games of the username you provide). These requests go directly from your
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
- The chess username you enter or that is detected from the page, used to seat
  you on the correct side of the board.
- A cache of public game/API responses, PGNs, and computed analysis, so
  re-opening a game does not require re-downloading or re-analyzing it.
- Chess.com monthly archive responses can contain other games and optional
  platform-provided accuracy fields. Those responses may be cached locally;
  displayed review scores are calculated by the extension, not read from those fields.

The cache, preferences, and computed analysis stay on your device. A public username
or game ID is sent to the relevant chess platform when needed for a game lookup,
as described above. You can clear local data by removing the extension or clearing
its storage in your browser.

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

- We do **not** collect, transmit, or store your data on any server operated by
  the developer. The extension has no backend.
- We do **not** use any analytics, telemetry, tracking, or advertising.
- We do **not** sell your data. Apart from the platform lookup requests above,
  the extension does not automatically send your games or analysis to third parties;
  you control whether to share a game link.
- We do **not** use your data to determine creditworthiness or for lending.
- We do **not** access any websites other than Chess.com and Lichess.

## Permissions

- **`storage` / `unlimitedStorage`** — to save your preferences and the local
  game cache described above.
- **`activeTab`** — only when you click the extension or press its shortcut, to
  read the current tab's URL and detect the Chess.com / Lichess game to review.
- **Host access to `chess.com` and `lichess.org`** — to add the review button to
  those game pages and to fetch your game's PGN from their public APIs.
- **Firefox data permissions (`browsingActivity`, `websiteContent`)** — disclose
  the game identifiers and public player usernames used in those lookup requests.
  These permissions do not add tracking, telemetry, or a developer backend.

## Contact

Questions about this policy: **Thomas@Julsgaard.dev**

Source code: <https://github.com/T-Julsgaard/Chess-Review>
