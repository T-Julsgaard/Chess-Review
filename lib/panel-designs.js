// Stable design IDs keep saved choices intact as more panel iterations are added.
export const PANEL_DESIGNS = [
  {panel: 'evalbar', label: 'Evaluation bar', setting: 'evalbarDesign', default: 'balance', versions: [
    {id: 'original', label: 'Original'}, {id: 'balance', label: 'Balance'},
  ]},
  {panel: 'accuracy', label: 'Accuracy', setting: 'accuracyDesign', default: 'dials', versions: [
    {id: 'original', label: 'Original'}, {id: 'pages', label: 'Page tabs'}, {id: 'dials', label: 'Dials'},
  ]},
  {panel: 'moves', label: 'Move list', setting: 'movesDesign', default: 'full', versions: [
    {id: 'original', label: 'Original'}, {id: 'full', label: 'Full height'}, {id: 'zoomed', label: 'Zoomed in'},
  ]},
];

export function panelDesign(panel, settings) {
  const definition = PANEL_DESIGNS.find(item => item.panel === panel);
  return definition.versions.some(version => version.id === settings[definition.setting])
    ? settings[definition.setting] : definition.default;
}

export function normalizePanelDesigns(settings) {
  let changed = false;
  for (const definition of PANEL_DESIGNS) {
    const value = panelDesign(definition.panel, settings);
    if (settings[definition.setting] !== value) { settings[definition.setting] = value; changed = true; }
  }
  return changed;
}
