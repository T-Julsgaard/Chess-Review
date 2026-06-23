(function(){
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
 function look(dir){var v=LOOK[dir]||LOOK.center;tgx=v[0]*GX;tgy=v[1]*GY;roll=null;}
 function eyeRoll(){var t0=performance.now(),dur=1100;roll=function(now){var p=(now-t0)/dur;if(p>=1){roll=null;tgx=0;tgy=0;return;}var a=-Math.PI/2+p*Math.PI*2;tgx=Math.cos(a)*GX;tgy=Math.sin(a)*GY;};}
 function talk(v){talking=(v===undefined)?!talking:!!v;var b=document.getElementById('c-talk');if(b)b.classList.toggle('on',talking);}
 function gest(el,dur,fn){if(!el)return;el._t=(el._t||0)+1;var id=el._t,t0=performance.now();(function s(){if(el._t!==id)return;var p=Math.min(1,(performance.now()-t0)/dur);el.setAttribute('transform',fn(p));if(p<1)requestAnimationFrame(s);else el.removeAttribute('transform');})();}
 function nod(){gest(headrig,820,function(p){return 'translate(0 '+(Math.sin(p*Math.PI*4)*(1-p)*9).toFixed(2)+')';});}
 function shake(){gest(headrig,820,function(p){return 'rotate('+(Math.sin(p*Math.PI*4)*(1-p)*6).toFixed(2)+' 340 600)';});}
 function shrug(){gest(torso,760,function(p){return 'translate(0 '+(-Math.sin(p*Math.PI)*11).toFixed(2)+')';});gest(headrig,760,function(p){return 'translate(0 '+(Math.sin(p*Math.PI)*4).toFixed(2)+')';});}
 // Whistle: purse the lips into a small "O" (drawn in apply) while the head/eyes glance left, right,
 // then left again — a relaxed, idle whistle. Skipped while talking so it never fights narration.
 var whistling=false,whT=0;
 function whistle(){
  if(whistling||talking||raised)return;
  whistling=true;var wb=document.getElementById('c-whistle');if(wb)wb.classList.add('on');
  var t0=performance.now(),dur=3800;
  // p (0..1) → gaze/head direction: -1 left … +1 right, with left-right-left swings then ease center.
  function dirAt(p){
   if(p<0.20)return -1;                       // hold left
   if(p<0.34)return -1+(p-0.20)/0.14*2;       // swing right
   if(p<0.54)return 1;                        // hold right
   if(p<0.68)return 1-(p-0.54)/0.14*2;        // swing left
   if(p<0.86)return -1;                       // hold left
   return -1+(p-0.86)/0.14;                   // ease back to center
  }
  whT++;var id=whT;
  (function s(){
   if(id!==whT)return;
   var p=(performance.now()-t0)/dur;
   if(p>=1){whistling=false;tgx=0;tgy=0;if(headrig)headrig.removeAttribute('transform');if(wb)wb.classList.remove('on');return;}
   var d=dirAt(p);
   // Ease the amplitude in over the first 12% and out over the last 12% so the head turn grows from
   // (and settles back to) the rest pose — no instant snap into/out of the whistle. The mouth morphs
   // smoothly on its own via the lerp in apply().
   var e=p<0.12?p/0.12:p>0.88?(1-p)/0.12:1; e=e*e*(3-2*e);
   tgx=d*GX*e;tgy=GY*0.22*e;                   // eyes track the turn, drift a touch down as he purses
   if(headrig)headrig.setAttribute('transform','rotate('+(d*3.4*e).toFixed(2)+' 340 600)');
   requestAnimationFrame(s);
  })();
 }
 function apply(){
  var k=['bLY','bRY','bLR','bRR','sqL','sqR','mc','mt','mb','mw'],i;
  // While whistling, steer the mouth params toward a small pursed "O" (it's the same 4-point shape
  // as the normal mouth, so the existing lerp morphs into AND out of it smoothly — no hard switch).
  // Brows/eyes keep whatever emotion is set.
  var eff=tgt;
  if(whistling){var rb=8.0;eff={bLY:tgt.bLY,bRY:tgt.bRY,bLR:tgt.bLR,bRR:tgt.bRR,sqL:tgt.sqL,sqR:tgt.sqR,mc:584,mt:584-rb*1.35,mb:584+rb*1.35,mw:rb};}
  for(i=0;i<k.length;i++){cur[k[i]]=lerp(cur[k[i]],eff[k[i]],.16);}
  if(roll)roll(performance.now());
  gx=lerp(gx,tgx,roll?0.5:0.18);gy=lerp(gy,tgy,roll?0.5:0.18);
  if(eyeL)eyeL.setAttribute('transform','translate('+gx.toFixed(2)+' '+gy.toFixed(2)+')');
  if(eyeR)eyeR.setAttribute('transform','translate('+gx.toFixed(2)+' '+gy.toFixed(2)+')');
  var sL=Math.max(cur.sqL,blink), sR=Math.max(cur.sqR,blink);
  lidL.setAttribute('transform','translate(300 412) scale(1 '+sL.toFixed(3)+') translate(-300 -412)');
  lidR.setAttribute('transform','translate(380 412) scale(1 '+sR.toFixed(3)+') translate(-380 -412)');
  bL.setAttribute('transform','translate(0 '+cur.bLY.toFixed(2)+') rotate('+cur.bLR.toFixed(2)+' 298 398)');
  bR.setAttribute('transform','translate(0 '+cur.bRY.toFixed(2)+') rotate('+cur.bRR.toFixed(2)+' 382 398)');
  var mt=cur.mt,mb=cur.mb,mw=cur.mw;
  if(whistling){var wt=performance.now()*0.001,o=Math.sin(wt*7)*1.6;mt-=o;mb+=o;}  // gentle blow pulse on the morphed "O"
  else if(talking){var tt=performance.now()*0.001;var o2=(Math.sin(tt*15)*0.5+0.5)*(0.55+0.45*Math.sin(tt*5.7));mt=cur.mt-o2*5;mb=cur.mb+o2*10;mw=cur.mw+o2*2;}
  var x0=(340-mw),x1=(340+mw);
  mouth.setAttribute('d','M'+x0.toFixed(1)+' '+cur.mc.toFixed(1)+' Q340 '+mt.toFixed(1)+' '+x1.toFixed(1)+' '+cur.mc.toFixed(1)+' Q340 '+mb.toFixed(1)+' '+x0.toFixed(1)+' '+cur.mc.toFixed(1)+' Z');
  requestAnimationFrame(apply);
 }
 apply();
 function doBlink(){var t0=performance.now();(function s(){var e=performance.now()-t0,v=0;if(e<80)v=e/80;else if(e<180)v=1-(e-80)/100;blink=Math.max(0,Math.min(1,v));if(e<180)requestAnimationFrame(s);else blink=0;})();}
 (function loop(){setTimeout(function(){doBlink();loop();},2400+Math.random()*2200);})();
 // Idle whistle at random intervals — a bit rare, but it happens. No-ops while talking or mid-sip.
 (function whLoop(){setTimeout(function(){whistle();whLoop();},25000+Math.random()*20000);})();
 function setEmotion(n){if(!E[n])return;tgt=Object.assign({},E[n]);
  var b=document.querySelectorAll('.coach-ctrl [data-emo]');for(var i=0;i<b.length;i++)b[i].classList.toggle('on',b[i].getAttribute('data-emo')===n);}
 var raised=false; function raiseCup(v){raised=(v===undefined)?!raised:v;cup.classList.toggle('raised',raised);document.getElementById('c-raise').classList.toggle('on',raised);}
 var cyc=null,order=['neutral','happy','skeptical','angry','sad','surprised'],ci=0;
 function startCycle(){if(cyc)return;document.getElementById('c-cycle').textContent='Auto-cycle: on';document.getElementById('c-cycle').classList.add('on');cyc=setInterval(function(){ci=(ci+1)%order.length;setEmotion(order[ci]);},2500);}
 function stopCycle(){if(cyc){clearInterval(cyc);cyc=null;}document.getElementById('c-cycle').textContent='Auto-cycle: off';document.getElementById('c-cycle').classList.remove('on');}
 var ee=document.querySelectorAll('.coach-ctrl [data-emo]');for(var i=0;i<ee.length;i++){ee[i].addEventListener('click',function(){stopCycle();setEmotion(this.getAttribute('data-emo'));});}
 document.getElementById('c-raise').addEventListener('click',function(){raiseCup();});
 document.getElementById('c-cycle').addEventListener('click',function(){cyc?stopCycle():startCycle();});
 var lk=document.querySelectorAll('.coach-ctrl [data-look]');for(var li=0;li<lk.length;li++){lk[li].addEventListener('click',function(){look(this.getAttribute('data-look'));});}
 function on(id,fn){var b=document.getElementById(id);if(b)b.addEventListener('click',fn);}
 on('c-talk',function(){talk();});on('c-roll',function(){eyeRoll();});on('c-nod',nod);on('c-shake',shake);on('c-shrug',shrug);on('c-whistle',whistle);
 window.coach={setEmotion:setEmotion,raiseCup:raiseCup,startCycle:startCycle,stopCycle:stopCycle,talk:talk,look:look,eyeRoll:eyeRoll,nod:nod,shake:shake,shrug:shrug,whistle:whistle,emotions:E};
 window.addEventListener('message',function(ev){var d=ev.data||{};switch(d.coachCmd){case 'emotion':setEmotion(d.value);break;case 'cycleStart':startCycle();break;case 'cycleStop':stopCycle();break;case 'raise':raiseCup(d.value);break;case 'talk':talk(d.value);break;case 'look':look(d.value);break;case 'eyeRoll':eyeRoll();break;case 'nod':nod();break;case 'shake':shake();break;case 'shrug':shrug();break;case 'whistle':whistle();break;}});
})();
