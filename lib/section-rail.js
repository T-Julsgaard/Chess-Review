// The section rail: three round buttons to the right of the panels that move between the game
// review, learning and the player profile. The host (analysis.js) owns the sections; the rail only
// shows which one is current, follows the panel column it sits next to, and reports clicks.

export const SECTIONS = Object.freeze([
  {id: "review", label: "Review"},
  {id: "learn", label: "Learn"},
  {id: "playstyle", label: "Playstyle"},
]);

// Icon strokes (24x24). Each stroke gets pathLength="1", so the icon can draw itself in when its
// section becomes current.
export const SECTION_ICONS = Object.freeze({
  // Four rows of squares stay distinct at button size.
  review: {
    paths: ["M3 3h18v18H3Z"],
    fill: [
      "M7.5 3h4.5v4.5H7.5Z M16.5 3H21v4.5h-4.5Z",
      "M3 7.5h4.5V12H3Z M12 7.5h4.5V12H12Z",
      "M7.5 12H12v4.5H7.5Z M16.5 12H21v4.5h-4.5Z",
      "M3 16.5h4.5V21H3Z M12 16.5h4.5V21H12Z",
    ].join(" "),
  },
  // An open book.
  learn: {paths: ["M12 6.5C10.4 5.2 8 4.6 4 4.8v13.4c4-.2 6.4.4 8 1.7", "M12 6.5c1.6-1.3 4-1.9 8-1.7v13.4c-4-.2-6.4.4-8 1.7z"]},
  // A fingerprint: the way someone plays.
  playstyle: {paths: ["M6.2 7.4A7.5 7.5 0 0 1 19.5 12v1.6", "M4.5 15.8V12c0-.9.2-1.8.5-2.6", "M8.4 19.6c.4-1.2.6-2.5.6-3.9V12a3 3 0 0 1 6 0v1.6c0 2.2-.4 4.3-1.2 6.2", "M12 12v3.4c0 1.8-.3 3.5-1 5.1", "M18.6 17.4c-.2.9-.5 1.8-.9 2.6"]},
});
const SVG_NS = "http://www.w3.org/2000/svg";
function iconNode(doc, {paths, fill}) {
  const svg = doc.createElementNS(SVG_NS, "svg");
  for (const [key, value] of Object.entries({viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-width": "1.9", "stroke-linecap": "round", "stroke-linejoin": "round", "aria-hidden": "true"})) svg.setAttribute(key, value);
  for (const d of paths) {
    const path = doc.createElementNS(SVG_NS, "path");
    path.setAttribute("pathLength", "1"); path.setAttribute("d", d);
    svg.append(path);
  }
  if (fill) {
    const path = doc.createElementNS(SVG_NS, "path");
    path.setAttribute("d", fill);
    path.setAttribute("fill", "currentColor");
    path.setAttribute("stroke", "none");
    svg.append(path);
  }
  return svg;
}

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

/**
 * @param {object} options
 * @param {Document} options.document
 * @param {(id: string) => void} options.onSelect  called with the clicked section's id
 * @param {() => boolean} [options.motion]  false while the user has turned animations off
 */
export function createSectionRail({document: doc, onSelect, motion = () => true}) {
  const view = doc.defaultView;
  const make = (tag, className, attrs = {}) => {
    const node = doc.createElement(tag);
    if (className) node.className = className;
    for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
    return node;
  };
  const nav = make("nav", "section-rail", {"aria-label": "Sections"});
  nav.hidden = true;
  const spark = make("span", "section-rail-spark", {"aria-hidden": "true"});
  nav.append(spark);
  const buttons = new Map();
  for (const [index, {id, label}] of SECTIONS.entries()) {
    // A faint thread between neighbours; it stretches, so the buttons stay evenly spaced.
    if (index) nav.append(make("span", "section-rail-thread", {"aria-hidden": "true"}));
    const button = make("button", "section-btn", {type: "button", "data-section": id});
    const disc = make("span", "section-btn-disc");
    disc.append(iconNode(doc, SECTION_ICONS[id]));
    const text = make("span", "section-btn-label");
    text.textContent = label;
    button.append(disc, text);
    button.addEventListener("click", () => onSelect?.(id));
    buttons.set(id, button);
    nav.append(button);
  }

  let current = null;
  const syncMotion = () => { nav.dataset.motion = motion() ? "on" : "off"; };
  const reduced = () => nav.dataset.motion === "off" || view?.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  // Restart a one-shot CSS animation class; it comes off once its longest animation is over.
  const timers = new Map();
  function replay(node, className, duration = 900) {
    const key = node.dataset.section + className;
    view?.clearTimeout(timers.get(key));
    node.classList.remove(className);
    void node.offsetWidth;
    node.classList.add(className);
    timers.set(key, view?.setTimeout(() => node.classList.remove(className), duration));
  }
  const centerOf = button => {
    const disc = button.querySelector(".section-btn-disc");
    return button.offsetTop + disc.offsetTop + disc.offsetHeight / 2;
  };
  // A short light runs along the track from the old section to the new one.
  function travel(from, to) {
    if (reduced() || !spark.animate || nav.hidden) return;
    const a = centerOf(from), b = centerOf(to), length = spark.offsetHeight || 0;
    spark.getAnimations?.().forEach(animation => animation.cancel());
    spark.animate([
      {transform: `translateY(${a - length / 2}px) scaleY(.4)`, opacity: 0},
      {opacity: 1, offset: .25},
      {transform: `translateY(${b - length / 2}px) scaleY(1)`, opacity: 0},
    ], {duration: 520, easing: "cubic-bezier(.55,0,.25,1)"});
  }

  /** Mark the section the user is in. `animate: false` for the first paint. */
  function set(id, {animate = true} = {}) {
    syncMotion();
    if (!buttons.has(id) || id === current) return;
    const previous = buttons.get(current);
    current = id;
    for (const [key, button] of buttons) {
      const active = key === id;
      button.classList.toggle("is-current", active);
      if (active) button.setAttribute("aria-current", "page");
      else button.removeAttribute("aria-current");
    }
    nav.dataset.current = id;
    const next = buttons.get(id);
    if (!animate || !previous) {
      nav.classList.add("section-rail-instant");
      void nav.offsetWidth;
      nav.classList.remove("section-rail-instant");
      return;
    }
    travel(previous, next);
    replay(next, "is-arriving");
  }

  /** A click on the section the user is already in: a small nod instead of a jump. */
  function acknowledge(id) {
    const button = buttons.get(id);
    if (button && !reduced()) replay(button, "is-here");
  }

  /**
   * Stand beside `rect` (the panel column, in viewport pixels): the first disc's top meets the
   * column's top, the last label's bottom meets its bottom. Hidden when the window has no room.
   */
  function place(rect, {top: minTop = 0} = {}) {
    syncMotion();
    const width = view?.innerWidth || 0, height = view?.innerHeight || 0;
    if (!rect || !(rect.width > 0) || !(rect.height > 0)) { nav.hidden = true; return false; }
    const scale = clamp(rect.width / 570, .8, 1.8);
    const railWidth = 72 * scale, gap = 30 * scale;
    const left = rect.right + gap;
    const top = Math.max(rect.top, minTop), bottom = Math.min(rect.bottom, height - 8);
    const fits = left + railWidth + 8 <= width && bottom - top >= 230 * scale;
    if (!fits) { nav.hidden = true; return false; }
    const wasHidden = nav.hidden;
    if (wasHidden) nav.classList.add("section-rail-instant");
    nav.style.setProperty("--rail-s", scale.toFixed(4));
    nav.style.left = `${left.toFixed(1)}px`;
    nav.style.top = `${top.toFixed(1)}px`;
    nav.style.height = `${(bottom - top).toFixed(1)}px`;
    nav.hidden = false;
    if (wasHidden) { void nav.offsetWidth; nav.classList.remove("section-rail-instant"); }
    return true;
  }

  return {element: nav, buttons, set, acknowledge, place, get current() { return current; }};
}
