// Presets select panel designs and a starting arrangement. Individual visual
// preferences and later layout edits remain available after choosing a setup.
export const UI_SETUPS = {
  old: {label: 'Old', layoutMode: 'auto', designs: {
    graphDesign: 'original', engineDesign: 'original', evalbarDesign: 'original',
    accuracyDesign: 'original', accuracyQualityDesign: 'original', accuracyAdvancedDesign: 'original', movesDesign: 'original',
  }},
  modern: {label: 'Modern', layoutMode: 'custom', designs: {
    graphDesign: 'original', engineDesign: 'minimal', evalbarDesign: 'original',
    accuracyDesign: 'phases-modern', accuracyQualityDesign: 'original', accuracyAdvancedDesign: 'original', movesDesign: 'zoom20',
  }},
};

// From chess-review-layout (10).json. Keep the expanded storage baseline;
// the existing 87px Accuracy inset reproduces its displayedLayout on screen.
export const MODERN_LAYOUT = {
  board: {x:304.6563269351339,y:0,w:742.9753703692865,h:844.2080242395542,scale:0.9038629809845334},
  evalbar: {x:254.04,y:52.42405289710294,w:27.115889429536,h:737.5521924833793,scale:0.9038629809845334},
  controls: {x:1064.2398607719872,y:744.0412204557089,w:274.2601407149461,h:47.77434709228095,scale:0.8847101313385362},
  coach: {x:1400.297128981924,y:0,w:169.8643452169989,h:173.40318574235306,scale:0.8847101313385362},
  review: {x:1071.251250973342,y:53.08260788031215,w:538.188894610238,h:119.21905893264767,scale:0.8847101313385362},
  moves: {x:1072,y:366,w:256,h:364,scale:0.8847101313385362},
  accuracy: {x:1348.9176505149353,y:191.0973883691238,w:259.0823494850647,h:485.87239305732885,scale:0.8847101313385362},
  graph: {x:1072,y:192,w:256,h:160,scale:0.8847101313385362},
  engine: {x:1350,y:690.9697814264526,w:258,h:116,scale:0.8847101313385362},
  learn: {x:1348.9176505149353,y:821.0110018821615,w:260.10477861352956,h:47.77434709228095,scale:0.8847101313385362},
};
