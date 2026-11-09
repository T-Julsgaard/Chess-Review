// content.js — runs on chess.com pages. Reads game IDs, public player information,
// orientation for popup/background requests, with move-list text
// as an explicit fallback. Adds extension-owned review controls to post-game UI.

// Load banner: confirms the content script is actually running on this page.
console.log("[Chess Analyzer] content script active on", location.href);

// A plain content script can't import browser-compat.js, so inline the same fallback: Firefox's
// `browser.*` is Promise-native, Chrome's `chrome.*` only gained Promise support under MV3.
const browserAPI = typeof browser !== "undefined" ? browser : chrome;

// KEEP GAME_ID_RE IN SYNC with the canonical copy in chesscom.js (this file runs as a plain content
// script and can't import the module). The type segment is optional and may be any word, so a bare
// /game/<id>, /game/live|daily/<id>, the review URL (/analysis/game/live/<id>/review), and a future
// new type word all resolve. Matching keys on the numeric id everywhere downstream.
const GAME_ID_RE = /\/game\/(?:([a-z][a-z-]*)\/)?(\d{4,})/i;
function parseGameId(path) {
  const m = String(path).match(GAME_ID_RE);
  return m ? { type: (m[1] || "live").toLowerCase(), id: m[2] } : null;
}

// Read explicit URL hints first, then the live board's orientation (also present on
// game links with ?username= but no ?flip=). Null means the board isn't available yet.
function detectFlip() {
  try {
    const v = (new URL(location.href).searchParams.get("flip") || "").trim().toLowerCase();
    if (/^(true|1|yes|on)$/.test(v)) return true;
    if (/^(false|0|no|off)$/.test(v)) return false;
  } catch {}
  return detectBoardFlip();
}

// Best-effort: try to collect SAN moves from the DOM move list if the API
// doesn't have the game yet. Returns a string of move text or null.
// The selectors are heuristic and may change — hence fallback only.
function readMoveListText() {
  const selectors = [
    "[data-ply] .node-highlight-content",
    ".main-line-row .node",
    ".move-list-component .node",
    "wc-simple-move-list .node",
    ".node",
  ];
  for (const sel of selectors) {
    const nodes = document.querySelectorAll(sel);
    if (nodes.length >= 2) {
      const tokens = [];
      nodes.forEach((n) => {
        const t = (n.textContent || "").trim();
        if (t) tokens.push(t);
      });
      if (tokens.length >= 2) return tokens.join(" ");
    }
  }
  return null;
}

