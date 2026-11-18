// First-use language picker: a small modal over the workspace. It never saves
// anything itself. The caller persists the language in onConfirm; closing it any
// other way (Escape, "Decide later") calls onDismiss, and the caller offers it
// again on the next visit.
import { LANGUAGES, createTranslator } from "./index.js";

export function openLanguagePicker({
  document,
  suggested,
  languages = LANGUAGES,
  flagUrl = code => `flags/${code}.svg`,
  markUrl = "pieces-img/cburnett/wN.svg",
  inertTarget = () => null,
  onConfirm = () => {},
  onDismiss = () => {},
}) {
  const ids = languages.map(language => language.id);
  let selected = ids.includes(suggested) ? suggested : ids[0];
  let closed = false;
  const previousFocus = document.activeElement;
  const blocked = inertTarget();
  const previousInert = !!blocked?.inert;

  const node = (tag, attributes = {}, ...children) => {
    const element = document.createElement(tag);
    for (const [name, value] of Object.entries(attributes)) {
      if (value == null || value === false) continue;
      if (name === "class") element.className = value;
      else element.setAttribute(name, value === true ? "" : value);
    }
    element.append(...children.filter(child => child != null));
    return element;
  };

  const title = node("h2", { class: "lang-title", id: "languagePickerTitle" });
  const intro = node("p", { class: "lang-intro", id: "languagePickerIntro" });
  const group = node("div", { class: "lang-options", role: "radiogroup", "aria-labelledby": "languagePickerTitle" });
  const options = languages.map(language => {
    const option = node("button", { type: "button", class: "lang-option", role: "radio", "data-language": language.id },
      node("img", { class: "lang-flag", src: flagUrl(language.flag), alt: "", width: "28", height: "21", draggable: "false" }),
      node("span", { class: "lang-names" },
        node("span", { class: "lang-native", lang: language.id, translate: "no" }, language.nativeName),
        node("span", { class: "lang-alt" })),
      node("span", { class: "lang-badge" }),
      node("span", { class: "lang-check", "aria-hidden": "true" }));
    option.addEventListener("click", () => select(language.id, true));
    option.addEventListener("dblclick", () => confirm());
    group.append(option);
    return option;
  });
  const later = node("button", { type: "button", class: "lang-later" });
  const confirmButton = node("button", { type: "button", class: "lang-confirm" });
  later.addEventListener("click", () => close("dismiss"));
  confirmButton.addEventListener("click", () => confirm());

  const card = node("div", { class: "lang-card", role: "dialog", "aria-modal": "true",
      "aria-labelledby": "languagePickerTitle", "aria-describedby": "languagePickerIntro" },
    node("div", { class: "lang-head" },
      node("span", { class: "lang-mark", "aria-hidden": "true" }, node("img", { src: markUrl, alt: "" })),
      title),
    intro, group,
    node("div", { class: "lang-actions" }, later, confirmButton));
  const overlay = node("div", { class: "lang-overlay" }, card);

  // The copy previews the highlighted language, so each reader sees their own.
  function render() {
    const i18n = createTranslator(selected);
    card.lang = selected;
    title.textContent = i18n.t("language.picker.title");
    intro.textContent = i18n.t("language.picker.intro");
    later.textContent = i18n.t("language.picker.later");
    confirmButton.textContent = i18n.t("language.picker.confirm");
    options.forEach((option, index) => {
      const language = languages[index], checked = language.id === selected;
      option.setAttribute("aria-checked", String(checked));
      option.tabIndex = checked ? 0 : -1;
      const alt = i18n.t("language.name." + language.id);
      const altNode = option.querySelector(".lang-alt");
      altNode.textContent = alt === language.nativeName ? "" : alt;
      altNode.hidden = !altNode.textContent;
      const badge = option.querySelector(".lang-badge");
      badge.textContent = language.id === suggested ? i18n.t("language.picker.suggested") : "";
      badge.hidden = !badge.textContent;
    });
  }
  function select(id, focus = false) {
    if (closed || !ids.includes(id)) return;
    selected = id;
    render();
    if (focus) options[ids.indexOf(id)].focus({ preventScroll: true });
  }
  function confirm() {
    if (closed) return;
    const id = selected;
    close("confirm");
    return onConfirm(id);
  }
  function close(reason = "dismiss") {
    if (closed) return;
    closed = true;
    document.removeEventListener("keydown", onKey, true);
    overlay.remove();
    if (blocked) blocked.inert = previousInert;
    if (previousFocus?.isConnected && previousFocus !== document.body) previousFocus.focus({ preventScroll: true });
    if (reason === "dismiss") onDismiss();
  }
  // Capture keys before the workspace's own shortcuts (moves, flip …) see them.
  function onKey(event) {
    const focusable = [...options.filter(option => option.tabIndex === 0), later, confirmButton];
    const radio = event.target?.closest?.(".lang-option");
    if (event.key === "Escape") {
      event.preventDefault(); close("dismiss");
    } else if (event.key === "Tab") {
      const index = focusable.indexOf(document.activeElement);
      const next = index < 0 ? (event.shiftKey ? focusable.length - 1 : 0)
        : (index + (event.shiftKey ? -1 : 1) + focusable.length) % focusable.length;
      event.preventDefault(); focusable[next].focus();
    } else if (radio && ["ArrowDown", "ArrowRight", "ArrowUp", "ArrowLeft", "Home", "End"].includes(event.key)) {
      const current = ids.indexOf(selected), last = ids.length - 1;
      const next = event.key === "Home" ? 0 : event.key === "End" ? last
        : ["ArrowDown", "ArrowRight"].includes(event.key) ? (current === last ? 0 : current + 1) : (current === 0 ? last : current - 1);
      event.preventDefault(); select(ids[next], true);
    } else if (radio && event.key === "Enter") {
      event.preventDefault(); confirm();
    } else if (radio && event.key === " ") {
      event.preventDefault(); select(radio.dataset.language, true);
    }
    event.stopImmediatePropagation();
  }

  render();
  document.body.append(overlay);
  if (blocked) blocked.inert = true;
  document.addEventListener("keydown", onKey, true);
  options[ids.indexOf(selected)].focus({ preventScroll: true });

  return {
    element: overlay,
    get open() { return !closed; },
    get selected() { return selected; },
    select,
    confirm,
    // Close without calling either callback, e.g. when another tab already chose.
    close: () => close("external"),
  };
}
