// Collects every visible or announced English string in the settings panel
// (text, labels, tooltips and colour popovers) across all categories and sections.
const LATIN_WORD = /[A-Za-z]{2}/;
const HAN = /\p{Script=Han}/u;

export function settingsStrings(a) {
  const doc = a.dom.window.document, found = new Map();
  const note = (raw, where) => {
    const text = raw?.replace(/\s+/g, ' ').trim();
    if (!text || !LATIN_WORD.test(text) || HAN.test(text)) return;
    if (!found.has(text)) found.set(text, where);
  };
  const collect = (root, where) => {
    const walker = doc.createTreeWalker(root, 4);
    while (walker.nextNode()) {
      const parent = walker.currentNode.parentElement;
      if (parent?.closest('style,script,svg,[translate="no"]')) continue;
      note(walker.currentNode.data, where);
    }
    for (const node of [root, ...root.querySelectorAll('*')]) {
      if (node.closest?.('[translate="no"]')) continue;
      for (const attribute of ['title', 'aria-label', 'placeholder', 'alt']) note(node.getAttribute?.(attribute), `${where} @${attribute}`);
    }
  };
  const tooltips = (root, where) => {
    for (const node of root.querySelectorAll('.has-info')) {
      node.dispatchEvent(new a.dom.window.MouseEvent('mouseenter'));
      const tip = doc.querySelector('.q-tip');
      if (tip) collect(tip, `${where} tooltip`);
    }
  };
  const settings = doc.getElementById('settings');
  // Collapsed sections keep their controls in the DOM, so one pass per category
  // covers every section; the colour popovers are opened one at a time.
  for (const {id} of a.run('SETTINGS_CATEGORIES')) {
    a.call('selectSettingsCategory', id);
    collect(settings, id); tooltips(settings, id);
    const chips = settings.querySelectorAll('.chip-custom').length;
    for (let index = 0; index < chips; index++) {
      settings.querySelectorAll('.chip-custom')[index].click();
      for (const pop of doc.querySelectorAll('.board-cpick')) collect(pop, `${id} popover`);
      doc.dispatchEvent(new a.dom.window.KeyboardEvent('keydown', {key: 'Escape'}));
      a.call('closeArrowColorPicker'); a.call('closeBoardColorPicker');
    }
  }
  return found;
}
