import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {Chess} from '../../lib/chess.js';
// Generated SQL goes to an ignored directory and is imported only into D1.
const {puzzles}=JSON.parse(await readFile(new URL('../../data/learning/puzzles.json',import.meta.url),'utf8'));
const quote=value=>"'"+String(value).replaceAll("'","''")+"'";
// Prove the catalog once at import time so the service can cheaply match complete
// canonical lines. The live service still checks deviations for legal mates.
for(const puzzle of puzzles){
  if(!puzzle.id||!Number.isInteger(puzzle.rating)||!Array.isArray(puzzle.solution)||!puzzle.solution.length||puzzle.solution.length%2!==1)throw Error('Invalid puzzle: '+puzzle.id);
  const chess=new Chess(puzzle.fen);
  for(const move of puzzle.solution)chess.move({from:move.slice(0,2),to:move.slice(2,4),promotion:move[4]});
}
const directory=new URL('../../scratch/leaderboard/',import.meta.url);await mkdir(directory,{recursive:true});
// Small files stay below D1 SQL import limits and avoid a single huge query.
for(let offset=0;offset<puzzles.length;offset+=500){
  const output=new URL(`puzzles-${String(offset/500).padStart(3,'0')}.sql`,directory);
  const sql=puzzles.slice(offset,offset+500).map(p=>`INSERT OR IGNORE INTO puzzles(id,rating,fen,solution) VALUES (${[p.id,p.rating,p.fen,JSON.stringify(p.solution)].map(quote).join(',')});`).join('\n');
  await writeFile(output,sql+'\n');
}
console.log(`Exported ${puzzles.length} puzzles to ${fileURLToPath(directory)}. Import each SQL file using wrangler d1 execute.`);
