(function(){
 function gid(id){return document.getElementById(id);}
 var E={
  neutral:{bLY:0,bRY:0,bLR:-1,bRR:1,sqL:.15,sqR:.15,mc:330,mt:329,mb:334,mw:22},
  happy:{bLY:-3,bRY:-3,bLR:-3,bRR:3,sqL:.22,sqR:.22,mc:325,mt:328,mb:343,mw:27},
  sad:{bLY:-1,bRY:-1,bLR:-8,bRR:8,sqL:.18,sqR:.18,mc:338,mt:336,mb:339,mw:18},
  angry:{bLY:4,bRY:4,bLR:9,bRR:-9,sqL:.30,sqR:.30,mc:336,mt:334,mb:337,mw:18},
  surprised:{bLY:-10,bRY:-10,bLR:0,bRR:0,sqL:0,sqR:0,mc:331,mt:321,mb:345,mw:14},
  skeptical:{bLY:3,bRY:-9,bLR:5,bRR:-2,sqL:.24,sqR:.05,mc:333,mt:331,mb:335,mw:20}
 };
 var cur=Object.assign({},E.neutral),tgt=Object.assign({},E.neutral),blink=0;
 var lidL=gid('lidL'),lidR=gid('lidR'),bL=gid('browL'),bR=gid('browR'),
     mouth=gid('mouth'),eyeL=gid('eyeL'),eyeR=gid('eyeR'),
     headrig=gid('headrig'),torso=gid('torso'),
     pawn=gid('pawn'),scratchg=gid('scratchgroup'),scratchhand=gid('scratchhand');
 function lerp(a,b,t){return a+(b-a)*t;}
 function easeIO(t){return t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2;}

 // ---- gaze ----
 var gx=0,gy=0,tgx=0,tgy=0,roll=null,GX=5,GY=3.5,talking=false,busy=false;
 var LOOK={center:[0,0],left:[-1,0],right:[1,0],up:[0,-1],down:[0,1],upleft:[-1,-1],upright:[1,-1],downleft:[-1,1],downright:[1,1]};
 function look(dir){var v=LOOK[dir]||LOOK.center;tgx=v[0]*GX;tgy=v[1]*GY;roll=null;}
 function eyeRoll(){var t0=performance.now(),dur=1100;roll=function(now){var p=(now-t0)/dur;if(p>=1){roll=null;tgx=0;tgy=0;return;}var a=-Math.PI/2+p*Math.PI*2;tgx=Math.cos(a)*GX;tgy=Math.sin(a)*GY;};}
 function talk(v){talking=(v===undefined)?!talking:!!v;var b=gid('m-talk');if(b)b.classList.toggle('on',talking);}

 // ---- gestures ----
 function gest(el,dur,fn){if(!el)return;el._t=(el._t||0)+1;var id=el._t,t0=performance.now();(function s(){if(el._t!==id)return;var p=Math.min(1,(performance.now()-t0)/dur);el.setAttribute('transform',fn(p));if(p<1)requestAnimationFrame(s);else el.removeAttribute('transform');})();}
 function nod(){gest(headrig,820,function(p){return 'translate(0 '+(Math.sin(p*Math.PI*4)*(1-p)*8).toFixed(2)+')';});}
 function shake(){gest(headrig,820,function(p){return 'rotate('+(Math.sin(p*Math.PI*4)*(1-p)*6).toFixed(2)+' 340 370)';});}
 function shrug(){gest(torso,760,function(p){return 'translate(0 '+(-Math.sin(p*Math.PI)*10).toFixed(2)+')';});gest(headrig,760,function(p){return 'translate(0 '+(Math.sin(p*Math.PI)*4).toFixed(2)+')';});}

 // ---- special: toss the pawn and catch it (eyes follow) ----
 function tossPawn(){
  if(busy)return; busy=true;
  var dur=1700,t0=performance.now();
  (function s(){
   var p=Math.min(1,(performance.now()-t0)/dur);
   var h=4*p*(1-p); // parabola 0→1→0
   pawn.setAttribute('transform','translate(0 '+(-178*h).toFixed(1)+') rotate('+(Math.sin(p*Math.PI*2)*16).toFixed(1)+' 448 660)');
   tgx=GX*0.8; tgy=-GY*1.1*h+GY*0.25*(1-h);
   if(p<1)requestAnimationFrame(s);
   else{pawn.removeAttribute('transform');tgx=0;tgy=0;busy=false;}
  })();
 }

 // ---- special: scratch the head (in doubt) ----
 function scratchHead(){
  if(busy)return; busy=true;
  var dur=2500,t0=performance.now();
  (function s(){
   var p=Math.min(1,(performance.now()-t0)/dur),k;
   if(p<.22)k=easeIO(p/.22);
   else if(p<.78)k=1;
   else k=1-easeIO((p-.78)/.22);
   scratchg.setAttribute('transform','translate(0 '+(620*(1-k)).toFixed(1)+')');
   if(p>=.22&&p<.78){
    scratchhand.setAttribute('transform','translate(0 '+(Math.sin((p-.22)*42)*4).toFixed(2)+') rotate('+(Math.sin((p-.22)*42)*5).toFixed(2)+' 288 184)');
    headrig.setAttribute('transform','rotate('+(2.5*k).toFixed(2)+' 340 370)');
    tgx=-GX*0.7; tgy=-GY*0.6;
   }
   if(p<1)requestAnimationFrame(s);
   else{scratchg.setAttribute('transform','translate(0 620)');scratchhand.removeAttribute('transform');headrig.removeAttribute('transform');tgx=0;tgy=0;busy=false;}
  })();
 }

 function apply(){
  var k=['bLY','bRY','bLR','bRR','sqL','sqR','mc','mt','mb','mw'],i;
  for(i=0;i<k.length;i++){cur[k[i]]=lerp(cur[k[i]],tgt[k[i]],.16);}
  if(roll)roll(performance.now());
  gx=lerp(gx,tgx,roll?0.5:0.18);gy=lerp(gy,tgy,roll?0.5:0.18);
  if(eyeL)eyeL.setAttribute('transform','translate('+gx.toFixed(2)+' '+gy.toFixed(2)+')');
  if(eyeR)eyeR.setAttribute('transform','translate('+gx.toFixed(2)+' '+gy.toFixed(2)+')');
  var sL=Math.max(cur.sqL,blink),sR=Math.max(cur.sqR,blink);
  lidL.setAttribute('transform','translate(306 260) scale(1 '+sL.toFixed(3)+') translate(-306 -260)');
  lidR.setAttribute('transform','translate(374 260) scale(1 '+sR.toFixed(3)+') translate(-374 -260)');
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
 (function loop(){setTimeout(function(){doBlink();loop();},2600+Math.random()*2400);})();
 function setEmotion(n){if(!E[n])return;tgt=Object.assign({},E[n]);var b=document.querySelectorAll('.coach-ctrl [data-emo]');for(var i=0;i<b.length;i++)b[i].classList.toggle('on',b[i].getAttribute('data-emo')===n);}
 // prop action = the pawn toss
 function raiseCup(){tossPawn();}
 var cyc=null,order=['neutral','happy','skeptical','angry','sad','surprised'],ci=0;
 function startCycle(){if(cyc)return;var c=gid('m-cycle');if(c){c.textContent='Auto-cycle: on';c.classList.add('on');}cyc=setInterval(function(){ci=(ci+1)%order.length;setEmotion(order[ci]);},2500);}
 function stopCycle(){if(cyc){clearInterval(cyc);cyc=null;}var c=gid('m-cycle');if(c){c.textContent='Auto-cycle: off';c.classList.remove('on');}}
 var ee=document.querySelectorAll('.coach-ctrl [data-emo]');for(var i=0;i<ee.length;i++){ee[i].addEventListener('click',function(){stopCycle();setEmotion(this.getAttribute('data-emo'));});}
 var lk=document.querySelectorAll('.coach-ctrl [data-look]');for(i=0;i<lk.length;i++){lk[i].addEventListener('click',function(){look(this.getAttribute('data-look'));});}
 function on(id,fn){var b=gid(id);if(b)b.addEventListener('click',fn);}
 on('m-cycle',function(){cyc?stopCycle():startCycle();});
 on('m-talk',function(){talk();});
 on('m-roll',function(){eyeRoll();});
 on('m-nod',nod);on('m-shake',shake);on('m-shrug',shrug);
 on('m-toss',tossPawn);on('m-scratch',scratchHead);
 window.coach={setEmotion:setEmotion,raiseCup:raiseCup,tossPawn:tossPawn,scratchHead:scratchHead,
  startCycle:startCycle,stopCycle:stopCycle,talk:talk,look:look,eyeRoll:eyeRoll,nod:nod,shake:shake,shrug:shrug,emotions:E};
 window.addEventListener('message',function(ev){var d=ev.data||{};switch(d.coachCmd){
   case 'emotion':setEmotion(d.value);break;case 'cycleStart':startCycle();break;case 'cycleStop':stopCycle();break;
   case 'raise':raiseCup();break;case 'tossPawn':tossPawn();break;case 'scratchHead':scratchHead();break;
   case 'talk':talk(d.value);break;case 'look':look(d.value);break;
   case 'eyeRoll':eyeRoll();break;case 'nod':nod();break;case 'shake':shake();break;case 'shrug':shrug();break;}});
})();
