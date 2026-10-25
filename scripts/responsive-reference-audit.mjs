import fs from 'node:fs/promises';
import path from 'node:path';
import {SCREEN_SIZES} from '../lib/viewport-preview.js';
export async function auditLearning({review,call,evaluate,waitFor,sleep,out}) {
 const run=s=>evaluate(review,s),results=[],failures=[];
 await run("document.querySelector('.learning-announcement-disable')?.click();import('./analysis.js').then(m=>{m.S.settings.moveAnim=false;m.S.settings.sound=false;})");
 const inspect=async(label,width,height,learning=false)=>{
  const data=await run(`(async()=>{const rect=n=>{const r=n.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom}};const b=document.querySelector('${learning?'.learning-embedded .board':'.stage .board'}');return {zoom:await chrome.tabs.getZoom(),scrollW:document.documentElement.scrollWidth,scrollH:document.documentElement.scrollHeight,board:rect(b),modules:[...document.querySelectorAll('.stage .mod')].filter(n=>!n.hidden&&getComputedStyle(n).display!=='none').map(n=>({key:n.dataset.mod,...rect(n)})),shell:document.querySelector('.learn-shell')?rect(document.querySelector('.learn-shell')):null,nav:document.querySelector('.learn-nav')?rect(document.querySelector('.learn-nav')):null,stacked:!!document.querySelector('.learn-stacked'),error:document.querySelector('#error').textContent};})()`);
  const check=(ok,msg)=>{if(!ok)failures.push({label,msg});};
  check(data.zoom===1,'browser zoom');check(!data.error,data.error);check(data.scrollW<=width+1,'horizontal overflow');check(Math.abs(data.board.w-data.board.h)<1,'square board');check(data.board.x>=-1&&data.board.right<=width+1,'board horizontal bounds');
  if(!learning&&width>=1100&&height>=600){check(data.scrollH<=height+1,'page height');
   const panels=data.modules.filter(b=>!['coach','evalbar'].includes(b.key));
   for(const [i,a]of panels.entries())for(const b of panels.slice(i+1))check(Math.min(a.right,b.right)-Math.max(a.x,b.x)<1||Math.min(a.bottom,b.bottom)-Math.max(a.y,b.y)<1,'overlap '+a.key+'/'+b.key);for(const box of data.modules)check(box.x>=-1&&box.right<=width+1&&box.y>=50&&box.bottom<=height+1&&box.w>0&&box.h>0,'module bounds '+box.key);}
  if(learning){check(data.shell.x>=-1&&data.shell.right<=width+1,'learning horizontal bounds');if(!data.stacked)check(data.board.y>=50&&data.board.bottom<=height+1,'learning board bounds');}
  const shot=await call('Page.captureScreenshot',{format:'png'},review.sessionId);await fs.writeFile(path.join(out,label+'.png'),Buffer.from(shot.data,'base64'));results.push({label,width,height,...data});
 };
 for(const [group,presets] of Object.entries({...SCREEN_SIZES,Rotated:[...SCREEN_SIZES.Tablet,...SCREEN_SIZES.Phone].map(([name,w,h])=>[name+' landscape',h,w]),Short:[['Short laptop',1280,480],['Short tablet',820,600],['Landscape phone',844,390],['Small landscape',568,320]]}))for(const [name,width,screenHeight]of presets){
  for(const chromeHeight of ['Desktop','Laptop'].includes(group)?[0,120,160]:[0]){
   const height=screenHeight-chromeHeight,label=name.replaceAll(' ','-').toLowerCase()+'-'+width+'x'+height;
   await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false},review.sessionId);await sleep(150);await run('scrollTo(0,0)');
   await inspect('review-'+label,width,height);
   await run("document.querySelector('[aria-label=Settings]').click()");
   for(const tab of ['Visual','Engine']){
    await run(`[...document.querySelectorAll('.set-tab')].find(n=>n.textContent==='${tab}').click()`);
    const overflow=await run("(()=>{const n=document.querySelector('#settings');return n.scrollWidth-n.clientWidth;})()");if(overflow>1)failures.push({label,msg:'settings '+tab+' overflow',overflow});
   }
   const settings=await run("(()=>{const n=document.querySelector('#settings'),r=n.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,overflow:n.scrollWidth-n.clientWidth};})()");if(settings.x<0||settings.right>width+1||settings.bottom>height+1||settings.overflow>1)failures.push({label,msg:'settings bounds',settings});
   await run("document.querySelector('[aria-label=Settings]').click();import('./analysis.js').then(m=>m.openLearning())");
   await inspect('learning-'+label,width,height,true);
   if([3840,1366,1024,390].includes(width)&&chromeHeight===0){
    for(const page of ['openings','concepts','statistics']){
     await run(`import('./analysis.js').then(m=>m.learningWorkspace.navigate('${page}'))`);
     await inspect('learning-'+page+'-'+label,width,height,true);
    }
    await run("import('./analysis.js').then(m=>m.learningWorkspace.navigate('puzzles'))");
   }
   if(width>=1100&&height>=600){
    const aligned=await run("(()=>{const r=document.querySelector('.learn-nav').getBoundingClientRect(),p=document.querySelector('.learn-shell').getBoundingClientRect(),b=document.querySelector('.learning-embedded .board').getBoundingClientRect(),top=document.querySelector('.topbar').getBoundingClientRect().bottom,right=Math.max(...[...document.querySelectorAll('.mod[data-mod=accuracy] > .mod-inner,.mod[data-mod=engine] > .mod-inner,.mod[data-mod=learn] > .mod-inner')].map(n=>n.getBoundingClientRect().right));return Math.abs(r.right-right)<1&&Math.abs(p.right-right)<1&&Math.abs(b.top-top-(innerHeight-b.bottom))<1;})()");
    if(!aligned)failures.push({label,msg:'learning right edge or vertical balance'});
   }
   await run("import('./analysis.js').then(async m=>{const w=m.learningWorkspace,p={id:'viewport-fit',fen:'7k/5Q2/6K1/8/8/8/8/8 w - - 0 1',solution:['f7f8'],rating:1200,themes:['mateIn1']};w.puzzles=[p];await w.startPuzzleSelection([p]);})");
   await inspect('puzzle-'+label,width,height,true);
   await run("import('./analysis.js').then(m=>m.learningWorkspace.close())");
  }
 }
 await fs.writeFile(path.join(out,'responsive-results.json'),JSON.stringify({results,failures},null,2));
 const gallery=results.map(r=>`<figure><a href="${r.label}.png"><img loading="lazy" src="${r.label}.png"></a><figcaption>${r.label} · browser 100%</figcaption></figure>`).join('');
 await fs.writeFile(path.join(out,'responsive-gallery.html'),`<!doctype html><meta charset="utf-8"><title>Reference layout audit</title><style>body{background:#191917;color:#eee;font:14px system-ui;padding:24px}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(360px,1fr));gap:24px}figure{margin:0}img{width:100%;max-height:440px;object-fit:contain;background:#111}figcaption{margin-top:8px}</style><h1>Reference layout · ${results.length} views</h1><main>${gallery}</main>`);
 console.log(JSON.stringify({out,views:results.length,failures},null,2));
 if(failures.length)throw Error('Responsive layout audit failed: '+failures.length+' checks');
}
