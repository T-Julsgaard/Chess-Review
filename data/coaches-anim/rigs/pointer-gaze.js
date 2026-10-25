(function(){
 // Coordinates arrive relative to the iframe, so CSS scaling in the review stays accurate.
 // Read each portrait's actual SVG and eye centres instead of duplicating rig geometry.
 var svg=document.querySelector('.coach-svg');
 var left=document.querySelector('#eyeL circle'),right=document.querySelector('#eyeR circle');
 if(!svg||!left||!right)return;
 window.addEventListener('message',function(ev){
  if(ev.source!==window.parent||!ev.data||ev.data.coachCmd!=='pointer')return;
  var p=ev.data.value;
  if(p===null){window.coachPointerGaze=null;if(window.coach)window.coach.look('center');return;}
  if(!p||!Number.isFinite(p.x)||!Number.isFinite(p.y))return;
  var rect=svg.getBoundingClientRect(),box=svg.viewBox.baseVal;
  if(!rect.width||!rect.height)return;
  var cx=(Number(left.getAttribute('cx'))+Number(right.getAttribute('cx')))/2;
  var cy=(Number(left.getAttribute('cy'))+Number(right.getAttribute('cy')))/2;
  var x=(p.x*window.innerWidth-rect.left-(cx-box.x)*rect.width/box.width)/(rect.width*.35);
  var y=(p.y*window.innerHeight-rect.top-(cy-box.y)*rect.height/box.height)/(rect.width*.35);
  var length=Math.max(1,Math.hypot(x,y));
  window.coachPointerGaze={x:x/length,y:y/length};
 });
})();
