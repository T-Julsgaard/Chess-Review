import {Chess} from '../../../../lib/chess.js';
const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const glyphs={K:'♔',Q:'♕',R:'♖',B:'♗',N:'♘',P:'♙',k:'♚',q:'♛',r:'♜',b:'♝',n:'♞',p:'♟'};
function board(fen) {
  let chess;try{chess=new Chess(fen);}catch{return '<p>Invalid position input; no board displayed.</p>';}
  return '<div class="board" role="img" aria-label="'+escape(fen)+'">'+chess.board().flatMap((row,rank)=>row.map((piece,file)=>
    '<div class="cell '+((rank+file)%2?'dark':'light')+'"><span>'+escape(piece?glyphs[piece.color==='w'?piece.type.toUpperCase():piece.type]:'')+'</span><small>'+String.fromCharCode(97+file)+(8-rank)+'</small></div>')).join('')+'</div>';
}
function liveRoot(fixture){try{const c=new Chess(fixture.history?.fen||fixture.fen);for(const move of fixture.history?.moves||[]){if(c.isGameOver())return false;c.move(move);}return!c.isGameOver();}catch{return false;}}
export function renderDemo(rows) {
  const cards=rows.filter(row=>!row.fixture.id.endsWith('-black')).map(({fixture,result,error})=>{
    const status=error?'Invalid or refused input':result.placementAnalysis?.status||result.foundationAnalysis?.status||'Parent compatibility';
    const rootLive=liveRoot(fixture),played=Boolean(result?.after)&&rootLive&&!['unavailable','rejected'].includes(result?.foundationAnalysis?.status);
    const fallback=!rootLive||result?.foundationAnalysis?.status==='unavailable'?'The input position is terminal; move coaching is unavailable.':status==='not-live'&&played?'The played position is terminal; no new placement comment.':'No new supported placement comment.';
    const summary={status,events:result?.events.map(event=>({id:event.id,text:event.text,qualityClaim:event.qualityClaim})),
      proofFile:'results.json',fixture:fixture.id};
    return '<article><h2>'+escape(fixture.id.replaceAll('-',' '))+'</h2><p>'+escape(status)+' · '+escape(fixture.move)+'</p><div class="positions"><section><h3>Input position</h3>'+board(fixture.fen)+'</section>'+
      (played?'<section><h3>Played position</h3>'+board(result.after)+'</section>':'')+'</div><p class="comment">'+escape(error||result?.comment||fallback)+'</p><details><summary>Concepts</summary><pre>'+escape(JSON.stringify(summary,null,2))+'</pre></details></article>';
  }).join('');
  return '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Coach placement research</title><style>body{font:16px/1.5 system-ui;background:#101720;color:#e5eaf3;margin:24px auto;max-width:1100px;padding:16px}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:20px}article{padding:18px;background:#182331;border-radius:12px}h2{font-size:20px}.positions{display:flex;gap:12px}.positions section{flex:1;min-width:0}.board{display:grid;grid-template-columns:repeat(8,1fr)}.cell{aspect-ratio:1;position:relative;display:grid;place-items:center;color:#111;font-size:clamp(18px,2.6vw,32px)}.light{background:#d1d5ce}.dark{background:#778c80}small{position:absolute;bottom:0;left:2px;font-size:9px}a{color:#83e1bc}.comment{padding:12px;background:#0e1924;border-left:3px solid #6dc9a6}pre{white-space:pre-wrap;overflow-wrap:anywhere;font-size:12px}</style><h1>Coach concepts</h1><p>A research prototype for comments grounded in legal moves. Constructed positions; no extension integration.</p><p><a href="results.json">Full canonical proofs</a> · <a href="concept-status.md">Occurrence tracker</a>. Unavailable or refused attempts acquire no new placement fact. Bishop placement does not establish a need for liberation; battery alignment does not establish a profitable joint threat.</p><main>'+cards+'</main></html>';
}