// ---- Username detection: find whose perspective the board is shown from (POV).
// The bottom player is always the user's perspective — when you play, you sit at
// the bottom; when you view someone else's game via their profile, the board is
// flipped to them (so they sit at the bottom). Falls back to /member/<user> in
// the URL if the bottom player can't be read.
function cleanUsername(text) {
  if (!text) return null;
  // Remove any trailing rating in parentheses ("name (1500)") and whitespace.
  const t = String(text).replace(/\s*\(\d+\)\s*$/, "").trim();
  if (!t) return null;
  // Filter out obvious non-usernames (anonymous/guests/computer). Chess.com shows "Player" and
  // "Opponent" placeholders in the player blocks until the real names load.
  if (/^(player|opponent|anonymous|guest|computer|stockfish)$/i.test(t)) return null;
  return t;
}
// A malformed %-escape in a link must not abort the whole page read.
function decodePathPart(part) {
  try { return decodeURIComponent(part); } catch { return part; }
}
function usernameFromContainer(root) {
  if (!root) return null;
  // a) Most reliable: a link to the member profile (/member/<user>).
  const link = root.querySelector("a[href*='/member/']");
  const hm = link?.getAttribute("href")?.match(/\/member\/([^/?#]+)/i);
  if (hm) {
    const name = cleanUsername(decodePathPart(hm[1]));
    if (name) return name;
  }
  // b) Otherwise the dedicated username element in the container.
  const el = root.querySelector(
    ".user-username-component, .user-tagline-username, [class*='username']"
  );
  return cleanUsername(el?.textContent);
}
function firstUsernameFrom(selectors) {
  for (const sel of selectors) {
    let root;
    try { root = document.querySelector(sel); } catch { continue; }
    const name = usernameFromContainer(root);
    if (name) return name;
  }
  return null;
}
// Collect every username we can read off the page, ordered best → worst as an archive to search:
//   1) bottom player (POV) — when viewing someone else's game their board sits at the bottom, so
//      this is the player whose public archive most likely holds the game,
//   2) top player (the opponent) — a game lives in BOTH players' archives, so this is a strong
//      second bet (and the one that saves us when the POV read is wrong),
//   3) the /member/<user> profile owner, if we're on a profile page.
// The analysis flow tries each in turn, so a wrong/own stored username no longer blocks the lookup.
function detectUsernames() {
  const names = [];
  const add = (n) => { if (n && !names.some((x) => x.toLowerCase() === n.toLowerCase())) names.push(n); };
  add(firstUsernameFrom([".player-component.player-bottom", ".player-bottom", ".board-layout-bottom", "[class*='player-bottom']"]));
  add(firstUsernameFrom([".player-component.player-top", ".player-top", ".board-layout-top", "[class*='player-top']"]));
  const m = location.pathname.match(/\/member\/([^/?#]+)/i);
  if (m) add(cleanUsername(decodePathPart(m[1])));
  // Fallback: sweep the page for player-tagline username elements. Covers the newer cc-* layouts
  // (e.g. data-test-element="user-tagline-username") where the player containers above aren't
  // present — without it the bypass falls back to your stored handle and can't find an opponent's
  // game. These selectors target player taglines specifically, so they don't pick up chat/nav links.
  document.querySelectorAll("[data-test-element='user-tagline-username'], .user-username-component, [class*='user-username']")
    .forEach((el) => add(cleanUsername(el.textContent)));
  console.log("[Chess Analyzer] detected usernames (best → worst):", names);
  return names;
}
function detectUsername() {
  return detectUsernames()[0] || null;
}

// ---- Identity: who is signed in, and who sits at the bottom -------------------
// Each read is an ordered list of independent sources. The background combines them with
// recorded game history (lib/identity.js), so a Chess.com markup change falls back gracefully.
// KEEP the name rule in sync with accountName() in lib/identity.js.
function cleanAccount(value) {
  const name = cleanUsername(value) || "";
  return /^[\w-]{2,30}$/.test(name) && !/^(white|black)$/i.test(name) ? name : "";
}
function memberFromHref(href) {
  const m = String(href || "").match(/\/member\/([\w-]{2,30})(?:[/?#]|$)/i);
  return m ? cleanAccount(m[1]) : "";
}
// The JSON object literal starting at text[start] === "{", honouring strings and escapes.
function objectLiteralAt(text, start) {
  let depth = 0, inString = false;
  for (let i = start; i < text.length && i - start < 2e6; i++) {
    const c = text[i];
    if (inString) { if (c === "\\") i++; else if (c === '"') inString = false; continue; }
    if (c === '"') inString = true;
    else if (c === "{") depth++;
    else if (c === "}" && --depth === 0) return text.slice(start, i + 1);
  }
  return "";
}
// Source 1: Chess.com's inline `context = {...}` boot object, which carries the signed-in user.
function accountFromContext() {
  for (const script of document.querySelectorAll("script:not([src])")) {
    const text = script.textContent || "";
    const at = text.search(/\bcontext\s*=\s*\{/);
    if (at < 0) continue;
    try {
      const context = JSON.parse(objectLiteralAt(text, text.indexOf("{", at)));
      for (const user of [context?.user, context?.currentUser, context?.me]) {
        const name = cleanAccount(user?.username || user?.login);
        if (name) return name;
      }
    } catch { /* not plain JSON: try the next source */ }
  }
  return "";
}
// Source 2: the site navigation's own profile link. Never the board, players, chat or page
// content (a profile page has its own <nav> of tabs inside <main> linking to that member), never
// the member whose profile is open, and only when every remaining link agrees on one name.
function accountFromNavigation() {
  const names = new Map();
  const pageOwner = memberFromHref(location.pathname).toLowerCase();
  for (const root of document.querySelectorAll("nav, #sb, [class*='nav-component'], [class*='sidebar-nav'], header")) {
    if (root.closest("main, [role='main'], .board-layout-main, .board-layout-player, .player-component, [class*='chat'], [class*='board-layout-sidebar']")) continue;
    for (const link of root.querySelectorAll("a[href*='/member/']")) {
      const name = memberFromHref(link.getAttribute("href"));
      if (name && name.toLowerCase() !== pageOwner && !names.has(name.toLowerCase())) names.set(name.toLowerCase(), name);
    }
  }
  return names.size === 1 ? [...names.values()][0] : "";
}
let accountCache = null;
function detectAccount() {
  if (accountCache && Date.now() - accountCache.at < 5000) return accountCache.value;
  let value = null;
  // Chess.com marks a signed-out page <html class="user-logged-out">: never read a name there.
  if (!document.documentElement.classList.contains("user-logged-out")) {
    for (const [via, read] of [["context", accountFromContext], ["navigation", accountFromNavigation]]) {
      const name = read();
      if (name) { value = {name, via}; break; }
    }
  }
  accountCache = {at:Date.now(), value};
  return value;
}
// true / false when the page clearly shows either state, null when it can't be told.
function detectSignedIn() {
  const classes = document.documentElement.classList;
  if (classes.contains("user-logged-out")) return false;
  if (detectAccount() || classes.contains("user-logged-in")) return true;
  return null;
}
// The player in the bottom seat as shown on the page. The background cross-checks it against
// the board orientation and the PGN players, so a placeholder or wrong read is discarded.
function detectBottomPlayer() {
  return cleanAccount(firstUsernameFrom([".player-component.player-bottom", ".player-bottom", ".board-layout-bottom", "[class*='player-bottom']"]));
}
// Orientation of the board element itself, ignoring URL hints (true = Black at the bottom).
// Prefer the game's main board over any preview board elsewhere on the page.
function detectBoardFlip() {
  const board = document.querySelector(".board-layout-chessboard wc-chess-board, .board-layout-chessboard chess-board, #board-single, #board-play-computer")
    || document.querySelector("wc-chess-board, chess-board");
  return board ? board.classList.contains("flipped") : null;
}
function detectPerspective() {
  const account = detectAccount();
  return {account: account?.name || "", signedIn: detectSignedIn(), bottom: detectBottomPlayer(), boardFlip: detectBoardFlip()};
}
// Report the signed-in account once per page so the extension still knows you if this markup
// changes later. Retried once because the navigation can render after document_idle.
let accountReported = false, accountWarned = false;
function reportAccount() {
  if (accountReported) return;
  accountCache = null;
  const account = detectAccount();
  if (!account) {
    if (detectSignedIn() && !accountWarned) {
      accountWarned = true;
      console.warn("[Chess Review] Chess.com shows a signed-in user but the username couldn't be read — update detectAccount() in content.js. Game history still identifies you.");
    }
    return;
  }
  accountReported = true;
  try { Promise.resolve(browserAPI.runtime.sendMessage({type:"accountSeen", site:"chesscom", name:account.name, via:account.via})).catch(() => {}); } catch {}
}
reportAccount();
setTimeout(reportAccount, 3000);

// ---- Country detection: chess.com tags each player's nationality only as a CSS class on the
// player block, e.g. <div class="cc-country-flag-component country-2 ...">  (country-2 = USA).
// There is no country name or ISO code in the DOM — just that opaque numeric id — so we scrape the
// id and let the analysis page resolve it to a flag (flags.js, built from flag_map.csv). We pair
// each flag element with the username in its own player block, then return a { usernameLower: id }
// map so the flow can attach the right country to white/black after the API tells us who's who.
// If a player has no flag element (country hidden / not set), they simply won't appear here and the
// avatar keeps its username-initial fallback. Lichess exposes no country, so its content script
// never reports any — that side is unchanged.
function countryIdFromClass(el) {
  if (!el) return null;
  // chess.com tags nationality two different ways depending on the surface: a numeric id on
  // archive/history pages (country-2) and an ISO/pseudo CODE on live game pages (country-us,
  // country-dk, country-xe). Accept either — digits OR a 2-3 letter code. The leading (?:^|\s)
  // and trailing (?:\s|$) keep us off the sibling `cc-country-flag-component`/`...-small` tokens
  // (their "country" is hyphen-prefixed, and "flag"/"small" fail the boundary). flags.js resolves
  // whichever token shape we return.
  // getAttribute, not className: an SVG flag's className is an object without match().
  const m = (el.getAttribute("class") || "").match(/(?:^|\s)country-([a-z]{2,3}|\d+)(?:\s|$)/i);
  return m ? m[1] : null;
}
function detectCountries() {
  const out = {}; // usernameLower -> chess.com country id (string)
  // The flag lives inside the same player block as the username (cc-user-block-component /
  // player-tagline). Selector list is ordered current-markup-first, with looser [class*=] entries
  // as fallbacks if chess.com renames a class — same defensive style as the username/button lookups.
  const flags = document.querySelectorAll(
    ".cc-country-flag-component, [class*='cc-country-flag'], [class*='country-flag']"
  );
  flags.forEach((flag) => {
    const id = countryIdFromClass(flag);
    if (!id) return;
    const block = flag.closest(
      ".cc-user-block-component, .player-tagline, .player-component, [class*='user-block'], [class*='player-tagline']"
    ) || flag.parentElement;
    const name = usernameFromContainer(block);
    if (name) out[name.toLowerCase()] = id;
  });
  console.log("[Chess Analyzer] detected countries:", out);
  return out;
}

// ---- Share link: a chess.com URL with #gambit=<base64 PGN+meta>. If we see
// such a fragment, the same analysis opens directly (works on any PC with the add-on).
function b64decode(b64) {
  const bin = atob(b64);
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}
const sharedInFlight = new Set();
async function handleShareFragment() {
  const m = location.hash.match(/[#&]gambit=([^&]+)/);
  if (!m || sharedInFlight.has(m[1])) return;
  const fragment = location.hash;
  sharedInFlight.add(m[1]);
  try {
    const payload = JSON.parse(b64decode(decodeURIComponent(m[1])));
    if (!payload || !payload.pgn) return;
    const result = await browserAPI.runtime.sendMessage({ type: "openShared", payload });
    if (result?.ok && location.hash === fragment) {
      history.replaceState(history.state, "", location.pathname + location.search);
    }
  } catch (e) {
    console.warn("[Chess Review] share link retained; retry by reloading the page", e);
  } finally { sharedInFlight.delete(m[1]); }
}
handleShareFragment();
window.addEventListener("hashchange", handleShareFragment);
setTimeout(handleShareFragment, 1200);

// ---- Inject "Analyze with Chess Review" buttons ----
// Two spots on chess.com use the same button: (1) the game-over modal, and (2) the game-page
// sidebar, each right beneath chess.com's "Game Review" CTA. They share an extension-owned builder;
// only spacing and the insertion point differ. chess.com renders both with Vue (note the
// <!----> v-if anchors) and re-renders them while the tally/coach-speech animate, so a MutationObserver
// re-injects if our button is ever dropped. We never "self-heal" a disabled button (that would run on
// every animation frame and wipe the "Opening review…" cue a frame after a click).
//
// Redundancy: every DOM selector lives in CC below as an ORDERED fallback list — the CURRENT markup is
// first (so today's behaviour is identical), and the looser entries only kick in if chess.com renames
// a class. We anchor on the most durable signal available: the review link's href (locale-proof)
// before its English aria-label or hashed utility classes. And if we detect a game-over / review
// context but can't place the button, we warn once so a future markup change surfaces in the console.
// Whatever happens to the DOM, the toolbar icon and Ctrl+Shift+Y still run the exact same analysis —
// the buttons are only a convenience layer over that.
const FREE_REVIEW_LABEL = "Analyze with Chess Review";

const CC = {
  // Game-over modal.
  modalContainer: [".game-over-modal-shell-buttons", "[class*='modal-shell-buttons']"],
  modalSecondaryRow: [".game-over-secondary-actions-row-component", "[class*='secondary-actions-row']", ".new-game-buttons-component"],
  modalPrimaryCta: ['a[href*="review"]', '[class*="game-over-primary-cta"]', 'a.cc-button-component', 'button.cc-button-component'],
  modalContext: [".game-over-modal-component", "[class*='game-over-modal']"], // "is a game-over modal on screen?"
  // Own games wrap the actions in an emphasis section; profile/archive games place
  // them directly in .sidebar-content. Keep the latter scoped to the sidebar.
  sidebarSections: [".game-review-emphasis-content", "[class*='game-review-emphasis']", ".sidebar-content .game-review-buttons-component", ".sidebar-content [class*='game-review-buttons']"],
  sidebarReviewButtons: [".game-review-buttons-component", "[class*='game-review-buttons']"],
  // Fallback boundaries for capped coach animations and emphasis layouts that
  // do not expose separate review and new-game rows.
  sidebarPanels: [".coach-nudge-game-review-component", ".game-review-emphasis-component"],
  sidebarSecondaryRow: [".new-game-buttons-component"],
  // The Game Review CTA inside the sidebar buttons container. href first: durable + locale-proof.
  sidebarCta: ['a[href*="tab=review"]', 'a[aria-label="Game Review"]', "a.cc-button-component", "button.cc-button-component"],
};

// First element matching any selector in the list (ordered most-specific/most-stable → loosest).
function firstEl(root, selectors) {
  for (const sel of selectors) {
    let el = null;
    try { el = root.querySelector(sel); } catch { /* a bad/unsupported selector → try the next */ }
    if (el) return el;
  }
  return null;
}

// One-shot console warning when an expected injection point can't be found (markup likely changed).
const ccWarned = {};
function warnMarkupChanged(key, what) {
  if (ccWarned[key]) return;
  ccWarned[key] = true;
  console.warn(
    `[Chess Analyzer] ${what} but the in-page button couldn't be placed — chess.com markup may have ` +
    `changed. The toolbar icon and Ctrl+Shift+Y still run the review; update the CC selectors in content.js.`
  );
}

function resetFreeReviewButton(btn, label) {
  btn.disabled = false;
  label.textContent = FREE_REVIEW_LABEL;
  globalThis.ChessReviewButtonPreview?.refresh();
}

function reviewPreviewContext() {
  const parsed = parseGameId(location.pathname);
  return {key:parsed ? 'chesscom:' + parsed.id : null,flip:detectFlip()};
}

// Appearance and placement-specific sizing come from the extension's content-button.css.
// Platform class names are used only for locating insertion points, never for styling our button.
function buildReviewButton(placement, mt = 16, mb = 3) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = `chess-analyzer-free-review chess-analyzer-free-review--${placement}`;
  btn.style.setProperty("--chess-review-margin-top", `${mt}px`);
  btn.style.setProperty("--chess-review-margin-bottom", `${mb}px`);
  // Logo is an extension file → loaded via browserAPI.runtime.getURL (listed in web_accessible_resources).
  const logoUrl = browserAPI.runtime.getURL("icons/icon.png");
  const logo = document.createElement("img");
  logo.className = "chess-analyzer-free-review-logo";
  logo.src = logoUrl;
  logo.alt = "";
  const mark = document.createElement("span");
  mark.className = "chess-analyzer-free-review-mark";
  mark.setAttribute("aria-hidden", "true");
  mark.append(logo);
  const label = document.createElement("span");
  label.className = "chess-analyzer-free-review-label";
  label.textContent = FREE_REVIEW_LABEL;
  btn.append(mark, label);
  globalThis.ChessReviewButtonPreview?.register(btn,label,reviewPreviewContext,browserAPI);

  btn.addEventListener("click", (event) => {
    event.stopPropagation();
    btn.disabled = true;
    // Stay busy until the bounded background operation settles.
    label.textContent = "Opening review…";
    try {
      // After an extension reload the old content script loses its context — sendMessage throws
      // (Chrome) or rejects (Firefox), depending on when the context is invalidated.
      browserAPI.runtime.sendMessage({ type: "freeGameReview", gameKey: location.origin + location.pathname + location.search }).then((result) => {
        if (result?.ok) resetFreeReviewButton(btn, label);
        else {btn.disabled = false; label.textContent = "Couldn't open review — retry";}
      }).catch(() => {
        btn.disabled = false;
        label.textContent = "Reload the page ↻";
      }).finally(() => globalThis.ChessReviewButtonPreview?.refresh());
    } catch (e) {
      btn.disabled = false;
      label.textContent = "Reload the page ↻";
      // An existing content script is detached when the extension is reloaded. It cannot
      // reconnect itself; the tab must load once more to receive the new script.
      console.info("[Chess Analyzer] The extension was updated. Reload this tab to reconnect the review button.");
      globalThis.ChessReviewButtonPreview?.refresh();
    }
  });
  return btn;
}

// (1) Game-over modal: beneath "Game Review", above the New/Rematch row.
function fitModalReviewButton(btn, buttonsContainer) {
  const primary = firstEl(buttonsContainer, CC.modalPrimaryCta);
  // Measure layout only; our appearance stays defined by the extension stylesheet.
  // offsetWidth avoids measuring an entrance animation's transformed scale.
  if (primary && primary.offsetWidth > 0) {
    const width = `${primary.offsetWidth}px`;
    if (btn.style.getPropertyValue("--chess-review-modal-width") !== width) {
      btn.style.setProperty("--chess-review-modal-width", width);
    }
  }
  if (!primary?.offsetHeight || !btn.offsetHeight || !btn.offsetWidth) return;
  const rect = btn.getBoundingClientRect(), scale = rect.width / btn.offsetWidth;
  if (!(scale > 0)) return;
  const style = getComputedStyle(btn), top = parseFloat(style.marginTop) || 0, bottom = parseFloat(style.marginBottom) || 0;
  // Chess.com sometimes adds its own flex gap or action margins. Count those
  // toward the 16px separation rather than stacking another full margin on top.
  // Undo the modal's entrance scale before comparing visual layout distances.
  const topMargin = Math.max(0,16 - ((rect.top - primary.getBoundingClientRect().bottom) / scale - top));
  const secondary = firstEl(buttonsContainer,CC.modalSecondaryRow);
  const nextAction = secondary && ([...secondary.querySelectorAll('button,a[href]')].find(action => action.offsetHeight) || secondary);
  const bottomMargin = nextAction?.offsetHeight
    ? Math.max(0,16 - ((nextAction.getBoundingClientRect().top - rect.bottom) / scale - bottom)) : bottom;
  if (Math.abs(topMargin - top) > .25) btn.style.setProperty('--chess-review-margin-top',topMargin.toFixed(2) + 'px');
  if (Math.abs(bottomMargin - bottom) > .25) btn.style.setProperty('--chess-review-margin-bottom',bottomMargin.toFixed(2) + 'px');
}

function injectModalReviewButton(buttonsContainer) {
  let btn = buttonsContainer.querySelector(".chess-analyzer-free-review");
  // Match sidebar spacing below the native Game Review action.
  const fresh = !btn;
  btn ||= buildReviewButton("modal", 16, 16);
  const secondaryRow = firstEl(buttonsContainer, CC.modalSecondaryRow);
  // Use the secondary row's actual parent: some modal versions nest the actions.
  // Recheck placement after Vue updates without rebuilding a busy control.
  if (secondaryRow) {
    if (secondaryRow.previousElementSibling !== btn) secondaryRow.before(btn);
  } else if (btn.parentElement !== buttonsContainer) buttonsContainer.appendChild(btn);
  fitModalReviewButton(btn, buttonsContainer);
  if (fresh) console.log("[Chess Analyzer] injected review button (modal)");
}

// (2) Game-page sidebar. Keep Chess.com's action row intact: its layout and Vue
// updates expect only native actions there. Use an extension-owned sibling in
// the review/rematch gap; capped coach layouts retain the outside-panel fallback.
const sidebarReviews = new Map();
function injectSidebarReviewButton(section) {
  const reviewBtns = section.matches(CC.sidebarReviewButtons.join(",")) ? section : firstEl(section, CC.sidebarReviewButtons);
  if (!reviewBtns) return;
  const cta = firstEl(reviewBtns, CC.sidebarCta);
  if (!cta) return;
  let entry = sidebarReviews.get(reviewBtns);
  if (!entry) {
    const host = document.createElement("div");
    host.className = "chess-analyzer-review-slot";
    const btn = buildReviewButton("sidebar", 16, 8);
    host.append(btn);
    entry = { host, btn };
    sidebarReviews.set(reviewBtns, entry);
  }
  const { host, btn } = entry;
  // Reuse the same control if Vue replaces the CTA or drops our sibling. In
  // particular, do not reset an in-flight review when the coach/tally animates.
  // Chess.com's completed-game emphasis contains review + new-game as separate
  // siblings. Insert in their gap, rather than after the whole emphasis panel.
  // Keep the outside-panel fallback for capped coach animations and older layouts.
  const next = reviewBtns.nextElementSibling === host ? host.nextElementSibling : reviewBtns.nextElementSibling;
  const betweenActions = next?.matches(CC.sidebarSecondaryRow.join(","))
    && !reviewBtns.closest('.coach-nudge-game-review-component');
  const anchor = betweenActions ? reviewBtns : reviewBtns.closest(CC.sidebarPanels.join(",")) || reviewBtns;
  if (anchor.nextElementSibling !== host) anchor.after(host);
  if (btn.parentElement !== host) host.append(btn);
  if (cta.offsetWidth > 0) {
    const width = `${cta.offsetWidth}px`;
    if (btn.style.getPropertyValue("--chess-review-sidebar-width") !== width) {
      btn.style.setProperty("--chess-review-sidebar-width", width);
    }
  }
  let hidden = false;
  for (let node = cta; node; node = node.parentElement) {
    const style = getComputedStyle(node);
    if (node.hidden || style.display === "none" || style.visibility === "hidden"
      || style.maxHeight === "0px" && [style.overflowY, style.overflow].some(value => value === "hidden" || value === "clip")) { hidden = true; break; }
  }
  if (host.hidden !== hidden) host.hidden = hidden;
  return reviewBtns;
}

(function watchForReviewSpots() {
  let modalTimer = null, sidebarTimer = null;
  let modalRoot = null, sidebarRoots = [], scheduled = false;
  const tryInject = () => {
    // (1) Modal.
    const modal = firstEl(document, CC.modalContainer);
    modalRoot = modal;
    if (modal) {
      injectModalReviewButton(modal);
    } else if (firstEl(document, CC.modalContext) && !modalTimer) {
      // A game-over modal is on screen but its button row wasn't found — recheck shortly, then warn.
      modalTimer = setTimeout(() => {
        modalTimer = null;
        if (firstEl(document, CC.modalContext) && !firstEl(document, CC.modalContainer)) {
          warnMarkupChanged("modal", "a game-over modal was detected");
        }
      }, 4000);
    }
    // (2) Sidebar. The review section only renders post-game, so if it's present but our button still
    // isn't there a few seconds later, an inner selector (review-buttons / CTA) likely changed.
    sidebarRoots = [...document.querySelectorAll(CC.sidebarSections.join(","))];
    const activeRows = new Set();
    for (const section of sidebarRoots) {
      const row = injectSidebarReviewButton(section);
      if (row) activeRows.add(row);
      if (!row && !sidebarTimer) {
        sidebarTimer = setTimeout(() => {
          sidebarTimer = null;
          const current = firstEl(document, CC.sidebarSections);
          const row = current?.matches(CC.sidebarReviewButtons.join(",")) ? current : current && firstEl(current, CC.sidebarReviewButtons);
          if (current && !sidebarReviews.has(row)) {
            warnMarkupChanged("sidebar", "the game-review sidebar was detected");
          }
        }, 6000);
      }
    }
    for (const [row, { host }] of sidebarReviews) {
      if (!activeRows.has(row)) {
        host.remove();
        sidebarReviews.delete(row);
      }
    }
    globalThis.ChessReviewButtonPreview?.refresh();
  };
  const relevantSelector = [...CC.modalContainer, ...CC.modalContext, ...CC.sidebarSections, ...CC.sidebarSecondaryRow].join(",");
  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    const run = () => { scheduled = false; tryInject(); };
    // Hidden pages may suspend animation frames; retain post-game recovery there.
    if (document.hidden || typeof requestAnimationFrame !== "function") setTimeout(run, 32);
    else requestAnimationFrame(run);
  };
  const observer = new MutationObserver(records => {
    if (modalRoot && !modalRoot.isConnected || sidebarRoots.some(root => !root.isConnected)) { schedule(); return; }
    for (const record of records) {
      if (record.target.matches?.(".chess-analyzer-review-slot") && record.removedNodes.length) { schedule(); return; }
      if (record.target.closest?.(".chess-analyzer-free-review, .chess-analyzer-review-slot")) continue;
      if (modalRoot?.contains(record.target) || sidebarRoots.some(root => root.contains(record.target)
          || record.type === "attributes" && record.target.contains(root))
        || [...record.removedNodes].some(node => node.nodeType === 1 && node.matches(".chess-analyzer-review-slot"))
        || [...record.addedNodes].some(node => node.nodeType === 1
          && (node.matches(relevantSelector) || node.querySelector(relevantSelector)))) { schedule(); return; }
    }
  });
  observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class", "style", "hidden"] });
  window.addEventListener("resize", tryInject);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) tryInject(); });
  tryInject();
})();

browserAPI.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg && msg.type === "getGameInfo") {
    const parsed = parseGameId(location.pathname);
    sendResponse({
      ok: true,
      url: location.href,
      gameId: parsed?.id || null,
      gameType: parsed?.type || null,
      username: detectUsername(), // POV/bottom player (or null) — kept for back-compat
      usernames: detectUsernames(), // every readable player, best → worst archive to search
      countries: detectCountries(), // { usernameLower: countryId } scraped from the player flags
      flip: detectFlip(),         // explicit URL hint or displayed board (true=Black at bottom)
      perspective: detectPerspective(), // signed-in account + bottom player, for identity
      moveListText: parsed ? null : null, // only filled on explicit fallback below
    });
    return true;
  }
  if (msg && msg.type === "getDomMoves") {
    sendResponse({ ok: true, moveListText: readMoveListText() });
    return true;
  }
});
