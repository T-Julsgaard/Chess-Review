# Puzzle leaderboards

The extension includes three matching leaderboard screens. The Cloudflare service
is **disabled by default** and no production address or credentials are included.
Before opting in, each screen offers the participation notice. After opt-in,
an unconfigured service shows that online rankings are not connected. Ordinary
practice, filters, personal bests, and statistics continue to work offline.

Developer debugger includes **Import leaderboard CSV** and **Clear test data**.
It also includes **Load sample rankings**, a puzzle-mode selector, and a preview
state selector. Choose a mode and state, then **Show preview** to open it directly.
Available states include Coming soon, Loading, Empty, Score saved, Score syncing,
Opted out, Choose nationality,
Sync needs attention, Offline with saved rankings, Rankings unavailable,
rate-limit/capacity errors, a rejected player key, and the
disconnected/connecting/connected/deletion account screens. Imported CSV data can
be used with these states; sample rankings are generated on demand if none is loaded.
**Simulate solve**, **Start sync**, **Finish sync**, **Fail sync**, and **Retry sync**
exercise the same personal-score UI. The sync indicator is the **Syncing…** text
beside Your total/Your best; it changes to **Saved** or **Sync needs attention**.
Account controls in these previews simulate connecting, disconnecting and deleting
records. The ranked-play button previews its interaction without starting a run.
All previews stay in memory and do not alter real player keys, scores or progress.
CSV columns are `mode,player,solved,is_you,country`; `is_you` is optional (0/1),
as is `country` (a Chess.com token such as `dk`, `2`, or `xe`). Older CSVs still work.
Modes are `solve-puzzle`, `timeAttack` and `knockout`. Imports replace only the
current tab's in-memory leaderboard preview. They are never saved or uploaded,
and disappear on Clear or page reload. Preview mode shows **Test data** and blocks
leaderboard requests. Account/play controls only appear in the simulated account
states and cannot contact the service. No sample CSV is
bundled with the extension. Normal puzzle progress remains separate.

## Scoring and privacy

Joining summaries use the Chess Review brand. Both the opt-in panel and General
settings provide a direct **Privacy policy & operator details** link before
consent. This opens the bundled `PRIVACY.md`, which names Thomas Julsgaard as the
controller near its beginning and gives the privacy contact, legal bases, rights,
response times and the complaint route. This notice update does not add an export
endpoint or verify a live Cloudflare processing agreement.
General settings also shows the controller's name and email under **About your data**.

Public participation and optional nationality rely on consent (Article 6(1)(a)).
Limited service-security processing relies separately on legitimate interests
(Article 6(1)(f)). For the current implementation, the interest is preventing
automated abuse and preserving availability for users. Per-IP rate limits and
per-player work counters are necessary because client-side restrictions can be
bypassed. The balance is limited by daily rotating keyed IP digests, bounded
counters, no Worker request logging and no cross-site tracking. These controls
do not authorise continued publication after withdrawal, and users can object
through the privacy contact. Reassess this balance before adding persistent logs,
profiling or new purposes, and account for children's interests where applicable.

Leaderboards are off by default, including for legacy player keys. The opt-in
panel replaces rankings and pagination and explains the public generated name,
scores and Cloudflare hosting. Enabling its switch opens a second step with a
nationality selector with no preselected choice. Choose a country or **Don’t show
nationality** before **Join leaderboard** saves consent.
The versioned choice and acceptance time live in `leaderboardPreferences:v1`.
The client independently gates reads (including cached pages), connection,
ranked sessions and queued uploads. No historical offline results are submitted.

**Settings → General → Leaderboard** manages participation, nationality and
deletion. Opting out immediately cancels requests, stops ranked participation and
discards pending proofs, then deletes the online player and all score/profile
records. The **Opt out & delete data** button asks for
confirmation and performs the same withdrawal/deletion. Failed deletion leaves
the extension opted out with a pending notice and the key retained for retry;
settings offers a retry and reopening learning also retries. Rejoining is blocked
until deletion succeeds. Removing local extension storage alone cannot erase
online records. Public caches can take up to one minute to expire.

Choosing **Don’t show nationality** sends an authenticated `country: null` update,
which removes only the online flag. Failed removal remains pending with a retry
in settings. Privacy removal requests remain available while participation is off.
Opt-out changes in another extension tab cancel current requests and hide rankings.

