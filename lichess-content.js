// lichess-content.js — runs on lichess.org pages. Same message interface as content.js
// (getGameInfo / getDomMoves) but adapted to Lichess's DOM. Reads the game id
// from the page and, best-effort, the move list and board orientation. The PGN
// itself is fetched from Lichess's public API by analyze-flow (this script only reports the id).

console.log("[Chess Analyzer] lichess content script active on", location.href);

// A plain content script can't import browser-compat.js, so inline the same fallback: Firefox's
// `browser.*` is Promise-native, Chrome's `chrome.*` only gained Promise support under MV3.
const browserAPI = typeof browser !== "undefined" ? browser : chrome;

// 8-char first-path segments that are routes, not games.
const RESERVED = /^(training|analysis|practice|streamer|tournament|broadcast)$/i;

// ---- Game id ----------------------------------------------------------------
// Current URLs use /game/<id>; older links use /<id>. Both may carry a player token
// or a trailing /black, /white or /analysis segment. Keep in sync with lichess.js.
function firstPathId(pathname = location.pathname) {
  const seg = pathname.replace(/^\/+/, "").replace(/^game\//, "").split("/")[0] || "";
  if (/^[A-Za-z0-9]{8,12}$/.test(seg) && !RESERVED.test(seg)) return seg.slice(0, 8);
  return null;
}
function detectGameId() {
  // 1) og:url is the most reliable on a game/analysis page.
  const og = document.querySelector('meta[property="og:url"]')?.getAttribute("content");
  if (og) {
    try {
      const url = new URL(og);
      const id = /^(www\.)?lichess\.org$/i.test(url.hostname) && firstPathId(url.pathname);
      if (id) return id;
    } catch { /* missing or malformed metadata: read the page URL below */ }
  }
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
// Round view uses changing custom tag names. The stable .round__app app container
// holds move numbers, SAN tokens and the result; retain the older markup fallback.
// Analysis view: <div class="tview2">… <move><san>e4</san></move> …</div>
const RESULT_RE = /^(1-0|0-1|1\/2-1\/2|½-½|\*)$/;
const SAN_RE = /^(?:O-O(?:-O)?|[KQRBN]?[a-h]?[1-8]?x?[a-h][1-8](?:=[QRBN])?)[+#]?[!?]*$/;
function readMovetext() {
  // Round view — a flat list of SAN tokens in document order.
  let sans = [...document.querySelectorAll(".round__app app > *")]
    .map((n) => (n.textContent || "").trim())
    .filter((t) => SAN_RE.test(t));
  if (sans.length < 2) sans = [...document.querySelectorAll("l4x kwdb")]
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

// ---- Share link: a Lichess URL with #gambit=<base64 PGN+meta>. Same scheme as content.js, so a
// shared analysis whose carrier is a Lichess game opens directly here too.
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

// ---- Post-game controls: inject "Analyze with Chess Review" button ---------
// When a game ends, Lichess shows .rcontrols .follow-up with Rematch / New opponent / Analysis
// board (all class "fbt", stacked). We add a matching fbt button just beneath "Analysis board"
// that fires the same analysis flow as the toolbar icon (background's freeGameReview handler).
const LI_REVIEW_LABEL = "Analyze with Chess Review";

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
    logoDataUrlPromise = fetch(browserAPI.runtime.getURL("icons/icon.png"))
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
  btn.removeAttribute("title");
  label.textContent = LI_REVIEW_LABEL;
}

function injectLichessReviewButton(followUp) {
  // Leave any existing button alone — don't "self-heal" here: this runs on every DOM mutation and
  // would wipe the "Opening review…" cue a frame after a click (learned this on the chess.com side).
  if (followUp.querySelector(".chess-analyzer-review")) return;

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "fbt chess-analyzer-review"; // fbt = Lichess's button style, so it fits in
  const analysisLink = firstEl(followUp, LI.analysisLink);
  // Read before insertion: adding a sibling can change Lichess's last-child styling.
  btn.style.borderRadius = analysisLink ? getComputedStyle(analysisLink).borderRadius : "6px";
  const logo = document.createElement("img");
  logo.className = "chess-analyzer-review-logo";
  logo.alt = "";
  logo.style.cssText = "width:16px;height:16px;margin-right:6px;vertical-align:middle;position:relative;top:-1px;";
  const label = document.createElement("span");
  label.className = "chess-analyzer-review-label";
  label.textContent = LI_REVIEW_LABEL;
  btn.append(logo, " ", label);
  getLogoDataUrl().then((url) => { if (url) logo.src = url; });

  btn.addEventListener("click", () => {
    btn.disabled = true;
    btn.removeAttribute("title");
    // Stay busy until the bounded background operation settles.
    label.textContent = "Opening review…";
    try {
      // After an extension reload the old content script loses its context — sendMessage throws
      // (Chrome) or rejects (Firefox), depending on when the context is invalidated.
      browserAPI.runtime.sendMessage({ type: "freeGameReview", gameKey: location.origin + location.pathname + location.search }).then((result) => {
        if (result?.ok) resetLiReviewButton(btn, label);
        else {
          btn.disabled = false;
          label.textContent = "Couldn't open review — retry";
          btn.title = result?.error || "The extension didn't confirm opening the review. Reload the page and try again.";
          console.warn("[Chess Review]", btn.title);
        }
      }).catch(() => {
        btn.disabled = false;
        label.textContent = "Reload the page ↻";
      });
    } catch (e) {
      btn.disabled = false;
      label.textContent = "Reload the page ↻";
      // An existing content script is detached when the extension is reloaded. It cannot
      // reconnect itself; the tab must load once more to receive the new script.
      console.info("[Chess Analyzer] The extension was updated. Reload this tab to reconnect the review button.");
    }
  });

  // Place it directly beneath "Analysis board" (the only <a class="fbt"> in the row); if that link
  // isn't found, fall back to appending to the row so the button still appears.
  if (analysisLink) {
    analysisLink.insertAdjacentElement("afterend", btn);
  } else {
    followUp.appendChild(btn);
  }
  console.log("[Chess Analyzer] injected Lichess review button");
}

(function watchForFollowUp() {
  let warnTimer = null, followUpRoot = null, scheduled = false;
  const tryInject = () => {
    const followUp = firstEl(document, LI.followUp);
    followUpRoot = followUp;
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
  const relevantSelector = [...LI.followUp, ...LI.postGame].join(",");
  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    const run = () => { scheduled = false; tryInject(); };
    if (document.hidden || typeof requestAnimationFrame !== "function") setTimeout(run, 32);
    else requestAnimationFrame(run);
  };
  const observer = new MutationObserver(records => {
    if (followUpRoot && !followUpRoot.isConnected) { schedule(); return; }
    for (const record of records) {
      if (record.target.closest?.(".chess-analyzer-review")) continue;
      if (followUpRoot?.contains(record.target) || [...record.addedNodes].some(node => node.nodeType === 1
        && (node.matches(relevantSelector) || node.querySelector(relevantSelector)))) { schedule(); return; }
    }
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
  document.addEventListener("visibilitychange", () => { if (!document.hidden) tryInject(); });
  tryInject();
})();

browserAPI.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg && msg.type === "getGameInfo") {
    sendResponse({
      ok: true,
      site: "lichess",
      url: location.href,
      gameId: detectGameId(),
      flip: detectFlip(),       // user's board perspective (true = Black at bottom)
      movetext: readMovetext(), // DOM fallback if the API lookup fails
    });
    return true;
  }
  if (msg && msg.type === "getDomMoves") {
    sendResponse({ ok: true, moveListText: readMovetext() });
    return true;
  }
});
