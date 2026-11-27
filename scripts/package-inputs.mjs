export const files = ['analysis.html', 'analysis.js', 'analyze-flow.js', 'background.js',
  'browser-compat.js', 'release-settings.js', 'screen-preview.html', 'chesscom.js', 'content.js', 'content-button.css', 'flags.js', 'gamecache.js',
  'lichess-content.js', 'lichess.js', 'button-preview-content.js', 'preview.html', 'preview.js', 'move-grades.js', 'popup.html', 'popup.js', 'styles.css',
  'LICENSE', 'ATTRIBUTIONS.md', 'THIRD_PARTY_NOTICES.md', 'PRIVACY.md', 'README.md', 'RELEASE.md'];
export const directories = ['backgrounds', 'data', 'engine', 'flags', 'fonts', 'icons', 'lib', 'pieces-img', 'sounds'];
export const pieceSets = ['cburnett', 'merida'];

// Ignore rules do not apply to fs.cp. Exclude local credentials even if somebody
// later puts them under an otherwise allowlisted source/assets directory.
export function privatePackagePath(relative) {
  return relative.replaceAll('\\','/').split('/').some(part=>
    /^(?:\.env(?:\..*)?|\.dev\.vars(?:\..*)?|\.wrangler|\.git|\.aws|\.codex|\.agents|\.npmrc|\.netrc)$/i.test(part)
    || /\.(?:pem|key|p12|pfx)$/i.test(part));
}

export const extensionEntries = [...files, 'manifest.json',
  ...directories.flatMap(directory => directory === 'pieces-img'
    ? pieceSets.map(set => directory + '/' + set) : [directory])];