Country flags use the bundled flag pack. Players choose their own nationality
from the same country-code table, including England, Scotland and Wales. The
selection is saved locally and synced for the connected leaderboard key. Local
game history, detected usernames and Chess.com profile countries are never used
for leaderboard nationality. Legacy inferred sharing defaults to hidden, with
online flag removal pending until the service can be reached. Public names remain
generated `Knight-…` names. This is a self-selected display flag. Missing or unsupported countries
show a neutral player icon. Hover or keyboard focus on a flag shows the country name.
Apply migration `0003_player_countries.sql` before deploying the updated Worker.
Country records are deleted with the player; public caches may take time to update.

Players explicitly choose **Play ranked** after verifying once on the service's
`/join` page and connecting a private player key. Names are generated (for example
`Knight-0123456789`); no email, chess account, or user-supplied names are collected.
Public names have a maximum of 25 ASCII characters: letters, digits, internal
spaces, hyphens and underscores, beginning and ending with a letter or digit.
Names remain server-assigned; local edits cannot rename an online player. The
API rejects submitted name changes. Migration `0004_player_names.sql` repairs
invalid imported names and enforces the rule on database inserts and updates.
Links, markup and control/hidden characters are not permitted in public names;
the UI also renders names as text rather than HTML or clickable links.
The key is stored in extension local storage, never sync storage. It is a personal
bearer credential: anyone holding it can play or delete that player's records.
The service stores only its SHA-256 hash. Save it privately if you want to use the
same player in another browser; clearing extension data loses access otherwise.
Firefox requests optional authentication and puzzle-interaction permission when
joining/connecting, and separate location permission for nationality sharing.
It checks permissions before authenticated requests.

- Solve a puzzle: distinct verified puzzles solved in ranked practice, counted once
  per player, across sessions. Hints, reveals, skips and retries end ranked scoring.
- Time attack: the highest verified count within 180 seconds, with three lives.
- Knockout: the highest verified count before the first wrong move.

Ranked puzzles are assigned by the service, using the existing increasing run
rating curves. Filters apply to offline practice; they do not apply to ranked play.
The service reconstructs opponent replies and verifies complete submitted player
move sequences, including legal alternative checkmates. It increments scores
itself. Historical offline totals are never uploaded or accepted as evidence.
Only completed attempts are sent, so network arrival must precede the server's
deadline. Setup and the countdown happen before a separate, idempotent ready
request starts the server clock. Later puzzle transitions and network time count
toward the three minutes. The visible clock is synchronized at readiness.

Time attack and Knockout verify each attempt, so a partial run can set a record.
Ranked practice receives up to five server-assigned puzzles at once. Their move
proofs are saved in extension local storage and submitted after five solves or
60 seconds, or when leaving practice/opening rankings. The server verifies the
assigned order and every solution; unique-solve constraints still prevent repeat
credit. Partial batches can be acknowledged without abandoning unused puzzles.
An opaque batch ID, monotonic revision, compare-and-swap update, and saved response
make a lost-response retry idempotent. The assignment expires after seven days.
The queue resumes on reopening Learn; it does not depend on a tab-close event.
Cross-tab queue updates use the browser's Web Locks API where available.

Boards show ten players per page and load only on opening, paging or Refresh;
there is no polling. Public pages are cached locally for 60 seconds and at the
edge for 30 seconds. Duplicate reads share a request; manual refresh has a
10-second minimum interval per cached page. Personal totals/bests appear
separately and immediately, with **Syncing** for unsent practice proofs. Global
positions come from the shared snapshot, never an invented local rank. Ties use
the first time the score was achieved, then player ID. Pagination shows at most
the top 1,000 players. A connection failure stops further ranked scoring; verified
earlier scores remain saved. Offline play is still available.

Only puzzle moves, session identifiers, the known country token and the player key
travel in authenticated requests. Games, PGNs, website history, settings and local
learning progress do not.
The service retains generated names, token hashes, unique solve IDs, records, and
one short-lived session per player. Move transcripts are checked in memory and
not retained; only a digest and the previous response are stored for safe retry.
Players can disconnect locally or delete their online player and records in
**Player settings**. Cached public records can remain visible for up to 30 seconds.
Cloudflare still processes IP addresses and normal network information. Worker
request logging is disabled; do not enable logging of headers or request bodies.

