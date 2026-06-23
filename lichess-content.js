// lichess-content.js — runs on lichess.org pages. Same message interface as content.js
// (getGameInfo / getTheme / getDomMoves) but adapted to Lichess's DOM. Reads the game id
// from the page and, best-effort, the move list and the user's board/piece theme. The PGN
// itself is fetched from Lichess's public API by analyze-flow (this script only reports the id).

console.log("[Chess Analyzer] lichess content script active on", location.href);

// 8-char first-path segments that are routes, not games.
const RESERVED = /^(training|analysis|practice|streamer|tournament|broadcast)$/i;

function abs(url) {
  try { return new URL(url, location.href).href; } catch { return url; }
}

// ---- Game id ----------------------------------------------------------------
// The first path segment of a game URL is the 8-char id (sometimes 12 with a player token):
// /CZmytj0X, /CZmytj0X/black, /CZmytj0X/black/analysis, /CZmytj0XNUnq (live).
function firstPathId() {
  const seg = location.pathname.replace(/^\/+/, "").split("/")[0] || "";
  if (/^[A-Za-z0-9]{8,12}$/.test(seg) && !RESERVED.test(seg)) return seg.slice(0, 8);
  return null;
}
function detectGameId() {
  // 1) og:url is the most reliable on a game/analysis page: https://lichess.org/<id8>/<color>
  const og = document.querySelector('meta[property="og:url"]')?.getAttribute("content");
  const m = og && og.match(/lichess\.org\/([A-Za-z0-9]{8})\b/);
  if (m) return m[1];
  // 2) Otherwise only treat the URL as a game when a board is actually present (round/analysis view).
  if (document.querySelector(".round__app, main.round, main.analyse, .analyse__board, cg-container")) {
    const id = firstPathId();
    if (id) return id;
  }
  return null;
}

// ---- Board perspective ------------------------------------------------------
// Which colour sits at the bottom is the viewer's POV — and Lichess orients a game you played to
// your own colour. Chessground tags the board wrap with orientation-white / orientation-black, so
// that class is the most reliable read; a /black|/white URL segment is the fallback. This is what
// fixes opening a game you played as Black and finding the opponent seated at the bottom.
// Tri-state: true (Black at bottom) / false (White) / null (unknown → defer to the username match).
function detectFlip() {
  const wrap = document.querySelector(".cg-wrap");
  if (wrap) {
    if (wrap.classList.contains("orientation-black")) return true;
    if (wrap.classList.contains("orientation-white")) return false;
  }
  if (/\/black(?:\/|$)/i.test(location.pathname)) return true;
  if (/\/white(?:\/|$)/i.test(location.pathname)) return false;
  return null;
}

// ---- Move list (DOM fallback if the API can't be reached) -------------------
// Round view:   <l4x><i5z>1</i5z><kwdb>e4</kwdb><kwdb>e5</kwdb>…</l4x>
// Analysis view: <div class="tview2">… <move><san>e4</san></move> …</div>
const RESULT_RE = /^(1-0|0-1|1\/2-1\/2|½-½|\*)$/;
function readMovetext() {
  // Round view — a flat list of SAN tokens in document order.
  let sans = [...document.querySelectorAll("l4x kwdb")]
    .map((n) => (n.textContent || "").trim())
    .filter((t) => t && !RESULT_RE.test(t));
  // Analysis view — SAN sits in <san> (or directly in <move>).
  if (sans.length < 2) {
    sans = [...document.querySelectorAll(".tview2 move")]
      .map((n) => (n.querySelector("san")?.textContent || n.textContent || "").trim())
      .filter((t) => t && !RESULT_RE.test(t) && !/^\d+\.?$/.test(t));
  }
  if (sans.length < 2) return null;
  // Re-number into standard movetext so the PGN parser is happy.
  let out = "", n = 1;
  for (let i = 0; i < sans.length; i += 2) {
    out += `${n}. ${sans[i]} ${sans[i + 1] ? sans[i + 1] + " " : ""}`;
    n++;
  }
  return out.trim();
}

