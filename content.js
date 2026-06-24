// content.js — runs on chess.com pages. Kept deliberately minimal and robust:
// reads the game ID from the current URL and responds to popup/background.
// (Does NOT read the board/canvas itself — only the URL and optionally the
// text move list as a fallback.)

// Load banner: confirms the content script is actually running on this page.
console.log("[Chess Analyzer] content script active on", location.href);

// KEEP GAME_ID_RE IN SYNC with the canonical copy in chesscom.js (this file runs as a plain content
// script and can't import the module). The type segment is optional and may be any word, so a bare
// /game/<id>, /game/live|daily/<id>, the review URL (/analysis/game/live/<id>/review), and a future
// new type word all resolve. Matching keys on the numeric id everywhere downstream.
const GAME_ID_RE = /\/game\/(?:([a-z][a-z-]*)\/)?(\d{4,})/i;
function parseGameId(path) {
  const m = String(path).match(GAME_ID_RE);
  return m ? { type: (m[1] || "live").toLowerCase(), id: m[2] } : null;
}

// chess.com's review/analysis URL adds ?flip=true when the board is shown from BLACK's side — i.e.
// when YOU played Black and it sat at the bottom. That's the most reliable read of the user's own
// perspective, so we surface it to the analysis page. Tri-state: true (flip) / false (explicit
// white) / null (no hint — defer to the username match, which defaults to White at the bottom).
// Accepts a few spellings so a slightly different link (flip=1, flip=yes…) still works.
function detectFlip() {
  try {
    const v = (new URL(location.href).searchParams.get("flip") || "").trim().toLowerCase();
    if (/^(true|1|yes|on)$/.test(v)) return true;
    if (/^(false|0|no|off)$/.test(v)) return false;
  } catch {}
  return null;
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

// ---- Theme detection: read which piece set and board theme the user has on
// chess.com, directly from the DOM. We store NOTHING — we just read the CDN URL
// that chess.com already uses to show the pieces, so the analysis page can fetch
// the same images on demand (and fall back to its own set if none is found).
function bgUrl(elem, pseudo = null) {
  if (!elem) return null;
  const bg = getComputedStyle(elem, pseudo).backgroundImage;
  const m = bg && bg.match(/url\(["']?(.*?)["']?\)/);
  return m ? m[1] : null;
}
function detectChessComTheme() {
  // We read ONLY the theme NAMES (e.g. "neo", "green") so the analysis page can match the look
  // with its own bundled pieces and board colours. We deliberately do NOT capture or send
  // chess.com's piece/board image URLs — that artwork is proprietary and is never fetched.
  const out = { pieceSet: null, boardTheme: null };
  // Pieces: each piece is an element with a background-image from
  // .../chess-themes/pieces/<set>/<size>/<code>.png  (code = e.g. wp, bn). We keep only <set>.
  const pieceEl = document.querySelector(".piece, [class*='piece-'], piece");
  const pUrl = bgUrl(pieceEl);
  if (pUrl) {
    const m = pUrl.match(/\/pieces\/([^/]+)\/(\d+)\/([a-z]{2})\.(png|gif|svg|webp)/i);
    if (m) out.pieceSet = m[1];
  }
  // Board: derive only the theme name from the board image path (never the URL itself).
  const bUrl = findBoardImageUrl();
  if (bUrl) out.boardTheme = boardNameFromUrl(bUrl);
  const result = out.pieceSet || out.boardTheme ? out : null;
  console.log("[Chess Analyzer] detected theme:", result);
  return result;
}
const BOARD_RE = /chess-themes\/boards?\/|\/boards?\//i;
const IMG_RE = /\.(png|jpe?g|svg|webp|gif)(\?|$)/i;
function findBoardImageUrl() {
  // 1) Most reliable: ask the browser which resources the page HAS loaded. The
  //    board's PNG is already loaded (it's the one you could download), so we find
  //    the URL directly — regardless of where in the DOM/CSS the image sits.
  try {
    for (const r of performance.getEntriesByType("resource")) {
      if (/boards?\//i.test(r.name) && IMG_RE.test(r.name) && !/\/pieces\//i.test(r.name)) {
        return r.name;
      }
    }
  } catch {}
  // 2) Computed background-image on candidate elements — incl. ::before/::after,
  //    since chess.com often draws the board on a pseudo-element.
  const sels = [
    "wc-chess-board", "chess-board", ".board-board", "#board-board",
    ".board-layout-chessboard", ".layout-board", ".board", "[class*='board']",
  ];
  for (const sel of sels) {
    let nodes;
    try { nodes = document.querySelectorAll(sel); } catch { continue; }
    for (const elem of nodes) {
      for (const pseudo of [null, "::before", "::after"]) {
        const u = bgUrl(elem, pseudo);
        if (u && BOARD_RE.test(u) && !/\/pieces\//i.test(u)) return u;
      }
    }
  }
  // 3) Fallback: look for a boards URL in the page's (same-origin) stylesheets.
  for (const sheet of document.styleSheets) {
    let rules;
    try { rules = sheet.cssRules; } catch { continue; } // cross-origin → skip
    if (!rules) continue;
    for (const rule of rules) {
      const m = (rule.cssText || "").match(/url\(["']?([^"')]*\/boards?\/[^"')]+\.(?:png|jpe?g|svg|webp|gif))["']?\)/i);
      if (m) return m[1];
    }
  }
  return null;
}
function boardNameFromUrl(u) {
  if (!u) return null;
  let m = u.match(/\/boards?\/([^/]+)\/\d+\.[a-z]+/i); // boards/<name>/200.png
  if (m) return m[1].toLowerCase();
  m = u.match(/\/boards?\/([^/.]+)\.[a-z]+/i);          // boards/<name>.png
  if (m) return m[1].toLowerCase();
  m = u.match(/\/boards?\/([^/]+)/i);
  return m ? m[1].toLowerCase() : null;
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
  // Filter out obvious non-usernames (anonymous/guests/computer).
  if (/^(opponent|anonymous|guest|computer|stockfish)$/i.test(t)) return null;
  return t;
}
function usernameFromContainer(root) {
  if (!root) return null;
  // a) Most reliable: a link to the member profile (/member/<user>).
  const link = root.querySelector("a[href*='/member/']");
  const hm = link?.getAttribute("href")?.match(/\/member\/([^/?#]+)/i);
  if (hm) {
    const name = cleanUsername(decodeURIComponent(hm[1]));
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
  if (m) add(cleanUsername(decodeURIComponent(m[1])));
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
  const m = (el.className || "").match(/(?:^|\s)country-([a-z]{2,3}|\d+)(?:\s|$)/i);
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
function handleShareFragment() {
  const m = location.hash.match(/[#&]gambit=([^&]+)/);
  if (!m) return;
  try {
    const payload = JSON.parse(b64decode(decodeURIComponent(m[1])));
    if (!payload || !payload.pgn) return;
    // clear the fragment so a reload doesn't open it again
    history.replaceState(null, "", location.pathname + location.search);
    chrome.runtime.sendMessage({ type: "openShared", payload });
  } catch (e) {
    console.warn("[Chess Analyzer] invalid share link", e);
  }
}
handleShareFragment();
// chess.com is an SPA; check again shortly after in case of a late hash update.
setTimeout(handleShareFragment, 1200);

// ---- Inject "Review with extension" buttons ----
// Two spots on chess.com use the same button: (1) the game-over modal, and (2) the play-page
// sidebar, each right beneath chess.com's green "Game Review" CTA. They share one builder; only the
// chess.com width class and the insertion point differ. chess.com renders both with Vue (note the
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
const FREE_REVIEW_LABEL = "Review with extension";

const CC = {
  // Classes we put on OUR button so it matches chess.com's CTA width in each spot (styling, not
  // lookup — kept here so every chess.com-specific string lives in one place).
  widthClass: { modal: "game-over-primary-cta-game-over-primary-cta", sidebar: "cc-button-full" },
  // Game-over modal.
  modalContainer: [".game-over-modal-shell-buttons", "[class*='modal-shell-buttons']"],
  modalSecondaryRow: [".game-over-secondary-actions-row-component", "[class*='secondary-actions-row']"],
  modalContext: [".game-over-modal-component", "[class*='game-over-modal']"], // "is a game-over modal on screen?"
  // Play-page sidebar.
  sidebarEmphasis: [".game-review-emphasis-content", "[class*='game-review-emphasis']"],
  sidebarReviewButtons: [".game-review-buttons-component", "[class*='game-review-buttons']"],
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
}

// Build the button: green primary CTA + our logo (top-right, bordered so it stands out on the green)
// + the "Opening review…" click cue. `widthClass` is the chess.com class that sizes it in its
// container — the modal and the sidebar Game Review buttons use different ones.
function buildReviewButton(widthClass, mt = 14, mb = 3) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = `cc-button-component cc-button-primary cc-button-xx-large cc-bg-primary ${widthClass} chess-analyzer-free-review`;
  // Only top/bottom margins — NOT the `margin:Xpx 0` shorthand, which would zero the left/right
  // margins some width classes rely on. position:relative anchors the logo in the top-right corner.
  // Margins are passed in because the modal and the sidebar want different vertical spacing.
  btn.style.cssText = `margin-top:${mt}px;margin-bottom:${mb}px;position:relative;`;
  // Logo is an extension file → loaded via chrome.runtime.getURL (listed in web_accessible_resources).
  const logoUrl = chrome.runtime.getURL("icons/icon.png");
  btn.innerHTML =
    `<img class="chess-analyzer-free-review-logo" src="${logoUrl}" alt="" ` +
    `style="position:absolute;top:6px;right:8px;width:20px;height:20px;border:1px solid #000;border-radius:3px;"> ` +
    `<span class="chess-analyzer-free-review-label">${FREE_REVIEW_LABEL}</span>`;
  const label = btn.querySelector(".chess-analyzer-free-review-label");
  let resetTimer = null;

  btn.addEventListener("click", () => {
    btn.disabled = true;
    // Visual cue that the click registered: change text + disable (dims the button). Kept visible for
    // a fixed moment, then restored unconditionally so it can never get stuck. (Don't reset on the
    // background's reply — that fires almost instantly and made the cue flash by too fast to see.)
    label.textContent = "Opening review…";
    clearTimeout(resetTimer);
    resetTimer = setTimeout(() => resetFreeReviewButton(btn, label), 5000);
    try {
      // After an extension reload the old content script loses its context — sendMessage throws.
      chrome.runtime.sendMessage({ type: "freeGameReview" }, () => {
        if (chrome.runtime.lastError) {
          clearTimeout(resetTimer);
          btn.disabled = false;
          label.textContent = "Reload the page ↻";
        }
      });
    } catch (e) {
      clearTimeout(resetTimer);
      btn.disabled = false;
      label.textContent = "Reload the page ↻";
      console.warn("[Chess Analyzer] extension context lost (it was reloaded/updated) — reload this chess.com tab to reconnect.", e);
    }
  });
  return btn;
}

// (1) Game-over modal: beneath "Game Review", above the New/Rematch row.
function injectModalReviewButton(buttonsContainer) {
  if (buttonsContainer.querySelector(".chess-analyzer-free-review")) return;
  // Smaller top margin than the sidebar so our button + the New/Rematch row sit higher in the modal.
  const btn = buildReviewButton(CC.widthClass.modal, 6, 3);
  const secondaryRow = firstEl(buttonsContainer, CC.modalSecondaryRow);
  if (secondaryRow) buttonsContainer.insertBefore(btn, secondaryRow);
  else buttonsContainer.appendChild(btn);
  console.log("[Chess Analyzer] injected review button (modal)");
}

// (2) Play-page sidebar: directly beneath chess.com's "Game Review" CTA, inside the SAME container
// so cc-button-full gives it the identical width. The moves list above is the sidebar's flex-growing
// scroll area and the sidebar is height-locked to the board, so adding this button automatically
// shortens the moves list rather than making the sidebar taller — exactly the trade-off we want.
function injectSidebarReviewButton(emphasisContent) {
  const reviewBtns = firstEl(emphasisContent, CC.sidebarReviewButtons);
  if (!reviewBtns) return;
  // Wait until chess.com has actually rendered its own Game Review CTA. Injecting into the section
  // while Vue is still building it corrupts Vue's child diffing and stalls the whole section — it
  // then only appears after a click forces a fresh render. The CTA's presence means it's ready.
  const cta = firstEl(reviewBtns, CC.sidebarCta);
  if (!cta) return;
  if (reviewBtns.querySelector(".chess-analyzer-free-review")) return;
  const btn = buildReviewButton(CC.widthClass.sidebar);
  cta.insertAdjacentElement("afterend", btn);
  console.log("[Chess Analyzer] injected review button (sidebar)");
}

(function watchForReviewSpots() {
  let modalTimer = null, sidebarTimer = null;
  const tryInject = () => {
    // (1) Modal.
    const modal = firstEl(document, CC.modalContainer);
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
    const emphasis = firstEl(document, CC.sidebarEmphasis);
    if (emphasis) {
      injectSidebarReviewButton(emphasis);
      if (!emphasis.querySelector(".chess-analyzer-free-review") && !sidebarTimer) {
        sidebarTimer = setTimeout(() => {
          sidebarTimer = null;
          const emph = firstEl(document, CC.sidebarEmphasis);
          if (emph && !emph.querySelector(".chess-analyzer-free-review")) {
            warnMarkupChanged("sidebar", "the game-review sidebar was detected");
          }
        }, 6000);
      }
    }
  };
  const observer = new MutationObserver(tryInject);
  observer.observe(document.body, { childList: true, subtree: true });
  tryInject();
})();

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
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
      flip: detectFlip(),         // user's board perspective from ?flip= (true=Black at bottom)
      theme: detectChessComTheme(), // the user's chess.com piece/board theme (or null)
      moveListText: parsed ? null : null, // only filled on explicit fallback below
    });
    return true;
  }
  if (msg && msg.type === "getTheme") {
    sendResponse({ ok: true, theme: detectChessComTheme() });
    return true;
  }
  if (msg && msg.type === "getDomMoves") {
    sendResponse({ ok: true, moveListText: readMoveListText() });
    return true;
  }
});
