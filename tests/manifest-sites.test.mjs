import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

// Chrome disables an updated extension until the user approves any new site it can read,
// and Firefox prompts too. Adding a site here loses every user who doesn't click "accept",
// so a change to this list must be a deliberate decision (or use optional permissions).
const SITES = ['https://api.chess.com/*', 'https://www.chess.com/*', 'https://chess.com/*', 'https://lichess.org/*'];

test('the manifest reaches no site beyond Chess.com and Lichess', async () => {
  const manifest = JSON.parse(await readFile(new URL('../manifest.json', import.meta.url), 'utf8'));
  assert.deepEqual([...manifest.host_permissions].sort(), [...SITES].sort());
  for (const script of manifest.content_scripts) for (const match of script.matches)
    assert.ok(SITES.includes(match), `content script ${script.js.join(', ')} adds a new site: ${match}`);
  for (const entry of manifest.web_accessible_resources || []) for (const match of entry.matches)
    assert.ok(SITES.includes(match), `web-accessible resources add a new site: ${match}`);
  assert.deepEqual([...manifest.permissions].sort(), ['activeTab', 'offscreen', 'storage', 'unlimitedStorage']);
});
