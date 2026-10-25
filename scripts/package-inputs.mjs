export const files = ['analysis.html', 'analysis.js', 'analyze-flow.js', 'background.js',
  'browser-compat.js', 'release-settings.js', 'screen-preview.html', 'chesscom.js', 'content.js', 'content-button.css', 'flags.js', 'gamecache.js',
  'lichess-content.js', 'lichess.js', 'move-grades.js', 'popup.html', 'popup.js', 'styles.css',
  'LICENSE', 'ATTRIBUTIONS.md', 'THIRD_PARTY_NOTICES.md', 'PRIVACY.md', 'README.md', 'RELEASE.md'];
export const directories = ['backgrounds', 'data', 'engine', 'flags', 'fonts', 'icons', 'lib', 'pieces-img', 'sounds'];
export const pieceSets = ['cburnett', 'merida'];

export const extensionEntries = [...files, 'manifest.json',
  ...directories.flatMap(directory => directory === 'pieces-img'
    ? pieceSets.map(set => directory + '/' + set) : [directory])];