// ---- Theme: import the user's Lichess board image + piece set ---------------
// Lichess exposes each piece as a CSS custom property on :root (---white-king … ---black-pawn)
// pointing at a hashed SVG, and the board theme as a body[data-board] + a background image on
// the board element. We read those (storing nothing) so the analysis page can match the look.
function cssVarUrl(name) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name);
  const m = v && v.match(/url\(["']?(.*?)["']?\)/);
  return m ? abs(m[1]) : null;
}
const PIECE_VARS = [
  ["wk", "---white-king"], ["wq", "---white-queen"], ["wr", "---white-rook"],
  ["wb", "---white-bishop"], ["wn", "---white-knight"], ["wp", "---white-pawn"],
  ["bk", "---black-king"], ["bq", "---black-queen"], ["br", "---black-rook"],
  ["bb", "---black-bishop"], ["bn", "---black-knight"], ["bp", "---black-pawn"],
];
const IMG_RE = /\.(png|jpe?g|svg|webp|gif)(\?|$)/i;
function findBoardUrl(boardTheme) {
  // 1) computed background-image on the board element (Lichess paints the theme there in 2D).
  for (const sel of ["cg-board", ".cg-wrap", ".main-board", "cg-container"]) {
    const elx = document.querySelector(sel);
    if (!elx) continue;
    const bg = getComputedStyle(elx).backgroundImage;
    const m = bg && bg.match(/url\(["']?(.*?)["']?\)/);
    if (m && IMG_RE.test(m[1])) return abs(m[1]);
  }
  // 2) the preloaded board asset whose filename matches the theme name (…/<board>.<hash>.png).
  if (boardTheme) {
    const re = new RegExp("/" + boardTheme + "\\.[a-z0-9]+\\." + "(png|jpe?g|svg|webp|gif)$", "i");
    for (const link of document.querySelectorAll('link[rel="preload"][as="image"]')) {
      const href = link.getAttribute("href") || "";
      if (re.test(href)) return abs(href);
    }
    try {
      for (const r of performance.getEntriesByType("resource")) if (re.test(r.name)) return r.name;
    } catch {}
  }
  return null;
}
function detectLichessTheme() {
  const pieceUrlMap = {};
  for (const [code, varName] of PIECE_VARS) {
    const u = cssVarUrl(varName);
    if (u) pieceUrlMap[code] = u;
  }
  const pieceSet = document.body.getAttribute("data-piece-set") || null;
  const boardTheme = document.body.getAttribute("data-board") || null;
  const boardUrl = findBoardUrl(boardTheme);
  const out = {};
  if (Object.keys(pieceUrlMap).length >= 12) { out.pieceUrlMap = pieceUrlMap; out.pieceSet = pieceSet; }
  if (boardUrl || boardTheme) { out.boardUrl = boardUrl; out.boardTheme = boardTheme; }
  const result = out.pieceUrlMap || out.boardUrl ? out : null;
  console.log("[Chess Analyzer] detected lichess theme:", result);
  return result;
}

// ---- Share link: a Lichess URL with #gambit=<base64 PGN+meta>. Same scheme as content.js, so a
// shared analysis whose carrier is a Lichess game opens directly here too.
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
    history.replaceState(null, "", location.pathname + location.search);
    chrome.runtime.sendMessage({ type: "openShared", payload });
  } catch (e) {
    console.warn("[Chess Analyzer] invalid share link", e);
  }
}
handleShareFragment();
// Lichess is an SPA; check again shortly after in case of a late hash update.
setTimeout(handleShareFragment, 1200);

// ---- Post-game controls: inject "Review with extension" button --------------
// When a game ends, Lichess shows .rcontrols .follow-up with Rematch / New opponent / Analysis
// board (all class "fbt", stacked). We add a matching fbt button just beneath "Analysis board"
// that fires the same analysis flow as the toolbar icon (background's freeGameReview handler).
const LI_REVIEW_LABEL = "Review with extension";

// Redundancy: DOM selectors live in LI as ORDERED fallback lists (current markup first → looser
// fallbacks), so behaviour is unchanged today and a future Lichess class rename has a single place to
// fix. Lichess classes (.fbt, .rcontrols, .follow-up) are long-stable, but we still degrade gracefully
// and warn once if a post-game state is detected without a place to inject. Either way the toolbar
// icon / Ctrl+Shift+Y run the same analysis regardless of the DOM.
const LI = {
  // The post-game controls row holding Rematch / New opponent / Analysis board.
  followUp: [".rcontrols .follow-up", ".follow-up", "[class*='follow-up']"],
  // The "Analysis board" link we sit beneath (the only <a class="fbt"> in the row). If it's gone we
  // append to the row instead — placement degrades, the button still works.
  analysisLink: ["a.fbt"],
  // Post-game signal that does NOT depend on the follow-up class (these buttons keep their own
  // classes), so we can tell "game over, should have injected" from "mid-game" for the warning.
  postGame: ["[class*='rematch']", "[class*='new-opponent']"],
};

// First element matching any selector in the list (most-specific/most-stable → loosest).
function firstEl(root, selectors) {
  for (const sel of selectors) {
    let el = null;
    try { el = root.querySelector(sel); } catch { /* bad/unsupported selector → next */ }
    if (el) return el;
  }
  return null;
}

// One-shot warning when post-game controls are present but we couldn't place the button.
let liWarned = false;
function warnMarkupChanged() {
  if (liWarned) return;
  liWarned = true;
  console.warn(
    "[Chess Analyzer] post-game controls detected but the in-page button couldn't be placed — Lichess " +
    "markup may have changed. The toolbar icon and Ctrl+Shift+Y still run the review; update the LI selectors in lichess-content.js."
  );
}

// Load the logo as a data: URL. Lichess's CSP (img-src 'self' blob: data: *) blocks
// chrome-extension:// images, but allows data:. The fetch runs in the content script's isolated
// world (not bound by the page CSP), then we hand the <img> a data: URL it's allowed to render.
// Fetched once and reused.
let logoDataUrlPromise = null;
function getLogoDataUrl() {
  if (!logoDataUrlPromise) {
    logoDataUrlPromise = fetch(chrome.runtime.getURL("icons/icon.png"))
      .then((r) => r.blob())
      .then((b) => new Promise((res) => {
        const fr = new FileReader();
        fr.onload = () => res(fr.result);
        fr.onerror = () => res(null);
        fr.readAsDataURL(b);
      }))
      .catch(() => null);
  }
  return logoDataUrlPromise;
}

function resetLiReviewButton(btn, label) {
  btn.disabled = false;
  label.textContent = LI_REVIEW_LABEL;
}

function injectLichessReviewButton(followUp) {
  // Leave any existing button alone — don't "self-heal" here: this runs on every DOM mutation and
  // would wipe the "Opening review…" cue a frame after a click (learned this on the chess.com side).
  if (followUp.querySelector(".chess-analyzer-review")) return;

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "fbt chess-analyzer-review"; // fbt = Lichess's button style, so it fits in
  btn.style.borderRadius = "0"; // match the square corners of the other follow-up buttons
  btn.innerHTML =
    `<img class="chess-analyzer-review-logo" alt="" ` +
    `style="width:16px;height:16px;margin-right:6px;vertical-align:middle;position:relative;top:-1px;"> ` +
    `<span class="chess-analyzer-review-label">${LI_REVIEW_LABEL}</span>`;
  const label = btn.querySelector(".chess-analyzer-review-label");
  const logo = btn.querySelector(".chess-analyzer-review-logo");
  getLogoDataUrl().then((url) => { if (url) logo.src = url; });
  let resetTimer = null;

  btn.addEventListener("click", () => {
    btn.disabled = true;
    // Visual cue that the click registered: change text + disable (dims the fbt). Kept for a fixed,
    // clearly-visible moment, then restored unconditionally so it can never get stuck.
    label.textContent = "Opening review…";
    clearTimeout(resetTimer);
    resetTimer = setTimeout(() => resetLiReviewButton(btn, label), 5000);
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
      console.warn("[Chess Analyzer] extension context lost (it was reloaded/updated) — reload this lichess tab to reconnect.", e);
    }
  });

  // Place it directly beneath "Analysis board" (the only <a class="fbt"> in the row); if that link
  // isn't found, fall back to appending to the row so the button still appears.
  const analysisLink = firstEl(followUp, LI.analysisLink);
  if (analysisLink) {
    analysisLink.insertAdjacentElement("afterend", btn);
  } else {
    followUp.appendChild(btn);
  }
  console.log("[Chess Analyzer] injected Lichess review button");
}

(function watchForFollowUp() {
  let warnTimer = null;
  const tryInject = () => {
    const followUp = firstEl(document, LI.followUp);
    if (followUp) { injectLichessReviewButton(followUp); return; }
    // No follow-up row found. If clear post-game controls are on screen, the markup likely changed —
    // recheck shortly (the row can lag the rest of the post-game UI), then warn once.
    if (firstEl(document, LI.postGame) && !warnTimer) {
      warnTimer = setTimeout(() => {
        warnTimer = null;
        if (firstEl(document, LI.postGame) && !firstEl(document, LI.followUp)) warnMarkupChanged();
      }, 4000);
    }
  };
  const observer = new MutationObserver(tryInject);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  tryInject();
})();

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg && msg.type === "getGameInfo") {
    sendResponse({
      ok: true,
      site: "lichess",
      url: location.href,
      gameId: detectGameId(),
      flip: detectFlip(),       // user's board perspective (true = Black at bottom)
      movetext: readMovetext(), // DOM fallback if the API lookup fails
      theme: detectLichessTheme(),
    });
    return true;
  }
  if (msg && msg.type === "getTheme") {
    sendResponse({ ok: true, theme: detectLichessTheme() });
    return true;
  }
  if (msg && msg.type === "getDomMoves") {
    sendResponse({ ok: true, moveListText: readMovetext() });
    return true;
  }
});
