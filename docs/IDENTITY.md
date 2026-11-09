# Who is "you"?

The review page ("Your accuracy", your mistakes, practice) and the in-page button ("You played
with 91% accuracy") need to know which side of a game the user played. No single source is
reliable forever: site markup changes, people review friends' games, and new installs know
nothing. `lib/identity.js` therefore combines independent layers, resolved per site
(Chess.com and Lichess are learned separately).

| # | Layer | Where it comes from | Survives a markup change? |
|---|-------|---------------------|---------------------------|
| 1 | Signed-in account (live) | Content script reads the page now | No: this is the layer that breaks first |
| 2 | Remembered sign-ins | Every page visit reports the signed-in name (`accountSeen` → `identity:v1`), kept 90 days, up to 5 per site | Yes: keeps working after detection breaks |
| 3 | Game history | The player who recurs across reviewed games (≥3 different opponents and ≥2 games ahead of the next name), from PGN headers only | Yes: uses no page markup at all |
| 4 | Verified bottom player | The bottom player's name block **and** the rendered board's orientation; if both are read they must agree | No |

## Resolution rules

1. A live signed-in account decides: if it is a player, that side is you; if not, it is not your game.
2. Otherwise the most recent remembered sign-in that played the game is you.
3. Otherwise the history player, if they played the game, is you.
4. If layers 2–3 know who you are and you are not in the game, it is **not your game**. The bottom
   player is never borrowed as "you" for a game you didn't play.
5. Only when nothing is known at all, the verified bottom player is you. A page that clearly shows
   you are signed out skips this step: a signed-out visitor is a spectator, and the bottom seat
   is just the site's default view.

The bottom player only counts when the page rendered it. URL hints (`?flip=`, `?username=`,
`/black`) and pasted links describe a perspective, not who is viewing, so they never establish
identity.

## Detection sources

Each site's content script reads its sources in order and reports which one succeeded (`via`):

- **Lichess** (`lichess-content.js`): `<body data-username>`, then the `#user_tag` header button,
  then `<body data-user>`. Bottom player: the `.ruser-bottom` profile link (`/@/name`), then
  Lichess's boot data for the viewer's colour when it matches the rendered orientation.
  Finished games open in the analysis view (`/game/<id>`), which has no bottom player block;
  there the main board's `orientation-white|black` class alone gives the bottom side.
- **Chess.com** (`content.js`): pages marked `<html class="user-logged-out">` are never read
  (signed-in pages carry `user-logged-in`). Otherwise the inline `context = {…}` boot object's
  `user.username` (still the signed-in user on other members' profile pages), then a single
  agreeing `/member/` link in the site navigation (`nav#sidebar-main-menu` today). The fallback
  never reads the board, players, chat, friends list or anything inside `<main>` (profile pages
  have their own `<nav>` of tabs linking to that member), and never accepts the member whose
  profile is open. Board orientation comes from the game board (`.board-layout-chessboard`,
  `#board-single`) before any other board on the page. Bottom player: the
  `.player-bottom` / `.board-layout-bottom` username, ignoring the "Player"/"Opponent" loading
  placeholders.

If a page clearly shows a signed-in user but no name could be read, the content script logs one
console warning naming the function to update. Layers 2 and 3 keep identification working in the
meantime.

## Privacy

Account names stay in `chrome.storage.local`. Share links strip the sender's `perspective`, so a
recipient resolves their own identity.
