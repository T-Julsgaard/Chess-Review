// Stable design IDs keep saved choices intact as more panel iterations are added.
export const PANEL_DESIGNS = [
  {panel: 'graph', label: 'Evaluation', setting: 'graphDesign', default: 'timeline', versions: [
    {id: 'original', label: 'Original'}, {id: 'timeline', label: 'Timeline'}, {id: 'bars', label: 'Move bars'},
    {id: 'bars2', label: 'Move bars v2'},
    {id: 'minimal', label: 'Minimal'},
  ]},
  {panel: 'engine', label: 'Engine', setting: 'engineDesign', default: 'original', versions: [
    {id: 'original', label: 'Original'}, {id: 'minimal', label: 'Minimal'},
  ]},
  {panel: 'evalbar', label: 'Evaluation bar', setting: 'evalbarDesign', default: 'original', versions: [
    {id: 'original', label: 'Original'},
  ]},
  {panel: 'accuracy', label: 'Accuracy overview', setting: 'accuracyDesign', default: 'phases-modern', versions: [
    {id: 'original', label: 'Original'}, {id: 'phases-modern', label: 'Game phases'},
  ]},
  {panel: 'accuracyQuality', label: 'Accuracy move quality', setting: 'accuracyQualityDesign', default: 'distribution', versions: [
    {id: 'original', label: 'Original'}, {id: 'distribution', label: 'Category bars'},
  ]},
  {panel: 'accuracyAdvanced', label: 'Accuracy advanced', setting: 'accuracyAdvancedDesign', default: 'original', versions: [
    {id: 'original', label: 'Original'},
  ]},
  {panel: 'moves', label: 'Move list', setting: 'movesDesign', default: 'full', versions: [
    {id: 'original', label: 'Original'}, {id: 'full', label: 'Edge-to-edge'}, {id: 'zoomed', label: 'Large text'},
    {id: 'zoom20', label: 'Comfortable'},
  ]},
];

// Keep retired renderers available to layout previews and existing callers.
// They are absent from the settings menu and migrate to a supported choice on load.
const RETIRED_DESIGNS = {
  graph: ['timeline2'], engine: ['focus'], evalbar: ['balance'],
  accuracy: ['pages', 'dials', 'reveal', 'phases', 'phases2', 'phases-modern-v2'],
};

export function panelDesign(panel, settings) {
  const definition = PANEL_DESIGNS.find(item => item.panel === panel);
  return definition.versions.some(version => version.id === settings[definition.setting])
    || RETIRED_DESIGNS[panel]?.includes(settings[definition.setting])
    ? settings[definition.setting] : definition.default;
}

export function normalizePanelDesigns(settings) {
  let changed = false;
  for (const definition of PANEL_DESIGNS) {
    const value = definition.versions.some(version => version.id === settings[definition.setting])
      ? settings[definition.setting] : definition.default;
    if (settings[definition.setting] !== value) { settings[definition.setting] = value; changed = true; }
  }
  return changed;
}
