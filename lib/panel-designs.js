// Stable design IDs keep saved choices intact as more panel iterations are added.
export const PANEL_DESIGNS = [
  {panel: 'graph', label: 'Evaluation', setting: 'graphDesign', default: 'timeline', versions: [
    {id: 'original', label: 'Original'}, {id: 'timeline', label: 'Timeline'}, {id: 'timeline2', label: 'Timeline v2'}, {id: 'bars', label: 'Move bars'},
    {id: 'minimal', label: 'Minimal'},
  ]},
  {panel: 'engine', label: 'Engine', setting: 'engineDesign', default: 'original', versions: [
    {id: 'original', label: 'Original'}, {id: 'focus', label: 'Focus'}, {id: 'minimal', label: 'Minimal'},
  ]},
  {panel: 'evalbar', label: 'Evaluation bar', setting: 'evalbarDesign', default: 'balance', versions: [
    {id: 'original', label: 'Original'}, {id: 'balance', label: 'Balance'},
  ]},
  {panel: 'accuracy', label: 'Accuracy overview', setting: 'accuracyDesign', default: 'phases', versions: [
    {id: 'original', label: 'Original'}, {id: 'pages', label: 'Page tabs'}, {id: 'dials', label: 'Dials'},
    {id: 'reveal', label: 'Reveal'},
    {id: 'phases', label: 'Phase report'},
    {id: 'phases2', label: 'Phase report 2'},
    {id: 'phases-modern', label: 'Phase report Modern'},
  ]},
  {panel: 'accuracyQuality', label: 'Accuracy move quality', setting: 'accuracyQualityDesign', default: 'distribution', versions: [
    {id: 'original', label: 'Original'}, {id: 'distribution', label: 'Distribution'},
  ]},
  {panel: 'accuracyAdvanced', label: 'Accuracy advanced', setting: 'accuracyAdvancedDesign', default: 'original', versions: [
    {id: 'original', label: 'Original'},
  ]},
  {panel: 'moves', label: 'Move list', setting: 'movesDesign', default: 'full', versions: [
    {id: 'original', label: 'Original'}, {id: 'full', label: 'Full height'}, {id: 'zoomed', label: 'Zoomed in'},
    {id: 'zoom20', label: 'Zoom +20%'},
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
