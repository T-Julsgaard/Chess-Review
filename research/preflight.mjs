import {openResearchData} from './data-policy.mjs';

const args = process.argv.slice(2), ids = [];
let purpose = 'inspect', game;
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--purpose' && args[i + 1]) purpose = args[++i];
  else if (args[i] === '--game' && args[i + 1]) game = args[++i];
  else if (/^D\d{3}$/.test(args[i])) ids.push(args[i]);
  else throw Error('Usage: node research/preflight.mjs D001 [D002 ...] [--purpose inspect] [--game GAME_ID]');
}
const data = await openResearchData(ids, {purpose});
console.log(JSON.stringify(game ? data.gameOrigin(game, {current: true}) : {
  passed: true, policyVersion: data.receipt.policyVersion, purpose, registrySha256: data.receipt.registrySha256,
  datasets: Object.fromEntries(Object.entries(data.receipt.datasets).map(([id, d]) => [id, {
    games: d.gameCount, provenanceStatus: d.provenanceStatus, limitations: d.limitations,
  }])), artifactCount: Object.keys(data.receipt.inputHashes).length,
}, null, 2));
