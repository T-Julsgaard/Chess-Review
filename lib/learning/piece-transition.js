import {Chess} from '../chess.js';

const point = (square, flipped) => {
  const x=square.charCodeAt(0)-97, y=8-Number(square[1]);
  return {x:(flipped?7-x:x)+.5,y:(flipped?7-y:y)+.5};
};
const distance = (a,b) => Math.hypot(a.x-b.x,a.y-b.y);
// A position being set up may not be legal yet.
const pieces = fen => {const chess=new Chess();chess.load(fen,{skipValidation:true});return chess.board().flat().filter(Boolean);};
const edge = p => [
  {x:-.6,y:p.y},{x:8.6,y:p.y},{x:p.x,y:-.6},{x:p.x,y:8.6}
].sort((a,b)=>distance(a,p)-distance(b,p))[0];

// Keep identical pieces in place first. Pair the remaining pieces by proximity;
// only pieces of the same type and colour may share a route.
export function pieceRoutes(fromFen,toFen,{fromFlipped=false,toFlipped=false}={}) {
  const from=pieces(fromFen),to=pieces(toFen),routes=[];
  const route=(a,b)=>{
    const piece=a||b,origin=a&&point(a.square,fromFlipped),destination=b&&point(b.square,toFlipped);
    routes.push({type:piece.type,color:piece.color,from:origin||edge(destination),to:destination||edge(origin),kind:!a?'enter':!b?'leave':'move'});
    if(a)from.splice(from.indexOf(a),1);if(b)to.splice(to.indexOf(b),1);
  };
  for(const a of [...from]) {
    const b=to.find(b=>a.color===b.color&&a.type===b.type&&a.square===b.square);
    if(b)route(a,b);
  }
  while(from.length&&to.length) {
    let best=null,cost=Infinity;
    for(const a of from)for(const b of to)if(a.color===b.color&&a.type===b.type){
      const d=distance(point(a.square,fromFlipped),point(b.square,toFlipped));
      if(d<cost){best=[a,b];cost=d;}
    }
    if(!best)break;route(...best);
  }
  [...from].forEach(a=>route(a,null));[...to].forEach(b=>route(null,b));
  return routes;
}

export function slidePuzzlePieces(board,routes,makePiece) {
  const doc=board.ownerDocument,overlay=doc.createElement('div'),animations=[];
  overlay.className='puzzle-piece-transition';overlay.setAttribute('aria-hidden','true');
  board.classList.add('puzzle-arranging');board.append(overlay);
  let stagger=0,finished=false;
  const clean=()=>{if(finished)return;finished=true;overlay.remove();board.classList.remove('puzzle-arranging');};
  try {
    for(const route of routes) {
      const cell=doc.createElement('span');cell.className='puzzle-transition-piece';
      const {from,to}=route;cell.style.left=(to.x-.5)*12.5+'%';cell.style.top=(to.y-.5)*12.5+'%';
      cell.append(makePiece(route.type,route.color));overlay.append(cell);
      if(distance(from,to)<.01)continue;
      const delay=route.kind==='move'?0:Math.min(stagger++*24,192);
      animations.push(cell.animate([
        {transform:`translate(${(from.x-to.x)*100}%,${(from.y-to.y)*100}%)`},
        {transform:'translate(0,0)'}
      ],{duration:680+Math.min(distance(from,to)*24,220),delay,easing:'cubic-bezier(.4,0,.2,1)',fill:'both'}));
    }
  } catch {animations.forEach(a=>a.cancel());clean();}
  return {
    finished:Promise.allSettled(animations.map(a=>a.finished)).then(()=>{animations.forEach(a=>a.cancel());clean();}),
    cancel(){animations.forEach(a=>a.cancel());clean();}
  };
}
