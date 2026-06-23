(function(){
 function gid(id){return document.getElementById(id);}
 // asymmetric mouth: mcl/mcr = left/right corner Y (the smirk)
 var E={
  neutral:{bLY:0,bRY:-6,bLR:0,bRR:-3,sqL:.14,sqR:.20,mt:324,mb:330,mw:26,mcl:330,mcr:320},
  happy:{bLY:-3,bRY:-7,bLR:-2,bRR:-4,sqL:.06,sqR:.10,mt:319,mb:333,mw:30,mcl:323,mcr:317},
  sad:{bLY:-1,bRY:-1,bLR:-9,bRR:9,sqL:.16,sqR:.16,mt:333,mb:336,mw:21,mcl:335,mcr:335},
  angry:{bLY:5,bRY:5,bLR:11,bRR:-11,sqL:.34,sqR:.34,mt:330,mb:333,mw:22,mcl:332,mcr:331},
  surprised:{bLY:-11,bRY:-13,bLR:0,bRR:0,sqL:0,sqR:0,mt:313,mb:340,mw:18,mcl:327,mcr:324},
  skeptical:{bLY:6,bRY:-13,bLR:6,bRR:-2,sqL:.30,sqR:.04,mt:326,mb:331,mw:24,mcl:330,mcr:321}
 };
 var cur=Object.assign({},E.neutral),tgt=Object.assign({},E.neutral),blink=0;
 var lidL=gid('lidL'),lidR=gid('lidR'),bL=gid('browL'),bR=gid('browR'),
     mouth=gid('mouth'),eyeL=gid('eyeL'),eyeR=gid('eyeR'),
     headrig=gid('headrig'),torso=gid('torso'),tpick=gid('toothpick');
 function lerp(a,b,t){return a+(b-a)*t;}

 // ---- gaze ----
 var gx=0,gy=0,tgx=0,tgy=0,roll=null,GX=5,GY=3.5,talking=false;
 var LOOK={center:[0,0],left:[-1,0],right:[1,0],up:[0,-1],down:[0,1],upleft:[-1,-1],upright:[1,-1],downleft:[-1,1],downright:[1,1]};
 function look(dir){var v=LOOK[dir]||LOOK.center;tgx=v[0]*GX;tgy=v[1]*GY;roll=null;}
 function eyeRoll(){var t0=performance.now(),dur=1100;roll=function(now){var p=(now-t0)/dur;if(p>=1){roll=null;tgx=0;tgy=0;return;}var a=-Math.PI/2+p*Math.PI*2;tgx=Math.cos(a)*GX;tgy=Math.sin(a)*GY;};}
 function talk(v){talking=(v===undefined)?!talking:!!v;var b=gid('h-talk');if(b)b.classList.toggle('on',talking);}

 // ---- gestures ----
 function gest(el,dur,fn){if(!el)return;el._t=(el._t||0)+1;var id=el._t,t0=performance.now();(function s(){if(el._t!==id)return;var p=Math.min(1,(performance.now()-t0)/dur);el.setAttribute('transform',fn(p));if(p<1)requestAnimationFrame(s);else el.removeAttribute('transform');})();}
 function nod(){gest(headrig,820,function(p){return 'translate(0 '+(Math.sin(p*Math.PI*4)*(1-p)*8).toFixed(2)+')';});}
 function shake(){gest(headrig,820,function(p){return 'rotate('+(Math.sin(p*Math.PI*4)*(1-p)*6).toFixed(2)+' 340 360)';});}
 function shrug(){gest(torso,760,function(p){return 'translate(0 '+(-Math.sin(p*Math.PI)*10).toFixed(2)+')';});gest(headrig,760,function(p){return 'translate(0 '+(Math.sin(p*Math.PI)*4).toFixed(2)+')';});}

 function apply(){
  var k=['bLY','bRY','bLR','bRR','sqL','sqR','mt','mb','mw','mcl','mcr'],i;
  for(i=0;i<k.length;i++){cur[k[i]]=lerp(cur[k[i]],tgt[k[i]],.16);}
  if(roll)roll(performance.now());
  gx=lerp(gx,tgx,roll?0.5:0.18);gy=lerp(gy,tgy,roll?0.5:0.18);
  if(eyeL)eyeL.setAttribute('transform','translate('+gx.toFixed(2)+' '+gy.toFixed(2)+')');
  if(eyeR)eyeR.setAttribute('transform','translate('+gx.toFixed(2)+' '+gy.toFixed(2)+')');
  var sL=Math.max(cur.sqL,blink),sR=Math.max(cur.sqR,blink);
  lidL.setAttribute('transform','translate(306 256) scale(1 '+sL.toFixed(3)+') translate(-306 -256)');
  lidR.setAttribute('transform','translate(374 256) scale(1 '+sR.toFixed(3)+') translate(-374 -256)');
  bL.setAttribute('transform','translate(0 '+cur.bLY.toFixed(2)+') rotate('+cur.bLR.toFixed(2)+' 306 242)');
  bR.setAttribute('transform','translate(0 '+cur.bRY.toFixed(2)+') rotate('+cur.bRR.toFixed(2)+' 374 242)');
  var mt=cur.mt,mb=cur.mb,mw=cur.mw;
  if(talking){var tt=performance.now()*0.001;var o=(Math.sin(tt*15)*0.5+0.5)*(0.55+0.45*Math.sin(tt*5.7));mt=cur.mt-o*5;mb=cur.mb+o*9;mw=cur.mw+o*1.5;}
  var x0=(340-mw),x1=(340+mw);
  mouth.setAttribute('d','M'+x0.toFixed(1)+' '+cur.mcl.toFixed(1)+' Q340 '+mt.toFixed(1)+' '+x1.toFixed(1)+' '+cur.mcr.toFixed(1)+' Q340 '+mb.toFixed(1)+' '+x0.toFixed(1)+' '+cur.mcl.toFixed(1)+' Z');
  // toothpick follows the right mouth corner; dips as the mouth opens
  var open=Math.max(0,(mb-mt)-6), ang=Math.min(14,open*0.7);
  tpick.setAttribute('transform','translate('+(x1-366).toFixed(1)+' '+(cur.mcr-320).toFixed(1)+') rotate('+ang.toFixed(1)+' 366 320)');
  requestAnimationFrame(apply);
 }
 apply();
 function doBlink(){var t0=performance.now();(function s(){var e=performance.now()-t0,v=0;if(e<80)v=e/80;else if(e<180)v=1-(e-80)/100;blink=Math.max(0,Math.min(1,v));if(e<180)requestAnimationFrame(s);else blink=0;})();}
 (function loop(){setTimeout(function(){doBlink();loop();},2600+Math.random()*2400);})();
 function setEmotion(n){if(!E[n])return;tgt=Object.assign({},E[n]);var b=document.querySelectorAll('.coach-ctrl [data-emo]');for(var i=0;i<b.length;i++)b[i].classList.toggle('on',b[i].getAttribute('data-emo')===n);}
 // impatient finger-roll on the clock (tap tap tap), on by default
 var tapping=true;
 function tap(v){
  tapping=(v===undefined)?!tapping:!!v;
  ['f1','f2','f3'].forEach(function(id){var f=gid(id);if(f)f.classList.toggle('tapping',tapping);});
  var b=gid('h-tap');if(b)b.classList.toggle('on',tapping);
 }
 tap(true);
 // chess-clock interaction deliberately deferred — stub for now
 function raiseCup(v){}
 var cyc=null,order=['neutral','happy','skeptical','angry','sad','surprised'],ci=0;
 function startCycle(){if(cyc)return;var c=gid('h-cycle');if(c){c.textContent='Auto-cycle: on';c.classList.add('on');}cyc=setInterval(function(){ci=(ci+1)%order.length;setEmotion(order[ci]);},2500);}
 function stopCycle(){if(cyc){clearInterval(cyc);cyc=null;}var c=gid('h-cycle');if(c){c.textContent='Auto-cycle: off';c.classList.remove('on');}}
 var ee=document.querySelectorAll('.coach-ctrl [data-emo]');for(var i=0;i<ee.length;i++){ee[i].addEventListener('click',function(){stopCycle();setEmotion(this.getAttribute('data-emo'));});}
 var lk=document.querySelectorAll('.coach-ctrl [data-look]');for(i=0;i<lk.length;i++){lk[i].addEventListener('click',function(){look(this.getAttribute('data-look'));});}
 function on(id,fn){var b=gid(id);if(b)b.addEventListener('click',fn);}
 on('h-cycle',function(){cyc?stopCycle():startCycle();});
 on('h-talk',function(){talk();});
 on('h-roll',function(){eyeRoll();});
 on('h-nod',nod);on('h-shake',shake);on('h-shrug',shrug);
 on('h-tap',function(){tap();});
 window.coach={setEmotion:setEmotion,raiseCup:raiseCup,tap:tap,startCycle:startCycle,stopCycle:stopCycle,
  talk:talk,look:look,eyeRoll:eyeRoll,nod:nod,shake:shake,shrug:shrug,emotions:E};
 window.addEventListener('message',function(ev){var d=ev.data||{};switch(d.coachCmd){
   case 'emotion':setEmotion(d.value);break;case 'cycleStart':startCycle();break;case 'cycleStop':stopCycle();break;
   case 'raise':raiseCup(d.value);break;case 'tap':tap(d.value);break;case 'talk':talk(d.value);break;case 'look':look(d.value);break;
   case 'eyeRoll':eyeRoll();break;case 'nod':nod();break;case 'shake':shake();break;case 'shrug':shrug();break;}});
})();
