# Puzzle leaderboards

The extension includes three matching leaderboard screens. The Cloudflare service
is **disabled by default** and no production address or credentials are included.
Until deployed, each screen says that online rankings are not connected. Ordinary
practice, filters, personal bests, and statistics continue to work offline.

Developer debugger includes **Import leaderboard CSV** and **Clear test data**.
CSV columns are `mode,player,solved,is_you`; `is_you` is optional (0/1).
Modes are `solve-puzzle`, `timeAttack` and `knockout`. Imports replace only the
current tab's in-memory leaderboard preview. They are never saved or uploaded,
and disappear on Clear or page reload. Preview mode shows **Test data**, hides
online account/play controls and blocks leaderboard requests. No sample CSV is
bundled with the extension. Normal puzzle progress remains separate.

## Scoring and privacy

Players explicitly choose **Play ranked** after verifying once on the service's
`/join` page and connecting a private player key. Names are generated (for example
`Knight-0123456789`); no email, chess account, or user-supplied names are collected.
The key is stored in extension local storage, never sync storage. It is a personal
bearer credential: anyone holding it can play or delete that player's records.
The service stores only its SHA-256 hash. Save it privately if you want to use the
same player in another browser; clearing extension data loses access otherwise.
Firefox requests optional authentication and puzzle-interaction consent when connecting and checks
that consent before each authenticated request.

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

Verified scores update after each puzzle (so a partial run can set a record).
Boards show ten players per page and refresh every 30 seconds while open, with
30-second edge caching. Updates may take up to about a minute to appear. Ties use
the first time the score was achieved, then player ID. Pagination shows at most
the top 1,000 players. A connection failure stops further ranked scoring; verified
earlier scores remain saved. Offline play is still available.

Only puzzle moves, session identifiers and the player key travel in authenticated
requests. Games, PGNs, website history, settings and local learning progress do not.
The service retains generated names, token hashes, unique solve IDs, records, and
one short-lived session per player. Move transcripts are checked in memory and
not retained; only a digest and the previous response are stored for safe retry.
Players can disconnect locally or delete their online player and records in
**Player settings**. Cached public records can remain visible for up to 30 seconds.
Cloudflare still processes IP addresses and normal network information. Worker
request logging is disabled; do not enable logging of headers or request bodies.

## Deployment

Deployment publishes a new service; these instructions do not run automatically.
Use a dedicated Cloudflare account/project on the **Workers Free** plan if the
service must stop at free limits rather than incur usage charges. No Cloudflare
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
one active session per player, monotonic revisions, atomic score updates and
idempotent last-attempt replay. SQL values are bound parameters. Remote names are
rendered as text. There is no public admin endpoint or arbitrary score endpoint.
Enrollment uses server-side Turnstile verification with hostname/action checks.

Rate-limit bindings cap reads (30/min/IP), writes (100/min/IP and per player), enrollment
(3/min/IP), and overall traffic (800/min). The IP limiter key is a keyed digest
rotated daily and is not stored in D1. SQL-enforced budgets allow at most 100
enrollments and 5,000 session mutations per UTC day. These are **operation counts,
not Cloudflare row-write accounting**; a mutation writes multiple indexed rows.
Storage caps are 5,000 players and 100,000 distinct practice solves. Sessions cap
at 1,000 puzzles and expire after six hours (three minutes for Time attack).
Scheduled cleanup removes expired sessions and old daily budget rows. Deletion
remains available after application capacity is reached, unless Cloudflare itself
has exhausted the account allowance. Raise caps only after checking storage/usage.

**No public service is spam-proof or bot-proof.** Cloudflare binding limits are
approximate and per location, so distributed traffic can still exhaust Workers
requests or D1 reads. Turnstile reduces automated signups; it is not identity
verification. Attackers can solve challenges, create multiple players, use chess
engines or copy the public puzzle solutions. Server verification prevents invented
counts, repeated credit and forged client timestamps; it cannot prove human play.
Do not market these rankings as cheat-proof or use them for valuable prizes.

Monitor aggregate Cloudflare usage without logging credentials. `ENABLED=false`
is the emergency off switch. A dedicated custom domain with edge WAF/rate-limit
rules can reject traffic before it reaches the Worker; plan availability varies.
Worker-level limits run after a request has already reached the Worker, so they
cannot guarantee availability under a sustained flood. Free-plan exhaustion is a
service outage; on a paid plan the platform can bill additional usage. No promise
of zero costs applies to a paid account. Do not rely on CORS, an extension ID,
obfuscation or a shared secret shipped to clients to stop abuse.

References: [Workers rate-limit accuracy](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/),
[Turnstile verification](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/),
[Workers limits](https://developers.cloudflare.com/workers/platform/limits/),
[D1 free-limit enforcement](https://developers.cloudflare.com/changelog/post/2026-09-01-d1-free-tier-limit-enforcement/),
[Firefox consent](https://extensionworkshop.com/documentation/develop/firefox-builtin-data-consent/).