## Deployment

Deployment publishes a new service; these instructions do not run automatically.
For this project, use a dedicated Cloudflare account on **Workers Free**, which
provides D1's Free allowances, plus **Turnstile Free**. Exhausted quotas should stop the service; do
not upgrade to paid usage to keep it running. A website's Cloudflare Free plan is
separate from the Workers subscription: check **Workers & Pages → Plans** and
the account's Billing subscriptions before deployment. Workers Free requires no
credit card; leave this dedicated account without a payment method and do not
activate paid trials or add-ons.
Use the included `workers.dev` address; no purchased domain is needed.

There is no Wrangler or extension setting that locks an account to Workers Free.
The application limits, cache, and `ENABLED=false` switch do not impose a billing
cap: requests reach Cloudflare before application code runs. If the account is
changed to Workers Paid later, spam can generate charges even for rejected or
disabled-service requests. Alerts and CPU limits do not make a paid deployment
zero-cost. Do not enable paid services such as R2, AI APIs or paid logging for this
leaderboard. The current service uses Workers, D1 and Turnstile only.

With these Free plans, an attacker can temporarily exhaust the allowance and
interrupt leaderboards. The free quota is the cost boundary, not the in-app rate
limiter. This policy depends on keeping those account plans unchanged; review
Cloudflare's current terms and account subscriptions before enabling the service.
No Cloudflare
API token, Turnstile secret, account credential or player key belongs in Git or
the extension. Public Worker addresses, database IDs and Turnstile site keys are
not secrets. The service directory is excluded from both extension packages.

1. Install/use Wrangler 4.36 or newer. Authenticate locally with `wrangler login`.
   From `services/leaderboard`, create D1 with
   `npx wrangler d1 create chess-review-leaderboard`. Put the returned database ID
   in `wrangler.toml`, keeping `ENABLED = "false"` initially.
2. Run `npx wrangler d1 migrations apply chess-review-leaderboard --remote`.
   From the repository root run `node services/leaderboard/export-puzzles.mjs`.
   Import **every** generated `scratch/leaderboard/puzzles-*.sql` file with
   `npx wrangler d1 execute chess-review-leaderboard --remote --file <absolute-file>`
   from the service directory. Keep the same puzzle catalog as the extension.
   If the initial catalog import exhausts the Free write quota, resume after the
   daily reset instead of upgrading the account to finish it sooner.
3. Deploy the disabled Worker with `npx wrangler deploy` to obtain its HTTPS
   hostname. Create a managed Turnstile widget restricted to exactly that hostname.
   Set the public `TURNSTILE_SITE_KEY` and `TURNSTILE_HOSTNAME` variables in TOML.
4. Set **Worker secrets** with `npx wrangler secret put TURNSTILE_SECRET_KEY` and
   `npx wrangler secret put IP_HASH_KEY`. Use a new random 32-byte value for the
   latter, for example generated by a password manager. Do not place either value
   on command lines, in TOML, screenshots or source files. Local `.dev.vars` and
   `.wrangler` files are ignored, but still keep them private.
5. Set `ENABLED = "true"`, redeploy, and exercise `/join`, connection, all three
   modes, concurrent/replayed attempts, expiry, deletion and service outages on
   staging first. Verify the D1 catalog count, usage and query plans. The local
   security tests use real SQLite, but do not replace Cloudflare staging checks.
6. Set only the public HTTPS origin in
   `lib/learning/leaderboard-config.js`, without a path or trailing slash.
   `npm run build` adds host access for that exact origin to Chrome and Firefox
   packages. If loading an unpacked source checkout, also add that exact origin
   plus `/*` to `manifest.json` host permissions. HTTP-served source builds work
   through the same CORS API. No extension-origin string or embedded API key is
   treated as authentication.
7. Update Chrome/Firefox store privacy disclosures for optional online player
   authentication and public puzzle scores before shipping the enabled build.

The normal source-snapshot build includes service source for reproducibility;
the installable browser ZIPs contain only extension files. Never put private
deployment files in `lib/`, `data/`, `docs/`, `scripts/` or `tests/`, which are copied
by the packager. Inspect build contents before distributing them.

## Abuse limits and operational controls

