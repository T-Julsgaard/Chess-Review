# Privacy Policy — Chess Review

_Last updated: 2026-10-29_

Chess Review is a browser extension that reviews the chess games you play on
**Chess.com** and **Lichess**. This policy explains exactly what the extension
does with data. **Analysis runs locally. Game lookup requests go directly to the
chess platforms. No analytics or advertising services are used.** Optional online
puzzle rankings and sharing a game are explicit user actions described below.

## Who is responsible for your data?

**Thomas Julsgaard** operates Chess Review and is the **data controller** for the
personal data processed to provide the extension and its optional leaderboard
service. For privacy questions or to exercise your data protection rights, contact
[Thomas@Julsgaard.dev](mailto:Thomas@Julsgaard.dev).

Chess.com, Lichess and Cloudflare also process information when you contact their
services, as described below. Their own privacy notices explain processing for
which they are independently responsible.

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
Leaderboards are **off by default**, including for previously connected players.
The leaderboard panel explains participation and asks you to opt in, with a
separate choice of a nationality or **Don’t show nationality**. No country is
preselected or inferred for leaderboard sharing. The extension stores
your choice, notice version and acceptance time locally. Before opt-in, it does
not fetch rankings, connect a player or upload results to the leaderboard service.
After opt-in, opening a configured leaderboard fetches public rankings from a Cloudflare Worker;
Cloudflare receives normal network information, including your IP address. The
rankings load when opened, paged or manually refreshed; recent pages are cached
for one minute. Viewing does not upload your local
progress or require a player key.

To participate, you explicitly verify on the service's hosted Turnstile page,
connect a private player key, then choose **Play ranked**. The key and generated
player name are stored locally. Firefox requests optional authentication-data
and puzzle-interaction consent before connecting. Ranked play sends the key, session identifiers and
puzzle move sequences to the service to verify results. Ranked practice keeps up
to five pending solution proofs in local extension storage for batched submission
and safe retry after a restart. Its server assignment expires after seven days.
Time attack and Knockout still verify attempts individually. Your games, PGNs, chess-site
identity, browsing history, settings and historical local progress are not sent.
Your generated name and verified scores are public.

If you choose a nationality, opening a leaderboard with a connected player key
sends your selected country code. Its bundled flag and country name are public
alongside your generated name. This is your own selection; leaderboard nationality
does not use your Chess.com profile, local game history or IP address.
Select **Don’t show nationality** in **Settings → General → Leaderboard** to remove the
online flag. If the service is unavailable, removal stays pending and can be
retried from settings. It is also retried when you next open rankings with your
connected key. The flag is removed when you delete your online player as well.

The service stores a hash of your player key, generated name, creation time,
unique solved puzzle IDs, scores and achievement times, and a short-lived session
with assigned/previous puzzle IDs. Submitted moves are checked in memory; only a
digest and the previous result are retained for safe retries. One session per
player is retained and removed by scheduled cleanup after expiry. Scores and
unique solve IDs remain until you delete them. The service does not store raw IP
addresses; it uses daily rotating keyed digests for short-lived rate limiting.
Cloudflare processes network information for hosting, abuse prevention and
Turnstile verification under its own policies. Worker request logging is disabled.

Use **Settings → General → Leaderboard** to change nationality sharing or opt out.
Opting out immediately stops new leaderboard reads and uploads, discards unsent
results, and requests deletion of your online records. If deletion fails, the
extension stays opted out and keeps the private key solely to retry deletion.
Settings shows the pending deletion and a retry button; reopening the learning
workspace also retries it. Joining again is blocked until deletion succeeds.
**Opt out & delete data**
asks for confirmation, deletes your online player, scores, solve IDs, session and
country, clears its local key, and opts you out. A failed deletion keeps the key
so you can retry. Privacy removal requests still contact the service after opt-out.
Cached public records may remain visible for up to one minute. Clearing extension storage alone does not
delete public scores. Keep the player key private and save it if you need future
access; the service does not collect an email address for recovery.

## Legal bases for online leaderboard processing

- **Your consent — GDPR Article 6(1)(a):** joining the leaderboards, verifying your
  ranked attempts, storing your leaderboard player and results, and publishing
  your generated name and scores. Publishing a nationality is a separate,
  optional choice covered by your consent. Neither choice authorises uploading
  historical offline puzzle progress.
- **Legitimate interests — GDPR Article 6(1)(f):** the limited connection handling,
  anti-bot verification checks, rate limits and abuse-prevention counters needed to keep
  the service available and protect it and its users against automated abuse.
  The interests pursued are network security and fair, reliable access to the
  leaderboard service. This does not provide a replacement basis for keeping
  your public player or scores after you withdraw consent.
- **Legal obligations — GDPR Article 6(1)(c):** processing the information necessary
  to respond to applicable data protection rights requests and meet GDPR duties.

Participation and nationality sharing are voluntary. Declining or withdrawing
consent leaves offline puzzles and local analysis available. You can withdraw
leaderboard consent through **Settings → General → Leaderboard → Opt out & delete
data**, or contact the privacy email above. You can withdraw nationality sharing
alone by choosing **Don’t show nationality**. Withdrawal does not affect the
lawfulness of processing that took place before it was withdrawn.

The service automatically checks puzzle moves and calculates rankings. These
checks do not make decisions with legal or similarly significant effects on you.

## Your data protection rights

Where the GDPR applies, you can contact
[Thomas@Julsgaard.dev](mailto:Thomas@Julsgaard.dev) to:

- request confirmation of processing, access to your personal data and a copy;
- ask for inaccurate personal data to be corrected;
- request erasure or restriction of processing, where the conditions apply;
- request a portable, commonly used machine-readable copy of data you provided
  where the right to data portability applies;
- object, on grounds relating to your particular situation, to processing based
  on legitimate interests. That processing must stop unless there are compelling
  legitimate grounds that override your interests, rights and freedoms, or it is
  needed for legal claims;
- withdraw consent at any time, including separately for nationality sharing.

These rights have conditions and exceptions under the GDPR. You do not need to
use particular legal wording to make a request. Requests are normally free of
charge and are answered without undue delay, within one month. If a complex
request requires an extension of up to two further months, you will be told why
within the first month. If a request cannot be fulfilled, you will receive an
explanation and information about your options to challenge that decision.

For an online leaderboard request, identify the player concerned, for example by
its generated name. Only information reasonably needed to verify your authority
over that player will be requested before disclosing or changing private data.
**Do not email your private player key**; safe verification steps can be arranged
if needed. No real-world identity details are collected solely to identify a
player who otherwise cannot be identified. If a request cannot be matched to an
online player, this will be explained. Local-only data stays on your device;
Thomas does not have a remote copy of your local game library or offline progress.

Privacy correspondence includes your email address, request and any necessary
verification information. It is used to handle the request and document the
response, and kept only for as long as necessary to fulfil and demonstrate the
applicable legal duties or resolve a related complaint.

You may complain to a competent data protection authority, in particular in the
EEA country where you live or work or where an alleged infringement occurred.
In Denmark, you can [complain to Datatilsynet](https://www.datatilsynet.dk/borger/klage/saadan-klager-du).
You can also seek a judicial remedy. Contacting Thomas first may help resolve the
issue, but does not remove your right to complain to an authority.

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
  Separate optional `locationInfo` consent covers nationality sharing.

## Contact

Data controller: **Thomas Julsgaard**.

Privacy questions and rights requests:
[Thomas@Julsgaard.dev](mailto:Thomas@Julsgaard.dev).

Source code: <https://github.com/T-Julsgaard/Chess-Review>
