# Privacy Policy — Chess Review

_Last updated: 2026-06-24_

Chess Review is a browser extension that reviews the chess games you play on
**Chess.com** and **Lichess**. This policy explains exactly what the extension
does with data. The short version: **everything happens on your own device, and
no data is ever sent to the developer or to any analytics or advertising service.**

## What the extension does

- When you open the extension on a finished game, it reads the game (the moves /
  PGN) and analyzes it locally using a **Stockfish chess engine that is bundled
  inside the extension** and runs in your browser. It then shows accuracy scores,
  move classifications, an evaluation graph, and an estimated rating.
- To fetch a game you ask it to review, it calls the **public Chess.com and
  Lichess APIs** (for example to retrieve the PGN of the game by its id, or the
  games of the username you provide). These requests go directly from your
  browser to those chess platforms — the same services you are already using.

## What is stored, and where

The extension stores the following **locally on your device only**, using the
browser's `chrome.storage.local`:

- Your preferences (board/piece theme, chosen coach, engine settings).
- The chess username you enter or that is detected from the page, used to seat
  you on the correct side of the board.
- A cache of PGNs and computed analysis for games you have reviewed, so
  re-opening a game does not require re-downloading or re-analyzing it.

This data never leaves your device. You can clear it at any time by removing the
extension or clearing its storage in your browser.

## What we do NOT do

- We do **not** collect, transmit, or store your data on any server operated by
  the developer. The extension has no backend.
- We do **not** use any analytics, telemetry, tracking, or advertising.
- We do **not** sell or transfer your data to third parties.
- We do **not** use your data to determine creditworthiness or for lending.
- We do **not** access any websites other than Chess.com and Lichess.

## Permissions

- **`storage` / `unlimitedStorage`** — to save your preferences and the local
  game cache described above.
- **`activeTab`** — only when you click the extension or press its shortcut, to
  read the current tab's URL and detect the Chess.com / Lichess game to review.
- **Host access to `chess.com` and `lichess.org`** — to add the review button to
  those game pages and to fetch your game's PGN from their public APIs.

## Contact

Questions about this policy: **T.Julsgaard@proton.me**

Source code: <https://github.com/T-Julsgaard/Chess-Review>
