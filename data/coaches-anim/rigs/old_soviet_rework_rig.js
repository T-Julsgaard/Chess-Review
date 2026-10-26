(function(){
 // Preserve every animation frame, but avoid invalidating SVG for identical values.
 function attr(el,name,value){if(el.getAttribute(name)!==value)el.setAttribute(name,value); }
 var E={
  neutral:{bLY:0,bRY:0,bLR:0,bRR:0,sqL:.22,sqR:.22,mc:582,mt:581,mb:583,mw:30},
  happy:{bLY:-3,bRY:-3,bLR:-2,bRR:2,sqL:.10,sqR:.10,mc:576,mt:579,mb:593,mw:34},
  sad:{bLY:-1,bRY:-1,bLR:-8,bRR:8,sqL:.26,sqR:.26,mc:591,mt:589,mb:592,mw:27},
  angry:{bLY:4,bRY:4,bLR:10,bRR:-10,sqL:.40,sqR:.40,mc:588,mt:586,mb:589,mw:26},
  surprised:{bLY:-9,bRY:-9,bLR:0,bRR:0,sqL:0,sqR:0,mc:580,mt:569,mb:601,mw:23},
  skeptical:{bLY:3,bRY:-9,bLR:6,bRR:-2,sqL:.30,sqR:.06,mc:585,mt:583,mb:586,mw:28}
 };
 var cur=Object.assign({},E.neutral), tgt=Object.assign({},E.neutral), blink=0;
 var lidL=document.getElementById('lidL'),lidR=document.getElementById('lidR'),
     bL=document.getElementById('browL'),bR=document.getElementById('browR'),
     mouth=document.getElementById('mouth'),cup=document.getElementById('cupgroup');
 var eyeL=document.getElementById('eyeL'),eyeR=document.getElementById('eyeR'),
     headrig=document.getElementById('headrig'),torso=document.getElementById('torso');
 function lerp(a,b,t){return a+(b-a)*t;}
 var gx=0,gy=0,tgx=0,tgy=0,roll=null,GX=5,GY=4,talking=false;
 var LOOK={center:[0,0],left:[-1,0],right:[1,0],up:[0,-1],down:[0,1],upleft:[-1,-1],upright:[1,-1],downleft:[-1,1],downright:[1,1]};
 function setLook(dir){var v=LOOK[dir]||LOOK.center;tgx=v[0]*GX;tgy=v[1]*GY;roll=null;}
 function look(dir){interruptIdle(1800);setLook(dir);}
 function eyeRoll(){interruptIdle(1400);var t0=performance.now(),dur=1100;roll=function(now){var p=(now-t0)/dur;if(p>=1){roll=null;tgx=0;tgy=0;return;}var a=-Math.PI/2+p*Math.PI*2;tgx=Math.cos(a)*GX;tgy=Math.sin(a)*GY;};}
 function talk(v){talking=(v===undefined)?!talking:!!v;if(talking)interruptIdle(1800);var b=document.getElementById('c-talk');if(b)b.classList.toggle('on',talking);}
 function gest(el,dur,fn){if(!el)return;el._t=(el._t||0)+1;var id=el._t,t0=performance.now();(function s(){if(el._t!==id)return;var p=Math.min(1,(performance.now()-t0)/dur);attr(el,'transform',fn(p));if(p<1)requestAnimationFrame(s);else el.removeAttribute('transform');})();}
 function nod(){interruptIdle(1100);gest(headrig,820,function(p){return 'translate(0 '+(Math.sin(p*Math.PI)*4).toFixed(2)+')';});}
 function shake(){interruptIdle(1100);gest(headrig,820,function(p){return 'rotate('+(Math.sin(p*Math.PI*4)*(1-p)*6).toFixed(2)+' 340 600)';});}
 function shrug(){interruptIdle(1100);gest(torso,760,function(p){return 'translate(0 '+(-Math.sin(p*Math.PI)*11).toFixed(2)+')';});gest(headrig,760,function(p){return 'translate(0 '+(Math.sin(p*Math.PI)*4).toFixed(2)+')';});}

 // Sparse keyframes return to the current review expression, never a hard-coded neutral face.
 // A single owner renders these vignettes; review gestures and narration can interrupt at any time.
 var cuprig=document.getElementById('cuprig'),moustache=document.getElementById('moustache');
 var motion=window.matchMedia?window.matchMedia('(prefers-reduced-motion: reduce)'):null;
 var idle=null,lastIdle=null,busyUntil=0;
 var IDLES={
  sip:{duration:4600,weight:35,frames:[
   [0,{}],[.22,{cupY:-82,cupR:-3,gazeY:3,sqL:.45,sqR:.45,mw:13}],
   [.58,{cupY:-82,cupR:-6,sqL:.65,sqR:.65,mw:11}],
   [.78,{cupY:-25,cupR:-1,sqL:.35,sqR:.35,mc:578,mb:588}],[1,{}]]},
  ponder:{duration:4800,weight:37,frames:[
   [0,{}],[.22,{headR:-1.2,gazeX:-4,gazeY:4,bLY:3,bRY:-7,sqL:.6,sqR:.25}],
   [.62,{headR:-1.2,gazeX:3,gazeY:3,bLY:3,bRY:-7,sqL:.6,sqR:.25}],
   [.80,{bLY:-3,bRY:-3,mc:578,mb:587}],[1,{}]]},
  whistle:{duration:3800,weight:10,frames:[
   [0,{}],[.15,{headR:-1.5,gazeX:-5,gazeY:1,mc:584,mt:573,mb:595,mw:8}],
   [.35,{headR:1.5,gazeX:5,gazeY:1,mc:584,mt:573,mb:595,mw:8}],
   [.55,{headR:1.5,gazeX:5,gazeY:1,mc:584,mt:573,mb:595,mw:8}],
   [.72,{headR:-1.5,gazeX:-5,gazeY:1,mc:584,mt:573,mb:595,mw:8}],
   [.86,{headR:-1.5,gazeX:-5,gazeY:1,mc:584,mt:573,mb:595,mw:8}],[1,{}]]},
  chuckle:{duration:2600,weight:10,frames:[
   [0,{}],[.22,{sqL:.65,sqR:.65,mc:575,mt:579,mb:598,mw:33}],
   [.72,{sqL:.65,sqR:.65,mc:575,mt:579,mb:598,mw:33}],[1,{}]]},
  wink:{duration:1800,weight:6,frames:[
   [0,{}],[.24,{bLY:-4,bRY:-2,sqL:.12,mc:578,mb:589}],
   [.40,{bLY:-4,bRY:-2,sqL:.12,sqR:1,mc:578,mb:589}],
   [.57,{bLY:-4,bRY:-2,sqL:.12,sqR:1,mc:578,mb:589}],
   [.72,{bLY:-3,bRY:-2,sqL:.12,mc:578,mb:589}],[1,{}]]},
  doze:{duration:6800,weight:2,frames:[
   [0,{}],[.24,{headY:9,headR:3,sqL:.8,sqR:.8,bLY:2,bRY:2,gazeY:4}],
   [.50,{headY:17,headR:5,sqL:1,sqR:1,bLY:3,bRY:3,gazeY:4}],
   [.67,{headY:19,headR:6,sqL:1,sqR:1,bLY:3,bRY:3,gazeY:4}],
   [.73,{headY:-6,headR:-2,sqL:0,sqR:0,bLY:-9,bRY:-9,mt:571,mb:595,mw:18}],
   [.84,{headR:-3,gazeX:-5,bLY:-2,bRY:-5,sqL:.15,sqR:.15}],[1,{}]]}
 };
 function finishIdle(){
  if(!idle)return;
  var button=document.getElementById('c-'+idle.name);if(button)button.classList.remove('on');
  idle=null;tgx=0;tgy=0;
  [headrig,torso,cuprig,moustache].forEach(function(el){if(el)el.removeAttribute('transform');});
 }
 function interruptIdle(hold){finishIdle();busyUntil=performance.now()+hold;}
 function canIdle(){return !talking&&!raised&&!roll&&!document.hidden&&!(motion&&motion.matches)&&performance.now()>=busyUntil;}
 function startIdle(name){
  if(!IDLES[name]||idle||!canIdle())return false;
  idle={name:name,start:performance.now()};lastIdle=name;roll=null;
  var button=document.getElementById('c-'+name);if(button)button.classList.add('on');
  return true;
 }
 function whistle(){return startIdle('whistle');}
 function sip(){return startIdle('sip');}
 function ponder(){return startIdle('ponder');}
 function chuckle(){return startIdle('chuckle');}
 function wink(){return startIdle('wink');}
 function doze(){return startIdle('doze');}
 function randomIdle(){
  if(idle||!canIdle()||window.coachPointerGaze)return;
  var names=Object.keys(IDLES).filter(function(n){return n!==lastIdle;});
  var total=names.reduce(function(sum,n){return sum+IDLES[n].weight;},0),r=Math.random()*total;
  for(var i=0;i<names.length;i++){r-=IDLES[names[i]].weight;if(r<0){startIdle(names[i]);break;}}
 }
 function ambient(){
  if(idle||!canIdle()||window.coachPointerGaze)return;
  var dirs=['left','right','up','downleft','center','center'];
  setLook(dirs[Math.floor(Math.random()*dirs.length)]);
 }
 function idlePose(now){
  if(!idle)return null;
  if(!canIdle()||window.coachPointerGaze){finishIdle();return null;}
  var spec=IDLES[idle.name],p=(now-idle.start)/spec.duration;
  if(p>=1){finishIdle();return null;}
  var frames=spec.frames,index=1;
  while(index<frames.length-1&&p>frames[index][0])index++;
  var a=frames[index-1],b=frames[index],t=(p-a[0])/(b[0]-a[0]);t=t*t*(3-2*t);
  var base=Object.assign({headY:0,headR:0,torsoY:0,cupY:0,cupR:0,moustacheY:0,gazeX:0,gazeY:0},tgt),pose={};
  Object.keys(base).forEach(function(k){pose[k]=lerp(a[1][k]===undefined?base[k]:a[1][k],b[1][k]===undefined?base[k]:b[1][k],t);});
  if(idle.name==='chuckle'){
   var pulse=Math.sin(p*Math.PI*8)*Math.pow(Math.sin(p*Math.PI),2);
   pose.torsoY=-Math.abs(pulse)*3;pose.moustacheY=-Math.abs(pulse)*2;
  }
  attr(headrig,'transform','translate(0 '+pose.headY.toFixed(2)+') rotate('+pose.headR.toFixed(2)+' 340 600)');
  attr(torso,'transform','translate(0 '+pose.torsoY.toFixed(2)+')');
  attr(cuprig,'transform','translate(0 '+pose.cupY.toFixed(2)+') rotate('+pose.cupR.toFixed(2)+' 348 666)');
  attr(moustache,'transform','translate(0 '+pose.moustacheY.toFixed(2)+')');
  tgx=pose.gazeX;tgy=pose.gazeY;
  return pose;
 }
 function apply(){
  var k=['bLY','bRY','bLR','bRR','sqL','sqR','mc','mt','mb','mw'],i;
  var eff=idlePose(performance.now())||tgt;
  for(i=0;i<k.length;i++){cur[k[i]]=lerp(cur[k[i]],eff[k[i]],.16);}
  if(roll)roll(performance.now());
  var gaze=window.coachPointerGaze;
  gx=lerp(gx,gaze?gaze.x*GX:tgx,gaze?0.18:roll?0.5:0.18);gy=lerp(gy,gaze?gaze.y*GY:tgy,gaze?0.18:roll?0.5:0.18);
  if(eyeL)attr(eyeL,'transform','translate('+gx.toFixed(2)+' '+gy.toFixed(2)+')');
  if(eyeR)attr(eyeR,'transform','translate('+gx.toFixed(2)+' '+gy.toFixed(2)+')');
  var sL=Math.max(cur.sqL,blink), sR=Math.max(cur.sqR,blink);
  attr(lidL,'transform','translate(300 412) scale(1 '+sL.toFixed(3)+') translate(-300 -412)');
  attr(lidR,'transform','translate(380 412) scale(1 '+sR.toFixed(3)+') translate(-380 -412)');
  attr(bL,'transform','translate(0 '+cur.bLY.toFixed(2)+') rotate('+cur.bLR.toFixed(2)+' 298 398)');
  attr(bR,'transform','translate(0 '+cur.bRY.toFixed(2)+') rotate('+cur.bRR.toFixed(2)+' 382 398)');
  var mt=cur.mt,mb=cur.mb,mw=cur.mw;
  if(idle&&idle.name==='whistle'){var wt=performance.now()*0.001,o=Math.sin(wt*7)*1.6;mt-=o;mb+=o;}
  else if(talking){var tt=performance.now()*0.001;var o2=(Math.sin(tt*15)*0.5+0.5)*(0.55+0.45*Math.sin(tt*5.7));mt=cur.mt-o2*5;mb=cur.mb+o2*10;mw=cur.mw+o2*2;}
  var x0=(340-mw),x1=(340+mw);
  attr(mouth,'d','M'+x0.toFixed(1)+' '+cur.mc.toFixed(1)+' Q340 '+mt.toFixed(1)+' '+x1.toFixed(1)+' '+cur.mc.toFixed(1)+' Q340 '+mb.toFixed(1)+' '+x0.toFixed(1)+' '+cur.mc.toFixed(1)+' Z');
  requestAnimationFrame(apply);
 }
 apply();
 function doBlink(){var t0=performance.now();(function s(){var e=performance.now()-t0,v=0;if(e<80)v=e/80;else if(e<180)v=1-(e-80)/100;blink=Math.max(0,Math.min(1,v));if(e<180)requestAnimationFrame(s);else blink=0;})();}
 (function loop(){setTimeout(function(){doBlink();loop();},2400+Math.random()*2200);})();
 // A quiet pause between vignettes; the wink and doze are deliberately much rarer than tea.
 (function idleLoop(){setTimeout(function(){randomIdle();idleLoop();},22000+Math.random()*20000);})();
 if(motion&&motion.addEventListener)motion.addEventListener('change',function(){if(motion.matches)finishIdle();});
 document.addEventListener('visibilitychange',function(){if(document.hidden)finishIdle();});
 function setEmotion(n){if(!E[n])return;interruptIdle(1800);tgt=Object.assign({},E[n]);
  var b=document.querySelectorAll('.coach-ctrl [data-emo]');for(var i=0;i<b.length;i++)b[i].classList.toggle('on',b[i].getAttribute('data-emo')===n);}
 var raised=false; function raiseCup(v){interruptIdle(1800);raised=(v===undefined)?!raised:v;cup.classList.toggle('raised',raised);document.getElementById('c-raise').classList.toggle('on',raised);}
 var cyc=null,order=['neutral','happy','skeptical','angry','sad','surprised'],ci=0;
 function startCycle(){if(cyc)return;document.getElementById('c-cycle').textContent='Auto-cycle: on';document.getElementById('c-cycle').classList.add('on');cyc=setInterval(function(){ci=(ci+1)%order.length;setEmotion(order[ci]);},2500);}
 function stopCycle(){if(cyc){clearInterval(cyc);cyc=null;}document.getElementById('c-cycle').textContent='Auto-cycle: off';document.getElementById('c-cycle').classList.remove('on');}
 var ee=document.querySelectorAll('.coach-ctrl [data-emo]');for(var i=0;i<ee.length;i++){ee[i].addEventListener('click',function(){stopCycle();setEmotion(this.getAttribute('data-emo'));});}
 document.getElementById('c-raise').addEventListener('click',function(){raiseCup();});
 document.getElementById('c-cycle').addEventListener('click',function(){cyc?stopCycle():startCycle();});
 var lk=document.querySelectorAll('.coach-ctrl [data-look]');for(var li=0;li<lk.length;li++){lk[li].addEventListener('click',function(){look(this.getAttribute('data-look'));});}
 function on(id,fn){var b=document.getElementById(id);if(b)b.addEventListener('click',fn);}
 on('c-talk',function(){talk();});on('c-roll',function(){eyeRoll();});on('c-nod',nod);on('c-shake',shake);on('c-shrug',shrug);on('c-whistle',whistle);
 on('c-sip',sip);on('c-ponder',ponder);on('c-chuckle',chuckle);on('c-wink',wink);on('c-doze',doze);
 window.coach={setEmotion:setEmotion,raiseCup:raiseCup,startCycle:startCycle,stopCycle:stopCycle,talk:talk,look:look,eyeRoll:eyeRoll,nod:nod,shake:shake,shrug:shrug,whistle:whistle,sip:sip,ponder:ponder,chuckle:chuckle,wink:wink,doze:doze,emotions:E};
 window.addEventListener('message',function(ev){var d=ev.data||{};switch(d.coachCmd){case 'emotion':setEmotion(d.value);break;case 'cycleStart':startCycle();break;case 'cycleStop':stopCycle();break;case 'raise':raiseCup(d.value);break;case 'talk':talk(d.value);break;case 'look':look(d.value);break;case 'eyeRoll':eyeRoll();break;case 'nod':nod();break;case 'shake':shake();break;case 'shrug':shrug();break;case 'ambient':ambient();break;case 'whistle':whistle();break;case 'sip':sip();break;case 'ponder':ponder();break;case 'chuckle':chuckle();break;case 'wink':wink();break;case 'doze':doze();break;}});
})();
