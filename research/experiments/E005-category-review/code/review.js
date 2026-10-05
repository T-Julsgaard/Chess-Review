(() => {
  'use strict';
  const pack=JSON.parse(document.getElementById('pack').textContent),fields=['consequence','exceptional','confidence','usefulness','reason'];
  const $=id=>document.getElementById(id),key='ChessReview.E005.'+pack.packId;
  let state={schema:'E005-human-review-v1',packId:pack.packId,rubric:pack.rubric,reviewer:'',reviews:{},index:0},after=false,flipped=false,storageAvailable=true;
  try{const saved=JSON.parse(localStorage.getItem(key));if(saved&&saved.packId===pack.packId&&saved.schema===state.schema&&saved.reviews&&typeof saved.reviews==='object')state=saved;}catch{storageAvailable=false;}
  if(!Number.isInteger(state.index)||state.index<0||state.index>=pack.cases.length)state.index=0;
  const symbols={p:'♟',n:'♞',b:'♝',r:'♜',q:'♛',k:'♚',P:'♙',N:'♘',B:'♗',R:'♖',Q:'♕',K:'♔'};
  function board(){
    const item=pack.cases[state.index],fen=after?item.after:item.before,rows=fen.split(' ')[0].split('/');
    const pieces=[];for(const row of rows){const expanded=[];for(const c of row)if(/[1-8]/.test(c))expanded.push(...Array(Number(c)).fill(null));else expanded.push(c);pieces.push(expanded);}
    $('board').replaceChildren();
    for(let r=0;r<8;r++)for(let f=0;f<8;f++){
      const rank=flipped?r:7-r,file=flipped?7-f:f,square=String.fromCharCode(97+file)+(rank+1),piece=pieces[7-rank][file],el=document.createElement('div');
      el.className='square '+((file+rank)%2?'light':'dark')+(square===item.from||square===item.to?' focal':'')+(piece?(piece===piece.toUpperCase()?' whitepiece':' blackpiece'):'');
      el.textContent=piece?symbols[piece]:'';el.setAttribute('aria-label',square+(piece?' '+(piece===piece.toUpperCase()?'white ':'black ')+({p:'pawn',n:'knight',b:'bishop',r:'rook',q:'queen',k:'king'}[piece.toLowerCase()]):' empty'));
      const coord=document.createElement('span');coord.className='coordinate';coord.textContent=square;el.append(coord);$('board').append(el);
    }
    $('fen').textContent=fen;$('turn').textContent=(after?'After':'Before')+' '+item.san+' · '+(fen.split(' ')[1]==='w'?'White':'Black')+' to move';
    $('before').classList.toggle('active',!after);$('after').classList.toggle('active',after);
  }
  function progress(){const n=Object.values(state.reviews).filter(r=>r.consequence&&r.exceptional&&r.confidence&&r.usefulness&&r.reason.trim()).length;$('progress').textContent=n+' / '+pack.cases.length+' fully assessed';}
  function save(){try{localStorage.setItem(key,JSON.stringify(state));storageAvailable=true;}catch{storageAvailable=false;}$('status').textContent=storageAvailable?'Saved locally. Export a copy when ready.':'Local storage unavailable. Export before closing.';progress();}
  function render(){const item=pack.cases[state.index],review=state.reviews[item.caseId]||{};fields.forEach(f=>$(f).value=review[f]||'');$('reviewer').value=state.reviewer||'';$('case').value=String(state.index);$('heading').textContent='Case '+(state.index+1)+' · '+(item.color==='w'?'White':'Black')+' played '+item.san;
    $('history').textContent=item.history.length?item.history.map((san,i)=>(i%2===0?(Math.floor(i/2)+1)+'. ':'')+san).join(' '):'Starting position';$('previous').disabled=state.index===0;$('next').disabled=state.index===pack.cases.length-1;board();progress();}
  function record(){const id=pack.cases[state.index].caseId;state.reviews[id]={caseId:id,...Object.fromEntries(fields.map(f=>[f,$(f).value])),updatedAt:new Date().toISOString()};state.reviewer=$('reviewer').value;save();}
  pack.cases.forEach((c,i)=>{const option=document.createElement('option');option.value=String(i);option.textContent='Case '+(i+1);$('case').append(option);});
  fields.forEach(f=>$(f).addEventListener('input',record));$('reviewer').addEventListener('input',()=>{state.reviewer=$('reviewer').value;save();});
  function navigate(index){state.index=index;after=false;render();save();}
  $('case').addEventListener('change',()=>navigate(Number($('case').value)));$('previous').addEventListener('click',()=>navigate(Math.max(0,state.index-1)));$('next').addEventListener('click',()=>navigate(Math.min(pack.cases.length-1,state.index+1)));
  $('before').addEventListener('click',()=>{after=false;board();});$('after').addEventListener('click',()=>{after=true;board();});$('flip').addEventListener('click',()=>{flipped=!flipped;board();});
  $('export').addEventListener('click',()=>{const result={...state,exportedAt:new Date().toISOString(),caseIds:pack.cases.map(c=>c.caseId)};delete result.index;
    const blob=new Blob([JSON.stringify(result,null,2)+'\n'],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='chess-review-E005-'+pack.packId.slice(0,8)+'.json';a.click();URL.revokeObjectURL(url);$('status').textContent='Exported review file; keep it for later assessment.';});
  render();if(!storageAvailable)$('status').textContent='Local storage unavailable. Export before closing.';
})();
