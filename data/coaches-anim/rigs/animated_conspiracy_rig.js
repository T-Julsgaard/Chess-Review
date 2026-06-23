(function(){
 function gid(id){return document.getElementById(id);}
 var E={
  neutral:{bLY:-5,bRY:-10,bLR:7,bRR:-9,sqL:0,sqR:0,mc:332,mt:331,mb:333,mw:24},
  happy:{bLY:-7,bRY:-8,bLR:2,bRR:-3,sqL:.10,sqR:.08,mc:328,mt:330,mb:342,mw:27},
  sad:{bLY:-3,bRY:-3,bLR:-9,bRR:9,sqL:.16,sqR:.16,mc:340,mt:338,mb:341,mw:20},
  angry:{bLY:5,bRY:5,bLR:12,bRR:-12,sqL:.30,sqR:.30,mc:338,mt:336,mb:339,mw:21},
  surprised:{bLY:-12,bRY:-13,bLR:0,bRR:0,sqL:0,sqR:0,mc:333,mt:321,mb:348,mw:15},
  skeptical:{bLY:4,bRY:-12,bLR:7,bRR:-3,sqL:.26,sqR:.02,mc:335,mt:333,mb:336,mw:22}
 };
 var cur=Object.assign({},E.neutral),tgt=Object.assign({},E.neutral),blink=0;
 var lidL=gid('lidL'),lidR=gid('lidR'),bL=gid('browL'),bR=gid('browR'),
     mouth=gid('mouth'),eyeL=gid('eyeL'),eyeR=gid('eyeR'),
     headrig=gid('headrig'),torso=gid('torso'),threadg=gid('threadgroup');
 function lerp(a,b,t){return a+(b-a)*t;}
 function easeIO(t){return t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2;}

 // ---- gaze (snappier than the calm coaches) ----
 var gx=0,gy=0,tgx=0,tgy=0,roll=null,GX=6,GY=4,talking=false,busy=false;
 var LOOK={center:[0,0],left:[-1,0],right:[1,0],up:[0,-1],down:[0,1],upleft:[-1,-1],upright:[1,-1],downleft:[-1,1],downright:[1,1]};
 function look(dir){dart(false);var v=LOOK[dir]||LOOK.center;tgx=v[0]*GX;tgy=v[1]*GY;roll=null;}
 function eyeRoll(){dart(false);var t0=performance.now(),dur=1100;roll=function(now){var p=(now-t0)/dur;if(p>=1){roll=null;tgx=0;tgy=0;return;}var a=-Math.PI/2+p*Math.PI*2;tgx=Math.cos(a)*GX;tgy=Math.sin(a)*GY;};}
 function talk(v){talking=(v===undefined)?!talking:!!v;var b=gid('ct-talk');if(b)b.classList.toggle('on',talking);}

 // ---- nervous darting eyes (his ambient default) ----
 var dartOn=true;
 function dart(v){dartOn=(v===undefined)?!dartOn:!!v;var b=gid('ct-dart');if(b)b.classList.toggle('on',dartOn);if(!dartOn&&!busy){/* keep current gaze */}}
 (function dartLoop(){
  setTimeout(function(){
   if(dartOn&&!busy){
    var dirs=[[1,0],[-1,0],[1,-1],[-1,-1],[0,-1],[1,.6],[-1,.6],[.4,-1]];
    var d=dirs[Math.floor(Math.random()*dirs.length)];
    tgx=d[0]*GX;tgy=d[1]*GY;
    if(Math.random()<.35){setTimeout(function(){if(dartOn&&!busy){tgx=-tgx;tgy=tgy*.5;}},200+Math.random()*200);}
   }
   dartLoop();
  },800+Math.random()*1800);
 })();

 // ---- gestures ----
 function gest(el,dur,fn){if(!el)return;el._t=(el._t||0)+1;var id=el._t,t0=performance.now();(function s(){if(el._t!==id)return;var p=Math.min(1,(performance.now()-t0)/dur);el.setAttribute('transform',fn(p));if(p<1)requestAnimationFrame(s);else el.removeAttribute('transform');})();}
 function nod(){gest(headrig,780,function(p){return 'translate(0 '+(Math.sin(p*Math.PI*4)*(1-p)*9).toFixed(2)+')';});}
 function shake(){gest(headrig,700,function(p){return 'rotate('+(Math.sin(p*Math.PI*5)*(1-p)*6.5).toFixed(2)+' 340 360)';});}
 function shrug(){gest(torso,720,function(p){return 'translate(0 '+(-Math.sin(p*Math.PI)*10).toFixed(2)+')';});gest(headrig,720,function(p){return 'translate(0 '+(Math.sin(p*Math.PI)*4).toFixed(2)+')';});}

 // ---- special: find a red thread (hands rise into frame, panicked stare, lower) ----
 function findThread(){
  if(busy)return; busy=true;
  var wasDart=dartOn; dartOn=false;
  var dur=3600,t0=performance.now();
  (function s(){
   var now=performance.now(),p=Math.min(1,(now-t0)/dur),k,trem=0;
   if(p<.2)k=easeIO(p/.2);
   else if(p<.8){k=1;trem=Math.sin(now*0.045)*1.6;}
   else k=1-easeIO((p-.8)/.2);
   threadg.setAttribute('transform','translate('+trem.toFixed(2)+' '+(300*(1-k)).toFixed(1)+')');
   headrig.setAttribute('transform','translate(0 '+(5*k).toFixed(2)+') rotate('+(2*k).toFixed(2)+' 340 360)');
   if(p>.12&&p<.88){tgx=0;tgy=GY;}
   if(p<1)requestAnimationFrame(s);
   else{
    threadg.setAttribute('transform','translate(0 300)');
    headrig.removeAttribute('transform');
    tgx=0;tgy=0;dartOn=wasDart;busy=false;
   }
  })();
 }

 function apply(){
  var k=['bLY','bRY','bLR','bRR','sqL','sqR','mc','mt','mb','mw'],i;
  for(i=0;i<k.length;i++){cur[k[i]]=lerp(cur[k[i]],tgt[k[i]],.16);}
  if(roll)roll(performance.now());
  gx=lerp(gx,tgx,roll?0.5:0.3);gy=lerp(gy,tgy,roll?0.5:0.3);
  if(eyeL)eyeL.setAttribute('transform','translate('+gx.toFixed(2)+' '+gy.toFixed(2)+')');
  if(eyeR)eyeR.setAttribute('transform','translate('+gx.toFixed(2)+' '+gy.toFixed(2)+')');
  var sL=Math.max(cur.sqL,blink),sR=Math.max(cur.sqR,blink);
  lidL.setAttribute('transform','translate(308 258) scale(1 '+sL.toFixed(3)+') translate(-308 -258)');
  lidR.setAttribute('transform','translate(372 258) scale(1 '+sR.toFixed(3)+') translate(-372 -258)');
  bL.setAttribute('transform','translate(0 '+cur.bLY.toFixed(2)+') rotate('+cur.bLR.toFixed(2)+' 306 244)');
  bR.setAttribute('transform','translate(0 '+cur.bRY.toFixed(2)+') rotate('+cur.bRR.toFixed(2)+' 374 244)');
  var mt=cur.mt,mb=cur.mb,mw=cur.mw;
  if(talking){var tt=performance.now()*0.001;var o=(Math.sin(tt*16)*0.5+0.5)*(0.55+0.45*Math.sin(tt*6.1));mt=cur.mt-o*5;mb=cur.mb+o*9;mw=cur.mw+o*1.5;}
  var x0=(340-mw),x1=(340+mw);
  mouth.setAttribute('d','M'+x0.toFixed(1)+' '+cur.mc.toFixed(1)+' Q340 '+mt.toFixed(1)+' '+x1.toFixed(1)+' '+cur.mc.toFixed(1)+' Q340 '+mb.toFixed(1)+' '+x0.toFixed(1)+' '+cur.mc.toFixed(1)+' Z');
  requestAnimationFrame(apply);
 }
 apply();
 // nervous = more frequent blinking
 function doBlink(){var t0=performance.now();(function s(){var e=performance.now()-t0,v=0;if(e<70)v=e/70;else if(e<160)v=1-(e-70)/90;blink=Math.max(0,Math.min(1,v));if(e<160)requestAnimationFrame(s);else blink=0;})();}
 (function loop(){setTimeout(function(){doBlink();loop();},1500+Math.random()*1800);})();
 function setEmotion(n){if(!E[n])return;tgt=Object.assign({},E[n]);var b=document.querySelectorAll('.coach-ctrl [data-emo]');for(var i=0;i<b.length;i++)b[i].classList.toggle('on',b[i].getAttribute('data-emo')===n);}
 // prop action = finding a red thread
 function raiseCup(){findThread();}
 var cyc=null,order=['neutral','happy','skeptical','angry','sad','surprised'],ci=0;
 function startCycle(){if(cyc)return;var c=gid('ct-cycle');if(c){c.textContent='Auto-cycle: on';c.classList.add('on');}cyc=setInterval(function(){ci=(ci+1)%order.length;setEmotion(order[ci]);},2500);}
 function stopCycle(){if(cyc){clearInterval(cyc);cyc=null;}var c=gid('ct-cycle');if(c){c.textContent='Auto-cycle: off';c.classList.remove('on');}}
 var ee=document.querySelectorAll('.coach-ctrl [data-emo]');for(var i=0;i<ee.length;i++){ee[i].addEventListener('click',function(){stopCycle();setEmotion(this.getAttribute('data-emo'));});}
 var lk=document.querySelectorAll('.coach-ctrl [data-look]');for(i=0;i<lk.length;i++){lk[i].addEventListener('click',function(){look(this.getAttribute('data-look'));});}
 function on(id,fn){var b=gid(id);if(b)b.addEventListener('click',fn);}
 on('ct-cycle',function(){cyc?stopCycle():startCycle();});
 on('ct-talk',function(){talk();});
 on('ct-roll',function(){eyeRoll();});
 on('ct-nod',nod);on('ct-shake',shake);on('ct-shrug',shrug);
 on('ct-dart',function(){dart();});
 on('ct-thread',findThread);
 window.coach={setEmotion:setEmotion,raiseCup:raiseCup,findThread:findThread,dart:dart,
  startCycle:startCycle,stopCycle:stopCycle,talk:talk,look:look,eyeRoll:eyeRoll,nod:nod,shake:shake,shrug:shrug,emotions:E};
 window.addEventListener('message',function(ev){var d=ev.data||{};switch(d.coachCmd){
   case 'emotion':setEmotion(d.value);break;case 'cycleStart':startCycle();break;case 'cycleStop':stopCycle();break;
   case 'raise':raiseCup();break;case 'findThread':findThread();break;case 'dart':dart(d.value);break;
   case 'talk':talk(d.value);break;case 'look':look(d.value);break;
   case 'eyeRoll':eyeRoll();break;case 'nod':nod();break;case 'shake':shake();break;case 'shrug':shrug();break;}});
})();
