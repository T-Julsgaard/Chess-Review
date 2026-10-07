import {renderDemo as frozenDemo} from '../../E020-coach-concepts/code/demo.mjs';

// Canonical certificates live in results.json. Cards retain the teaching facts
// and highlights without serializing every parent certificate a second time.
export function renderDemo(rows){
 const display=rows.map(row=>row.result?{...row,result:{schema:row.result.schema,san:row.result.san,after:row.result.after,comment:row.result.comment,
  events:row.result.events.map(event=>{
   const e=event.evidence,unit=e.attacker||e.played?.to;
   const attacker=typeof unit==='object'?unit.square:unit;
   const targets=e.targets||[e.enemyKing||e.target].filter(Boolean).map(p=>typeof p==='string'?{square:p}:p);
   return{id:event.id,text:event.text,qualityClaim:event.qualityClaim,evidence:{attacker:attacker||null,targets,
    certificateFile:'results.json',mechanism:e.mechanism?.kind,legalEnemyEvasions:e.evasions?.length,terminal:e.terminal}};
  })}}:row);
 return frozenDemo(display).replace('<nav aria-label="Filter examples">','<p><a href="results.json">Full canonical certificates and every legal reply</a></p><nav aria-label="Filter examples">')
  .replace('Expand evidence to inspect every defender reply and capture witness.','Cards show summaries; full certificates, defender replies and capture witnesses are linked in results.json.');
}