The service fails closed when disabled, missing required bindings/secrets, or at
capacity. It enforces bounded JSON bodies (including streamed bodies), validated
routes/pages/moves, bearer authentication, server-assigned puzzles, server timing,
one active timed session and one practice batch per player, monotonic revisions, atomic score updates and
idempotent last-attempt replay. SQL values are bound parameters. Remote names are
rendered as text. There is no public admin endpoint or arbitrary score endpoint.
Enrollment uses server-side Turnstile verification with hostname/action checks.

Rate-limit bindings cap reads (120/min/IP), writes (300/min/IP, 120/min/player),
enrollment (10/min/IP), ranked starts (20/min/player), and burst traffic (3,000/min
per Cloudflare location). Shared IPs have more room than individual players.
The IP limiter key is a keyed digest rotated daily and is not stored in D1.
The old 100-signups/day, 5,000-players, 100,000-lifetime-solves and
5,000-mutations/day caps are removed by migration 0002. Do not skip that migration.
Authenticated mutations also have a 2,500-request/player/day allowance, including
failed proofs and requests that do not change a score. Deletion is exempt.
SQL-enforced daily work budgets allow 10,000 estimated write units per player
and 80,000 across the service. Costs vary by operation and batch size; these are
**conservative work estimates, not measured D1 row-write counts or billing caps**.
Profile changes share this budget instead of a separate signup-scale ceiling.
Actual free allowance exhaustion can still happen first; measure D1 usage before
changing budgets. A daily-capacity response sets Retry-After to midnight UTC.
Client errors back off, respect Retry-After, retain cached rankings and keep
pending proofs for retry; invalid/conflicting proofs require user action rather
than endlessly retrying. Disconnect pauses sync; reconnecting the same player
retains the queue. Deleting the player clears it. CSV preview blocks queue sync.
Timed sessions cap at 1,000 puzzles and expire after six hours (three minutes for
Time attack). Scheduled cleanup removes expired sessions/batches and old daily budget rows. Deletion
remains available after application capacity is reached, unless Cloudflare itself
has exhausted the account allowance. There is no periodic deletion of unique
solve records, since that would allow repeat puzzle credit.

Daily request/read/write allowance exhaustion normally recovers after midnight
UTC, provided traffic has fallen. Reads, new accounts and ranked submissions may
all fail during that outage; existing local progress remains available. A full
storage allowance is different: it needs cleanup and does not reset overnight.
A continuing attack can exhaust the next day's allowance again. Free-plan usage
does not silently upgrade this service to paid usage.

**No public service is spam-proof or bot-proof.** Cloudflare binding limits are
approximate and per location, so distributed traffic can still exhaust Workers
requests or D1 reads. Turnstile reduces automated signups; it is not identity
verification. Attackers can solve challenges, create multiple players, use chess
engines or copy the public puzzle solutions. Server verification prevents invented
counts, repeated credit and forged client timestamps; it cannot prove human play.
Do not market these rankings as cheat-proof or use them for valuable prizes.

Monitor aggregate Cloudflare usage without logging credentials. `ENABLED=false`
is the application off switch. This project does not require a purchased domain
or paid WAF/rate-limit products; keep the included Workers bindings and Turnstile.
Worker-level limits run after a request has already reached the Worker, so they
cannot guarantee availability under a sustained flood. Free-plan exhaustion is a
service outage; on a paid plan the platform can bill additional usage. No promise
of zero costs applies to a paid account. Do not rely on CORS, an extension ID,
obfuscation or a shared secret shipped to clients to stop abuse.

References: [Workers rate-limit accuracy](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/),
[Turnstile verification](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/),
[Workers limits](https://developers.cloudflare.com/workers/platform/limits/),
[Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/),
[D1 pricing and free-limit behavior](https://developers.cloudflare.com/d1/platform/pricing/),
[Turnstile Free plan](https://developers.cloudflare.com/turnstile/plans/),
[Workers Free signup requires no credit card](https://www.cloudflare.com/products/workers/),
[Budget alerts are informational](https://developers.cloudflare.com/billing/manage/budget-alerts/),
[D1 free-limit enforcement](https://developers.cloudflare.com/changelog/post/2026-09-01-d1-free-tier-limit-enforcement/),
[Firefox consent](https://extensionworkshop.com/documentation/develop/firefox-builtin-data-consent/).
