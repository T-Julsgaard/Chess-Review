// Stable design IDs keep saved choices intact as more panel iterations are added.
// The Modern setup's choice (the default for new and reset users) is labelled "Default".
export const PANEL_DESIGNS = [
  {panel: 'graph', label: 'Evaluation', setting: 'graphDesign', default: 'bars3', versions: [
    {id: 'original', label: 'Original'}, {id: 'timeline', label: 'Timeline'},
    {id: 'bars3', label: 'Default'}, {id: 'bars2', label: 'Dotted bars'}, {id: 'bars4', label: 'Colored bars'},
  ]},
  {panel: 'engine', label: 'Engine', setting: 'engineDesign', default: 'original', versions: [
    {id: 'original', label: 'Original'}, {id: 'minimal', label: 'Default'},
  ]},
  {panel: 'evalbar', label: 'Evaluation bar', setting: 'evalbarDesign', default: 'original', versions: [
    {id: 'original', label: 'Original'},
  ]},
  {panel: 'accuracy', label: 'Accuracy overview', setting: 'accuracyDesign', default: 'phases-modern', versions: [
    {id: 'original', label: 'Original'}, {id: 'phases-modern', label: 'Default'},
  ]},
  {panel: 'accuracyQuality', label: 'Accuracy move quality', setting: 'accuracyQualityDesign', default: 'distribution', versions: [
    {id: 'original', label: 'Original'}, {id: 'distribution', label: 'Default'},
  ]},
  {panel: 'accuracyAdvanced', label: 'Accuracy advanced', setting: 'accuracyAdvancedDesign', default: 'original', versions: [
    {id: 'original', label: 'Original'},
  ]},
  {panel: 'moves', label: 'Move list', setting: 'movesDesign', default: 'full', versions: [
    {id: 'original', label: 'Original'}, {id: 'full', label: 'Edge-to-edge'}, {id: 'zoom20', label: 'Default'},
    {id: 'zoomed', label: 'Large text'},
  ]},
];

// Keep retired renderers available to layout previews and existing callers.
// They are absent from the settings menu and migrate to a supported choice on load.
const RETIRED_DESIGNS = {
  graph: ['timeline2', 'bars', 'minimal'], engine: ['focus'], evalbar: ['balance'],
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
