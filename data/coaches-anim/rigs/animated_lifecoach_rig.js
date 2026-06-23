(function(){
 function gid(id){return document.getElementById(id);}
 var E={
  neutral:{bLY:0,bRY:0,bLR:-2,bRR:2,sqL:.12,sqR:.12,mc:336,mt:334,mb:341,mw:22},
  happy:{bLY:-3,bRY:-3,bLR:-3,bRR:3,sqL:.20,sqR:.20,mc:331,mt:334,mb:349,mw:26},
  sad:{bLY:-1,bRY:-1,bLR:-8,bRR:8,sqL:.16,sqR:.16,mc:344,mt:342,mb:345,mw:18},
  angry:{bLY:4,bRY:4,bLR:8,bRR:-8,sqL:.26,sqR:.26,mc:342,mt:340,mb:343,mw:18},
  surprised:{bLY:-10,bRY:-10,bLR:0,bRR:0,sqL:0,sqR:0,mc:337,mt:327,mb:350,mw:14},
  skeptical:{bLY:3,bRY:-9,bLR:5,bRR:-2,sqL:.20,sqR:.04,mc:339,mt:337,mb:341,mw:20}
 };
 var cur=Object.assign({},E.neutral),tgt=Object.assign({},E.neutral),blink=0;
 var lidL=gid('lidL'),lidR=gid('lidR'),bL=gid('browL'),bR=gid('browR'),
     mouth=gid('mouth'),eyeL=gid('eyeL'),eyeR=gid('eyeR'),
     headrig=gid('headrig'),torso=gid('torso'),journal=gid('journal');
 function lerp(a,b,t){return a+(b-a)*t;}

 // ---- gaze ----
 var gx=0,gy=0,tgx=0,tgy=0,roll=null,GX=5,GY=3.5,talking=false;
 var LOOK={center:[0,0],left:[-1,0],right:[1,0],up:[0,-1],down:[0,1],upleft:[-1,-1],upright:[1,-1],downleft:[-1,1],downright:[1,1]};
 function look(dir){var v=LOOK[dir]||LOOK.center;tgx=v[0]*GX;tgy=v[1]*GY;roll=null;}
 function eyeRoll(){var t0=performance.now(),dur=1100;roll=function(now){var p=(now-t0)/dur;if(p>=1){roll=null;tgx=0;tgy=0;return;}var a=-Math.PI/2+p*Math.PI*2;tgx=Math.cos(a)*GX;tgy=Math.sin(a)*GY;};}
 function talk(v){talking=(v===undefined)?!talking:!!v;var b=gid('l-talk');if(b)b.classList.toggle('on',talking);}

 // ---- journal open/close (open = two-page spread, she looks down into it) ----
 var jopen=false;
 function openJournal(v){
  jopen=(v===undefined)?!jopen:!!v;
  journal.classList.toggle('jrn-open',jopen);
  var b=gid('l-journal');if(b){b.classList.toggle('on',jopen);b.textContent=jopen?'Close journal':'Open journal';}
  if(jopen){tgx=0;tgy=GY;}else{tgx=0;tgy=0;}
 }

 // ---- gestures ----
 function gest(el,dur,fn){if(!el)return;el._t=(el._t||0)+1;var id=el._t,t0=performance.now();(function s(){if(el._t!==id)return;var p=Math.min(1,(performance.now()-t0)/dur);el.setAttribute('transform',fn(p));if(p<1)requestAnimationFrame(s);else el.removeAttribute('transform');})();}
 function nod(){gest(headrig,840,function(p){return 'translate(0 '+(Math.sin(p*Math.PI*4)*(1-p)*7).toFixed(2)+')';});}
 function shake(){gest(headrig,840,function(p){return 'rotate('+(Math.sin(p*Math.PI*4)*(1-p)*5).toFixed(2)+' 340 370)';});}
 function shrug(){gest(torso,780,function(p){return 'translate(0 '+(-Math.sin(p*Math.PI)*9).toFixed(2)+')';});gest(headrig,780,function(p){return 'translate(0 '+(Math.sin(p*Math.PI)*3.5).toFixed(2)+')';});}

 function apply(){
  var k=['bLY','bRY','bLR','bRR','sqL','sqR','mc','mt','mb','mw'],i;
  for(i=0;i<k.length;i++){cur[k[i]]=lerp(cur[k[i]],tgt[k[i]],.16);}
  if(roll)roll(performance.now());
  gx=lerp(gx,tgx,roll?0.5:0.18);gy=lerp(gy,tgy,roll?0.5:0.18);
  if(eyeL)eyeL.setAttribute('transform','translate('+gx.toFixed(2)+' '+gy.toFixed(2)+')');
  if(eyeR)eyeR.setAttribute('transform','translate('+gx.toFixed(2)+' '+gy.toFixed(2)+')');
  var sL=Math.max(cur.sqL,blink),sR=Math.max(cur.sqR,blink);
  lidL.setAttribute('transform','translate(306 262) scale(1 '+sL.toFixed(3)+') translate(-306 -262)');
  lidR.setAttribute('transform','translate(374 262) scale(1 '+sR.toFixed(3)+') translate(-374 -262)');
  bL.setAttribute('transform','translate(0 '+cur.bLY.toFixed(2)+') rotate('+cur.bLR.toFixed(2)+' 306 244)');
  bR.setAttribute('transform','translate(0 '+cur.bRY.toFixed(2)+') rotate('+cur.bRR.toFixed(2)+' 374 244)');
  var mt=cur.mt,mb=cur.mb,mw=cur.mw;
  if(talking){var tt=performance.now()*0.001;var o=(Math.sin(tt*15)*0.5+0.5)*(0.55+0.45*Math.sin(tt*5.7));mt=cur.mt-o*5;mb=cur.mb+o*9;mw=cur.mw+o*1.5;}
  var x0=(340-mw),x1=(340+mw);
  mouth.setAttribute('d','M'+x0.toFixed(1)+' '+cur.mc.toFixed(1)+' Q340 '+mt.toFixed(1)+' '+x1.toFixed(1)+' '+cur.mc.toFixed(1)+' Q340 '+mb.toFixed(1)+' '+x0.toFixed(1)+' '+cur.mc.toFixed(1)+' Z');
  requestAnimationFrame(apply);
 }
 apply();
 function doBlink(){var t0=performance.now();(function s(){var e=performance.now()-t0,v=0;if(e<80)v=e/80;else if(e<180)v=1-(e-80)/100;blink=Math.max(0,Math.min(1,v));if(e<180)requestAnimationFrame(s);else blink=0;})();}
 (function loop(){setTimeout(function(){doBlink();loop();},2700+Math.random()*2400);})();
 function setEmotion(n){if(!E[n])return;tgt=Object.assign({},E[n]);var b=document.querySelectorAll('.coach-ctrl [data-emo]');for(var i=0;i<b.length;i++)b[i].classList.toggle('on',b[i].getAttribute('data-emo')===n);}
 // prop action = opening/closing the journal
 function raiseCup(v){openJournal(v);}
 var cyc=null,order=['neutral','happy','skeptical','angry','sad','surprised'],ci=0;
 function startCycle(){if(cyc)return;var c=gid('l-cycle');if(c){c.textContent='Auto-cycle: on';c.classList.add('on');}cyc=setInterval(function(){ci=(ci+1)%order.length;setEmotion(order[ci]);},2500);}
 function stopCycle(){if(cyc){clearInterval(cyc);cyc=null;}var c=gid('l-cycle');if(c){c.textContent='Auto-cycle: off';c.classList.remove('on');}}
 var ee=document.querySelectorAll('.coach-ctrl [data-emo]');for(var i=0;i<ee.length;i++){ee[i].addEventListener('click',function(){stopCycle();setEmotion(this.getAttribute('data-emo'));});}
 var lk=document.querySelectorAll('.coach-ctrl [data-look]');for(i=0;i<lk.length;i++){lk[i].addEventListener('click',function(){look(this.getAttribute('data-look'));});}
 function on(id,fn){var b=gid(id);if(b)b.addEventListener('click',fn);}
 on('l-cycle',function(){cyc?stopCycle():startCycle();});
 on('l-talk',function(){talk();});
 on('l-roll',function(){eyeRoll();});
 on('l-nod',nod);on('l-shake',shake);on('l-shrug',shrug);
 on('l-journal',function(){openJournal();});
 window.coach={setEmotion:setEmotion,raiseCup:raiseCup,openJournal:openJournal,
  startCycle:startCycle,stopCycle:stopCycle,talk:talk,look:look,eyeRoll:eyeRoll,nod:nod,shake:shake,shrug:shrug,emotions:E};
 window.addEventListener('message',function(ev){var d=ev.data||{};switch(d.coachCmd){
   case 'emotion':setEmotion(d.value);break;case 'cycleStart':startCycle();break;case 'cycleStop':stopCycle();break;
   case 'raise':raiseCup(d.value);break;case 'openJournal':openJournal(d.value);break;
   case 'talk':talk(d.value);break;case 'look':look(d.value);break;
   case 'eyeRoll':eyeRoll();break;case 'nod':nod();break;case 'shake':shake();break;case 'shrug':shrug();break;}});
})();
