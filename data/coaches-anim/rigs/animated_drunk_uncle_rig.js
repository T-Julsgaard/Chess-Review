(function(){
 function gid(id){return document.getElementById(id);}
 // asymmetric mouth: mcl/mcr = left/right corner Y (his grin is lopsided)
 var E={
  neutral:{bLY:0,bRY:-2,bLR:-2,bRR:1,sqL:.30,sqR:.22,mt:330,mb:343,mw:28,mcl:337,mcr:327},
  happy:{bLY:-3,bRY:-4,bLR:-3,bRR:2,sqL:.38,sqR:.30,mt:325,mb:349,mw:32,mcl:331,mcr:322},
  sad:{bLY:-1,bRY:-1,bLR:-8,bRR:8,sqL:.30,sqR:.30,mt:345,mb:348,mw:22,mcl:347,mcr:346},
  angry:{bLY:4,bRY:4,bLR:9,bRR:-9,sqL:.42,sqR:.42,mt:342,mb:345,mw:23,mcl:344,mcr:343},
  surprised:{bLY:-10,bRY:-11,bLR:0,bRR:0,sqL:.05,sqR:.05,mt:324,mb:352,mw:17,mcl:338,mcr:335},
  skeptical:{bLY:4,bRY:-10,bLR:6,bRR:-2,sqL:.36,sqR:.10,mt:337,mb:342,mw:25,mcl:341,mcr:331}
 };
 var cur=Object.assign({},E.neutral),tgt=Object.assign({},E.neutral),blink=0;
 var lidL=gid('lidL'),lidR=gid('lidR'),bL=gid('browL'),bR=gid('browR'),
     mouth=gid('mouth'),eyeL=gid('eyeL'),eyeR=gid('eyeR'),
     headrig=gid('headrig'),torso=gid('torso'),
     grip=gid('cangrip'),can=gid('beercan'),burpfx=gid('burpfx');
 function lerp(a,b,t){return a+(b-a)*t;}
 function easeIO(t){return t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2;}

 // ---- gaze ----
 var gx=0,gy=0,tgx=0,tgy=0,roll=null,GX=5,GY=3.5,talking=false,drinking=false,burping=false,busy=false;
 var LOOK={center:[0,0],left:[-1,0],right:[1,0],up:[0,-1],down:[0,1],upleft:[-1,-1],upright:[1,-1],downleft:[-1,1],downright:[1,1]};
 function look(dir){var v=LOOK[dir]||LOOK.center;tgx=v[0]*GX;tgy=v[1]*GY;roll=null;}
 function eyeRoll(){var t0=performance.now(),dur=1100;roll=function(now){var p=(now-t0)/dur;if(p>=1){roll=null;tgx=0;tgy=0;return;}var a=-Math.PI/2+p*Math.PI*2;tgx=Math.cos(a)*GX;tgy=Math.sin(a)*GY;};}
 function talk(v){talking=(v===undefined)?!talking:!!v;var b=gid('u-talk');if(b)b.classList.toggle('on',talking);}

 // ---- gestures ----
 function gest(el,dur,fn){if(!el)return;el._t=(el._t||0)+1;var id=el._t,t0=performance.now();(function s(){if(el._t!==id)return;var p=Math.min(1,(performance.now()-t0)/dur);el.setAttribute('transform',fn(p));if(p<1)requestAnimationFrame(s);else el.removeAttribute('transform');})();}
 function nod(){gest(headrig,820,function(p){return 'translate(0 '+(Math.sin(p*Math.PI*4)*(1-p)*9).toFixed(2)+')';});}
 function shake(){gest(headrig,820,function(p){return 'rotate('+(Math.sin(p*Math.PI*4)*(1-p)*6).toFixed(2)+' 340 368)';});}
 function shrug(){gest(torso,780,function(p){return 'translate(0 '+(-Math.sin(p*Math.PI)*10).toFixed(2)+')';});gest(headrig,780,function(p){return 'translate(0 '+(Math.sin(p*Math.PI)*4).toFixed(2)+')';});}

 // ---- special: big sip (raise can high, pour, lower) ----
 function sip(){
  if(busy)return; busy=true;
  var dur=2700,t0=performance.now();
  (function s(){
   var p=Math.min(1,(performance.now()-t0)/dur),k,rock=0;
   if(p<.26)k=easeIO(p/.26);
   else if(p<.74){k=1;rock=Math.sin((p-.26)*22)*2.5;}
   else k=1-easeIO((p-.74)/.26);
   drinking=(p>.2&&p<.8);
   grip.setAttribute('transform','translate('+(k*6).toFixed(1)+' '+(-242*k).toFixed(1)+') rotate('+(-52*k+rock).toFixed(1)+' 340 598)');
   headrig.setAttribute('transform','rotate('+(-5*k).toFixed(2)+' 340 368) translate(0 '+(2*k).toFixed(2)+')');
   if(p<1)requestAnimationFrame(s);
   else{grip.removeAttribute('transform');headrig.removeAttribute('transform');drinking=false;busy=false;}
  })();
 }

 // ---- special: burp (with puff) ----
 function burp(){
  if(burping)return; burping=true;
  gest(torso,520,function(p){return 'translate(0 '+(-6*Math.sin(p*Math.PI)).toFixed(2)+')';});
  var dur=950,t0=performance.now();
  (function s(){
   var p=Math.min(1,(performance.now()-t0)/dur);
   burpfx.setAttribute('opacity',(p<.15?p/.15:1-(p-.15)/.85).toFixed(2));
   burpfx.setAttribute('transform','translate('+(398+12*p).toFixed(1)+' '+(316-46*p).toFixed(1)+') scale('+(1+.7*p).toFixed(2)+')');
   if(p<1)requestAnimationFrame(s);
   else{burpfx.setAttribute('opacity','0');burping=false;}
  })();
 }

 // ---- special: throw the can, then grab a new one ----
 function throwCan(){
  if(busy)return; busy=true;
  var dur=750,t0=performance.now();
  (function fly(){
   var p=Math.min(1,(performance.now()-t0)/dur);
   var tx=330*p, ty=-480*p+430*p*p, rot=640*p;
   can.setAttribute('transform','translate('+tx.toFixed(1)+' '+ty.toFixed(1)+') rotate('+rot.toFixed(1)+' 340 598)');
   if(p<1)requestAnimationFrame(fly);
   else{
    can.style.display='none';
    setTimeout(function(){
     can.style.display='';
     var d2=340,t1=performance.now();
     (function pop(){
      var q=Math.min(1,(performance.now()-t1)/d2);
      var sc=q<.7?(.3+.85*(q/.7)):(1.15-.15*((q-.7)/.3));
      can.setAttribute('transform','translate('+((1-sc)*340).toFixed(1)+' '+(((1-sc)*598)+(1-q)*10).toFixed(1)+') scale('+sc.toFixed(3)+')');
      if(q<1)requestAnimationFrame(pop);
      else{can.removeAttribute('transform');busy=false;}
     })();
    },480);
   }
  })();
 }

 function apply(){
  var k=['bLY','bRY','bLR','bRR','sqL','sqR','mt','mb','mw','mcl','mcr'],i;
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
  if(drinking){mt=cur.mt-9;mb=cur.mb+15;mw=cur.mw-7;}
  if(burping){mt=cur.mt-10;mb=cur.mb+16;mw=cur.mw-4;}
  var x0=(340-mw),x1=(340+mw);
  mouth.setAttribute('d','M'+x0.toFixed(1)+' '+cur.mcl.toFixed(1)+' Q340 '+mt.toFixed(1)+' '+x1.toFixed(1)+' '+cur.mcr.toFixed(1)+' Q340 '+mb.toFixed(1)+' '+x0.toFixed(1)+' '+cur.mcl.toFixed(1)+' Z');
  requestAnimationFrame(apply);
 }
 apply();
 function doBlink(){var t0=performance.now();(function s(){var e=performance.now()-t0,v=0;if(e<80)v=e/80;else if(e<180)v=1-(e-80)/100;blink=Math.max(0,Math.min(1,v));if(e<180)requestAnimationFrame(s);else blink=0;})();}
 (function loop(){setTimeout(function(){doBlink();loop();},2400+Math.random()*2400);})();
 function setEmotion(n){if(!E[n])return;tgt=Object.assign({},E[n]);var b=document.querySelectorAll('.coach-ctrl [data-emo]');for(var i=0;i<b.length;i++)b[i].classList.toggle('on',b[i].getAttribute('data-emo')===n);}
 // prop action = the big sip, so the viewer's "Toggle prop" works on him too
 function raiseCup(){sip();}
 var cyc=null,order=['neutral','happy','skeptical','angry','sad','surprised'],ci=0;
 function startCycle(){if(cyc)return;var c=gid('u-cycle');if(c){c.textContent='Auto-cycle: on';c.classList.add('on');}cyc=setInterval(function(){ci=(ci+1)%order.length;setEmotion(order[ci]);},2500);}
 function stopCycle(){if(cyc){clearInterval(cyc);cyc=null;}var c=gid('u-cycle');if(c){c.textContent='Auto-cycle: off';c.classList.remove('on');}}
 var ee=document.querySelectorAll('.coach-ctrl [data-emo]');for(var i=0;i<ee.length;i++){ee[i].addEventListener('click',function(){stopCycle();setEmotion(this.getAttribute('data-emo'));});}
 var lk=document.querySelectorAll('.coach-ctrl [data-look]');for(i=0;i<lk.length;i++){lk[i].addEventListener('click',function(){look(this.getAttribute('data-look'));});}
 function on(id,fn){var b=gid(id);if(b)b.addEventListener('click',fn);}
 on('u-cycle',function(){cyc?stopCycle():startCycle();});
 on('u-talk',function(){talk();});
 on('u-roll',function(){eyeRoll();});
 on('u-nod',nod);on('u-shake',shake);on('u-shrug',shrug);
 on('u-sip',sip);on('u-burp',burp);on('u-throw',throwCan);
 window.coach={setEmotion:setEmotion,raiseCup:raiseCup,sip:sip,burp:burp,throwCan:throwCan,
  startCycle:startCycle,stopCycle:stopCycle,talk:talk,look:look,eyeRoll:eyeRoll,nod:nod,shake:shake,shrug:shrug,emotions:E};
 window.addEventListener('message',function(ev){var d=ev.data||{};switch(d.coachCmd){
   case 'emotion':setEmotion(d.value);break;case 'cycleStart':startCycle();break;case 'cycleStop':stopCycle();break;
   case 'raise':raiseCup();break;case 'sip':sip();break;case 'burp':burp();break;case 'throwCan':throwCan();break;
   case 'talk':talk(d.value);break;case 'look':look(d.value);break;
   case 'eyeRoll':eyeRoll();break;case 'nod':nod();break;case 'shake':shake();break;case 'shrug':shrug();break;}});
})();
