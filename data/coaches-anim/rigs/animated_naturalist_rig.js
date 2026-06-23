(function(){
 function gid(id){return document.getElementById(id);}
 var E={
  neutral:{bLY:-3,bRY:-3,bLR:-1,bRR:1,sqL:.10,sqR:.10,mc:328,mt:326,mb:333,mw:22},
  happy:{bLY:-5,bRY:-5,bLR:-3,bRR:3,sqL:.20,sqR:.20,mc:323,mt:326,mb:341,mw:26},
  sad:{bLY:-1,bRY:-1,bLR:-8,bRR:8,sqL:.16,sqR:.16,mc:336,mt:334,mb:337,mw:18},
  angry:{bLY:4,bRY:4,bLR:8,bRR:-8,sqL:.28,sqR:.28,mc:334,mt:332,mb:335,mw:18},
  surprised:{bLY:-11,bRY:-11,bLR:0,bRR:0,sqL:0,sqR:0,mc:329,mt:319,mb:343,mw:14},
  skeptical:{bLY:3,bRY:-9,bLR:5,bRR:-2,sqL:.22,sqR:.05,mc:331,mt:329,mb:333,mw:20}
 };
 var cur=Object.assign({},E.neutral),tgt=Object.assign({},E.neutral),blink=0;
 var lidL=gid('lidL'),lidR=gid('lidR'),bL=gid('browL'),bR=gid('browR'),
     mouth=gid('mouth'),eyeL=gid('eyeL'),eyeR=gid('eyeR'),
     headrig=gid('headrig'),torso=gid('torso'),cam=gid('camgroup'),flash=gid('flash');
 function lerp(a,b,t){return a+(b-a)*t;}
 function easeIO(t){return t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2;}

 // ---- gaze ----
 var gx=0,gy=0,tgx=0,tgy=0,roll=null,GX=5,GY=3.5,talking=false,busy=false;
 var LOOK={center:[0,0],left:[-1,0],right:[1,0],up:[0,-1],down:[0,1],upleft:[-1,-1],upright:[1,-1],downleft:[-1,1],downright:[1,1]};
 function look(dir){var v=LOOK[dir]||LOOK.center;tgx=v[0]*GX;tgy=v[1]*GY;roll=null;}
 function eyeRoll(){var t0=performance.now(),dur=1100;roll=function(now){var p=(now-t0)/dur;if(p>=1){roll=null;tgx=0;tgy=0;return;}var a=-Math.PI/2+p*Math.PI*2;tgx=Math.cos(a)*GX;tgy=Math.sin(a)*GY;};}
 function talk(v){talking=(v===undefined)?!talking:!!v;var b=gid('n-talk');if(b)b.classList.toggle('on',talking);}

 // ---- gestures ----
 function gest(el,dur,fn){if(!el)return;el._t=(el._t||0)+1;var id=el._t,t0=performance.now();(function s(){if(el._t!==id)return;var p=Math.min(1,(performance.now()-t0)/dur);el.setAttribute('transform',fn(p));if(p<1)requestAnimationFrame(s);else el.removeAttribute('transform');})();}
 function nod(){gest(headrig,860,function(p){return 'translate(0 '+(Math.sin(p*Math.PI*4)*(1-p)*7).toFixed(2)+')';});}
 function shake(){gest(headrig,860,function(p){return 'rotate('+(Math.sin(p*Math.PI*4)*(1-p)*5).toFixed(2)+' 340 372)';});}
 function shrug(){gest(torso,800,function(p){return 'translate(0 '+(-Math.sin(p*Math.PI)*9).toFixed(2)+')';});gest(headrig,800,function(p){return 'translate(0 '+(Math.sin(p*Math.PI)*3.5).toFixed(2)+')';});}

 // ---- special: raise the camera, snap (flash), lower ----
 function takePhoto(){
  if(busy)return; busy=true;
  var dur=3000,t0=performance.now();
  (function s(){
   var p=Math.min(1,(performance.now()-t0)/dur),k;
   if(p<.28)k=easeIO(p/.28);
   else if(p<.66)k=1;
   else k=1-easeIO((p-.66)/.34);
   var jolt=(p>.42&&p<.5)?Math.sin((p-.42)/.08*Math.PI)*4:0;
   cam.setAttribute('transform','translate('+(10*k).toFixed(1)+' '+(-(205*k)+jolt).toFixed(1)+') rotate('+(-8*k).toFixed(2)+' 320 640)');
   headrig.setAttribute('transform','translate(0 '+(10*k).toFixed(2)+') rotate('+(3*k).toFixed(2)+' 340 372)');
   var f=0;
   if(p>.42&&p<.54){var q=(p-.42)/.12;f=Math.sin(q*Math.PI);}
   flash.setAttribute('opacity',f.toFixed(2));
   if(f>0){var sc=1+.45*f;flash.setAttribute('transform','translate('+(((1-sc)*128)-8*f).toFixed(1)+' '+((1-sc)*648).toFixed(1)+') scale('+sc.toFixed(3)+')');}
   else flash.removeAttribute('transform');
   if(p<1)requestAnimationFrame(s);
   else{cam.removeAttribute('transform');headrig.removeAttribute('transform');flash.setAttribute('opacity','0');busy=false;}
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
  lidL.setAttribute('transform','translate(306 258) scale(1 '+sL.toFixed(3)+') translate(-306 -258)');
  lidR.setAttribute('transform','translate(374 258) scale(1 '+sR.toFixed(3)+') translate(-374 -258)');
  bL.setAttribute('transform','translate(0 '+cur.bLY.toFixed(2)+') rotate('+cur.bLR.toFixed(2)+' 306 242)');
  bR.setAttribute('transform','translate(0 '+cur.bRY.toFixed(2)+') rotate('+cur.bRR.toFixed(2)+' 374 242)');
  var mt=cur.mt,mb=cur.mb,mw=cur.mw;
  if(talking){var tt=performance.now()*0.001;var o=(Math.sin(tt*15)*0.5+0.5)*(0.55+0.45*Math.sin(tt*5.7));mt=cur.mt-o*5;mb=cur.mb+o*9;mw=cur.mw+o*1.5;}
  var x0=(340-mw),x1=(340+mw);
  mouth.setAttribute('d','M'+x0.toFixed(1)+' '+cur.mc.toFixed(1)+' Q340 '+mt.toFixed(1)+' '+x1.toFixed(1)+' '+cur.mc.toFixed(1)+' Q340 '+mb.toFixed(1)+' '+x0.toFixed(1)+' '+cur.mc.toFixed(1)+' Z');
  requestAnimationFrame(apply);
 }
 apply();
 function doBlink(){var t0=performance.now();(function s(){var e=performance.now()-t0,v=0;if(e<80)v=e/80;else if(e<180)v=1-(e-80)/100;blink=Math.max(0,Math.min(1,v));if(e<180)requestAnimationFrame(s);else blink=0;})();}
 (function loop(){setTimeout(function(){doBlink();loop();},2800+Math.random()*2400);})();
 function setEmotion(n){if(!E[n])return;tgt=Object.assign({},E[n]);var b=document.querySelectorAll('.coach-ctrl [data-emo]');for(var i=0;i<b.length;i++)b[i].classList.toggle('on',b[i].getAttribute('data-emo')===n);}
 // prop action = taking a photo
 function raiseCup(){takePhoto();}
 var cyc=null,order=['neutral','happy','skeptical','angry','sad','surprised'],ci=0;
 function startCycle(){if(cyc)return;var c=gid('n-cycle');if(c){c.textContent='Auto-cycle: on';c.classList.add('on');}cyc=setInterval(function(){ci=(ci+1)%order.length;setEmotion(order[ci]);},2500);}
 function stopCycle(){if(cyc){clearInterval(cyc);cyc=null;}var c=gid('n-cycle');if(c){c.textContent='Auto-cycle: off';c.classList.remove('on');}}
 var ee=document.querySelectorAll('.coach-ctrl [data-emo]');for(var i=0;i<ee.length;i++){ee[i].addEventListener('click',function(){stopCycle();setEmotion(this.getAttribute('data-emo'));});}
 var lk=document.querySelectorAll('.coach-ctrl [data-look]');for(i=0;i<lk.length;i++){lk[i].addEventListener('click',function(){look(this.getAttribute('data-look'));});}
 function on(id,fn){var b=gid(id);if(b)b.addEventListener('click',fn);}
 on('n-cycle',function(){cyc?stopCycle():startCycle();});
 on('n-talk',function(){talk();});
 on('n-roll',function(){eyeRoll();});
 on('n-nod',nod);on('n-shake',shake);on('n-shrug',shrug);
 on('n-photo',takePhoto);
 window.coach={setEmotion:setEmotion,raiseCup:raiseCup,takePhoto:takePhoto,
  startCycle:startCycle,stopCycle:stopCycle,talk:talk,look:look,eyeRoll:eyeRoll,nod:nod,shake:shake,shrug:shrug,emotions:E};
 window.addEventListener('message',function(ev){var d=ev.data||{};switch(d.coachCmd){
   case 'emotion':setEmotion(d.value);break;case 'cycleStart':startCycle();break;case 'cycleStop':stopCycle();break;
   case 'raise':raiseCup();break;case 'takePhoto':takePhoto();break;
   case 'talk':talk(d.value);break;case 'look':look(d.value);break;
   case 'eyeRoll':eyeRoll();break;case 'nod':nod();break;case 'shake':shake();break;case 'shrug':shrug();break;}});
})();
