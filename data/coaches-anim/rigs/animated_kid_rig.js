(function(){
 function gid(id){return document.getElementById(id);}
 var E={
  neutral:{bLY:-5,bRY:-6,bLR:-2,bRR:2,sqL:0,sqR:0,mc:342,mt:344,mb:352,mw:20},
  happy:{bLY:-7,bRY:-7,bLR:-3,bRR:3,sqL:.14,sqR:.14,mc:337,mt:341,mb:358,mw:25},
  sad:{bLY:-2,bRY:-2,bLR:-9,bRR:9,sqL:.12,sqR:.12,mc:352,mt:350,mb:353,mw:16},
  angry:{bLY:4,bRY:4,bLR:9,bRR:-9,sqL:.22,sqR:.22,mc:350,mt:348,mb:351,mw:15},
  surprised:{bLY:-11,bRY:-12,bLR:0,bRR:0,sqL:0,sqR:0,mc:346,mt:335,mb:359,mw:13},
  skeptical:{bLY:3,bRY:-10,bLR:5,bRR:-2,sqL:.18,sqR:.02,mc:346,mt:344,mb:348,mw:18}
 };
 var cur=Object.assign({},E.neutral),tgt=Object.assign({},E.neutral),blink=0;
 var lidL=gid('lidL'),lidR=gid('lidR'),bL=gid('browL'),bR=gid('browR'),
     mouth=gid('mouth'),eyeL=gid('eyeL'),eyeR=gid('eyeR'),
     headrig=gid('headrig'),torso=gid('torso'),trophy=gid('trophygroup');
 function lerp(a,b,t){return a+(b-a)*t;}

 // ---- gaze ----
 var gx=0,gy=0,tgx=0,tgy=0,roll=null,GX=6,GY=4.5,talking=false;
 var LOOK={center:[0,0],left:[-1,0],right:[1,0],up:[0,-1],down:[0,1],upleft:[-1,-1],upright:[1,-1],downleft:[-1,1],downright:[1,1]};
 function look(dir){var v=LOOK[dir]||LOOK.center;tgx=v[0]*GX;tgy=v[1]*GY;roll=null;}
 function eyeRoll(){var t0=performance.now(),dur=1100;roll=function(now){var p=(now-t0)/dur;if(p>=1){roll=null;tgx=0;tgy=0;return;}var a=-Math.PI/2+p*Math.PI*2;tgx=Math.cos(a)*GX;tgy=Math.sin(a)*GY;};}
 function talk(v){talking=(v===undefined)?!talking:!!v;var b=gid('k-talk');if(b)b.classList.toggle('on',talking);}

 // ---- gestures (a bit bouncier — he's a kid) ----
 function gest(el,dur,fn){if(!el)return;el._t=(el._t||0)+1;var id=el._t,t0=performance.now();(function s(){if(el._t!==id)return;var p=Math.min(1,(performance.now()-t0)/dur);el.setAttribute('transform',fn(p));if(p<1)requestAnimationFrame(s);else el.removeAttribute('transform');})();}
 function nod(){gest(headrig,700,function(p){return 'translate(0 '+(Math.sin(p*Math.PI*4)*(1-p)*10).toFixed(2)+')';});}
 function shake(){gest(headrig,700,function(p){return 'rotate('+(Math.sin(p*Math.PI*5)*(1-p)*7).toFixed(2)+' 340 380)';});}
 function shrug(){gest(torso,680,function(p){return 'translate(0 '+(-Math.sin(p*Math.PI)*11).toFixed(2)+')';});gest(headrig,680,function(p){return 'translate(0 '+(Math.sin(p*Math.PI)*4.5).toFixed(2)+')';});}

 function apply(){
  var k=['bLY','bRY','bLR','bRR','sqL','sqR','mc','mt','mb','mw'],i;
  for(i=0;i<k.length;i++){cur[k[i]]=lerp(cur[k[i]],tgt[k[i]],.16);}
  if(roll)roll(performance.now());
  gx=lerp(gx,tgx,roll?0.5:0.22);gy=lerp(gy,tgy,roll?0.5:0.22);
  if(eyeL)eyeL.setAttribute('transform','translate('+gx.toFixed(2)+' '+gy.toFixed(2)+')');
  if(eyeR)eyeR.setAttribute('transform','translate('+gx.toFixed(2)+' '+gy.toFixed(2)+')');
  var sL=Math.max(cur.sqL,blink),sR=Math.max(cur.sqR,blink);
  lidL.setAttribute('transform','translate(302 265) scale(1 '+sL.toFixed(3)+') translate(-302 -265)');
  lidR.setAttribute('transform','translate(378 265) scale(1 '+sR.toFixed(3)+') translate(-378 -265)');
  bL.setAttribute('transform','translate(0 '+cur.bLY.toFixed(2)+') rotate('+cur.bLR.toFixed(2)+' 302 244)');
  bR.setAttribute('transform','translate(0 '+cur.bRY.toFixed(2)+') rotate('+cur.bRR.toFixed(2)+' 378 244)');
  var mt=cur.mt,mb=cur.mb,mw=cur.mw;
  if(talking){var tt=performance.now()*0.001;var o=(Math.sin(tt*16)*0.5+0.5)*(0.55+0.45*Math.sin(tt*6))
;mt=cur.mt-o*5;mb=cur.mb+o*9;mw=cur.mw+o*1.5;}
  var x0=(340-mw),x1=(340+mw);
  mouth.setAttribute('d','M'+x0.toFixed(1)+' '+cur.mc.toFixed(1)+' Q340 '+mt.toFixed(1)+' '+x1.toFixed(1)+' '+cur.mc.toFixed(1)+' Q340 '+mb.toFixed(1)+' '+x0.toFixed(1)+' '+cur.mc.toFixed(1)+' Z');
  requestAnimationFrame(apply);
 }
 apply();
 function doBlink(){var t0=performance.now();(function s(){var e=performance.now()-t0,v=0;if(e<80)v=e/80;else if(e<180)v=1-(e-80)/100;blink=Math.max(0,Math.min(1,v));if(e<180)requestAnimationFrame(s);else blink=0;})();}
 (function loop(){setTimeout(function(){doBlink();loop();},2400+Math.random()*2200);})();
 function setEmotion(n){if(!E[n])return;tgt=Object.assign({},E[n]);var b=document.querySelectorAll('.coach-ctrl [data-emo]');for(var i=0;i<b.length;i++)b[i].classList.toggle('on',b[i].getAttribute('data-emo')===n);}
 // prop action: proudly lift the trophy higher
 var raised=false;
 function raiseCup(v){raised=(v===undefined)?!raised:!!v;if(trophy)trophy.classList.toggle('raised',raised);var rb=gid('k-raise');if(rb)rb.classList.toggle('on',raised);}
 var cyc=null,order=['neutral','happy','skeptical','angry','sad','surprised'],ci=0;
 function startCycle(){if(cyc)return;var c=gid('k-cycle');if(c){c.textContent='Auto-cycle: on';c.classList.add('on');}cyc=setInterval(function(){ci=(ci+1)%order.length;setEmotion(order[ci]);},2500);}
 function stopCycle(){if(cyc){clearInterval(cyc);cyc=null;}var c=gid('k-cycle');if(c){c.textContent='Auto-cycle: off';c.classList.remove('on');}}
 var ee=document.querySelectorAll('.coach-ctrl [data-emo]');for(var i=0;i<ee.length;i++){ee[i].addEventListener('click',function(){stopCycle();setEmotion(this.getAttribute('data-emo'));});}
 var lk=document.querySelectorAll('.coach-ctrl [data-look]');for(i=0;i<lk.length;i++){lk[i].addEventListener('click',function(){look(this.getAttribute('data-look'));});}
 function on(id,fn){var b=gid(id);if(b)b.addEventListener('click',fn);}
 on('k-cycle',function(){cyc?stopCycle():startCycle();});
 on('k-talk',function(){talk();});
 on('k-roll',function(){eyeRoll();});
 on('k-nod',nod);on('k-shake',shake);on('k-shrug',shrug);
 on('k-raise',function(){raiseCup();});
 window.coach={setEmotion:setEmotion,raiseCup:raiseCup,startCycle:startCycle,stopCycle:stopCycle,
  talk:talk,look:look,eyeRoll:eyeRoll,nod:nod,shake:shake,shrug:shrug,emotions:E};
 window.addEventListener('message',function(ev){var d=ev.data||{};switch(d.coachCmd){
   case 'emotion':setEmotion(d.value);break;case 'cycleStart':startCycle();break;case 'cycleStop':stopCycle();break;
   case 'raise':raiseCup(d.value);break;case 'talk':talk(d.value);break;case 'look':look(d.value);break;
   case 'eyeRoll':eyeRoll();break;case 'nod':nod();break;case 'shake':shake();break;case 'shrug':shrug();break;}});
})();
