// profile-viewer-content.js — runs on the Chess Review GitHub Pages profile viewer.
// A shared player profile lives in the URL fragment (#p=…). With the extension
// installed the same profile opens on the review board instead of the static page.
// The fragment never leaves the browser: it is handed to the background, which
// decodes it locally and opens the analysis tab.
(() => {
  const api = typeof browser !== "undefined" ? browser : chrome;
  const inflight = new Set();
  async function handle() {
    const m = location.hash.match(/[#&]p=([^&]+)/);
    if (!m || inflight.has(m[1])) return;
    inflight.add(m[1]);
    const fragment = location.hash;
    try {
      document.documentElement.dataset.chessReview = "installed";
      const result = await api.runtime.sendMessage({type: "openProfile", encoded: m[1]});
      if (result?.ok && location.hash === fragment) document.documentElement.dataset.chessReviewOpened = "true";
    } catch (e) {
      console.warn("[Chess Review] profile link retained; the page shows it instead", e);
    } finally { inflight.delete(m[1]); }
  }
  handle();
  window.addEventListener("hashchange", handle);
})();
