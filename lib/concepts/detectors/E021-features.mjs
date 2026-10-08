const other = c => c === 'w' ? 'b' : 'w';
const x = s => s.charCodeAt(0)-97, y = s => +s[1];
const direction = c => c === 'w' ? 1 : -1;
const colorSquare = s => (x(s)+y(s))%2;
const all = c => c.board().flat().filter(Boolean);
const key = list => [...list].sort().join('+');
const feature = (id,evidence) => ({id,evidence,qualityClaim:false});
const sorted = list => [...list].sort();

export function segment(a,b) {
  const dx=x(b)-x(a),dy=y(b)-y(a);
  if (!dx && !dy) return null;
  if (dx && dy && Math.abs(dx)!==Math.abs(dy)) return null;
  const list=[],sx=Math.sign(dx),sy=Math.sign(dy);
  let xx=x(a)+sx,yy=y(a)+sy;
  while(xx!==x(b)||yy!==y(b)){list.push(String.fromCharCode(97+xx)+yy);xx+=sx;yy+=sy;}
  return list;
}
export function unobstructed(c,a,b){const between=segment(a,b);return between!==null&&between.every(s=>!c.get(s));}

export function pawnFeatures(c,color){
  const own=all(c).filter(p=>p.type==='p'&&p.color===color),enemy=all(c).filter(p=>p.type==='p'&&p.color!==color),dir=direction(color);
  const ownFiles=sorted(new Set(own.map(p=>p.square[0]))),isolated=[],passed=[],protectedPassed=[],chains=[],duos=[],rams=[],tension=[];
  for(const p of own){
    if(!own.some(q=>Math.abs(x(q.square)-x(p.square))===1))isolated.push(p.square);
    if(!enemy.some(q=>Math.abs(x(q.square)-x(p.square))<=1&&(y(q.square)-y(p.square))*dir>0))passed.push(p.square);
    for(const q of own){
      if(Math.abs(x(q.square)-x(p.square))===1&&(y(q.square)-y(p.square))*dir===1)chains.push({base:p.square,head:q.square});
      if(x(q.square)===x(p.square)+1&&y(q.square)===y(p.square))duos.push([p.square,q.square]);
    }
    for(const q of enemy){
      if(x(q.square)===x(p.square)&&(y(q.square)-y(p.square))*dir===1)rams.push({own:p.square,enemy:q.square});
      if(Math.abs(x(q.square)-x(p.square))===1&&(y(q.square)-y(p.square))*dir===1)tension.push({own:p.square,enemy:q.square});
    }
  }
  // The last double-step pawn is not treated as a passer while a legal
  // en-passant capture can remove it, despite the capturer being level with it.
  if(c.turn()!==color&&c.fen().split(' ')[3]!=='-'){
    for(const capture of c.moves({verbose:true}).filter(m=>m.isEnPassant())){
      const square=capture.to[0]+capture.from[1],index=passed.indexOf(square);if(index>=0)passed.splice(index,1);
    }
  }
  for(const sq of passed)if(chains.some(edge=>edge.head===sq))protectedPassed.push(sq);
  const connected=[];
  for(const a of passed)for(const b of passed)if(x(b)===x(a)+1&&Math.abs(y(a)-y(b))<=1)connected.push([a,b]);
  const doubled=ownFiles.filter(f=>own.filter(p=>p.square[0]===f).length>=2),tripled=ownFiles.filter(f=>own.filter(p=>p.square[0]===f).length>=3);
  const islands=[];for(const file of ownFiles){if(!islands.length||x(file+'1')-x(islands.at(-1).at(-1)+'1')>1)islands.push([file]);else islands.at(-1).push(file);}
  const components=[];const chainSquares=new Set(chains.flatMap(e=>[e.base,e.head]));
  while(chainSquares.size){const group=new Set([chainSquares.values().next().value]);let changed=true;while(changed){changed=false;for(const e of chains){if(group.has(e.base)||group.has(e.head)){for(const s of[e.base,e.head])if(!group.has(s)){group.add(s);changed=true;}}}}
    const members=sorted(group),edges=chains.filter(e=>group.has(e.base)&&group.has(e.head));
    const furthest=Math.max(...members.map(s=>y(s)*dir));
    components.push({members,bases:members.filter(s=>!edges.some(e=>e.head===s)),heads:members.filter(s=>y(s)*dir===furthest),terminals:members.filter(s=>!edges.some(e=>e.base===s)),edges});members.forEach(s=>chainSquares.delete(s));}
  const majority=wing=>{const files=wing==='queenside'?'abcd':'efgh';return{wing,files,own:own.filter(p=>files.includes(p.square[0])).length,enemy:enemy.filter(p=>files.includes(p.square[0])).length};};
  const phalanxes=[];for(let rank=2;rank<=7;rank++){const row=own.filter(p=>y(p.square)===rank).map(p=>p.square).sort();let group=[];for(const s of row){if(group.length&&x(s)-x(group.at(-1))!==1){if(group.length>=3)phalanxes.push(group);group=[];}group.push(s);}if(group.length>=3)phalanxes.push(group);}
  return{isolated:sorted(isolated),passed:sorted(passed),protectedPassed:sorted(protectedPassed),connected,chains,components,duos,phalanxes,rams,tension,doubled,tripled,islands,majorities:['queenside','kingside'].map(majority)};
}

export function positionFeatures(c,color){
  const board=all(c),own=board.filter(p=>p.color===color),enemy=board.filter(p=>p.color!==color),pawns=pawnFeatures(c,color);
  const files='abcdefgh'.split('').map(file=>({file,own:own.filter(p=>p.type==='p'&&p.square[0]===file).length,enemy:enemy.filter(p=>p.type==='p'&&p.square[0]===file).length}));
  const rooks=own.filter(p=>p.type==='r'),queens=own.filter(p=>p.type==='q'),bishops=own.filter(p=>p.type==='b'),connections=[],queenRook=[],queenBishop=[];
  for(let i=0;i<rooks.length;i++)for(let j=i+1;j<rooks.length;j++){const a=rooks[i].square,b=rooks[j].square;if((x(a)===x(b)||y(a)===y(b))&&unobstructed(c,a,b))connections.push({squares:sorted([a,b]),file:x(a)===x(b)?a[0]:null});}
  for(const q of queens){for(const r of rooks)if((x(q.square)===x(r.square)||y(q.square)===y(r.square))&&unobstructed(c,q.square,r.square))queenRook.push({queen:q.square,rook:r.square});
    for(const b of bishops)if(Math.abs(x(q.square)-x(b.square))===Math.abs(y(q.square)-y(b.square))&&unobstructed(c,q.square,b.square))queenBishop.push({queen:q.square,bishop:b.square});}
  const tripling=[];for(const file of'abcdefgh'){const group=own.filter(p=>p.square[0]===file&&['r','q'].includes(p.type));if(group.filter(p=>p.type==='r').length<2||!group.some(p=>p.type==='q'))continue;
    const ordered=[...group].sort((a,b)=>y(a.square)-y(b.square)),between=segment(ordered[0].square,ordered.at(-1).square);
    if(between.every(s=>!c.get(s)||group.some(p=>p.square===s)))tripling.push({file,squares:sorted(group.map(p=>p.square))});}
  const behind=[];for(const pawnColor of[color,other(color)])for(const sq of pawnFeatures(c,pawnColor).passed)for(const r of rooks){if(x(r.square)===x(sq)&&(y(sq)-y(r.square))*direction(pawnColor)>0&&unobstructed(c,r.square,sq))behind.push({rook:r.square,pawn:sq,pawnColor});}
  const blockers=[];for(const sq of pawnFeatures(c,other(color)).passed){const front=sq[0]+(y(sq)+direction(other(color))),p=c.get(front);if(p?.color===color&&['n','r'].includes(p.type))blockers.push({piece:p.type,square:front,pawn:sq});}
  const ownB=bishops,enemyB=enemy.filter(p=>p.type==='b'),bishopPair=new Set(bishops.map(p=>colorSquare(p.square))).size===2;
  const bishopEnding=ownB.length===1&&enemyB.length===1&&board.every(p=>['k','p','b'].includes(p.type))?{own:ownB[0].square,enemy:enemyB[0].square,opposite:colorSquare(ownB[0].square)!==colorSquare(enemyB[0].square)}:null;
  const ownArmy=own.filter(p=>!['k','p'].includes(p.type)).map(p=>p.type).sort().join(''),enemyArmy=enemy.filter(p=>!['k','p'].includes(p.type)).map(p=>p.type).sort().join('');
  const kings=board.filter(p=>p.type==='k'),ka=kings.find(p=>p.color===color).square,kb=kings.find(p=>p.color!==color).square,dx=Math.abs(x(ka)-x(kb)),dy=Math.abs(y(ka)-y(kb));
  let opposition=null;if(unobstructed(c,ka,kb)){if((dx===0&&dy===2)||(dy===0&&dx===2))opposition='direct';else if((dx===0&&dy>=4&&dy%2===0)||(dy===0&&dx>=4&&dx%2===0))opposition='distant';else if(dx===2&&dy===2)opposition='diagonal';}
  return{color,pawns,files,connections,queenRook,queenBishop,tripling,behind,blockers,bishopPair,bishopEnding,ownArmy,enemyArmy,opposition:opposition?{kind:opposition,kings:[ka,kb]}:null,rooks:rooks.map(p=>p.square),bishops:bishops.map(p=>p.square),king:ka};
}

// Translate the moved pawn identity so an ordinary advance of an existing
// feature is not falsely called a newly created structural relationship.
function oldSquare(s,move){return move.piece==='p'&&!move.promotion&&s===move.to?move.from:s;}
const newSquare=(s,old,move)=>!old.includes(oldSquare(s,move));
function newPair(pair,oldPairs,move){const mapped=key(pair.map(s=>oldSquare(s,move)));return!oldPairs.some(p=>key(p)===mapped);}

export function structuralEvents(before,after,move){
  const color=move.color,a=positionFeatures(before,color),b=positionFeatures(after,color),result=[];
  const add=(id,e)=>result.push(feature(id,e));
  const freshPassed=b.pawns.passed.filter(s=>newSquare(s,a.pawns.passed,move));
  if(freshPassed.length)add('passed-pawn',{squares:freshPassed});
  if(move.piece==='p'&&!move.promotion&&a.pawns.passed.includes(move.from)&&b.pawns.passed.includes(move.to))add('passed-pawn-advance',{from:move.from,to:move.to});
  if(move.promotion&&a.pawns.passed.includes(move.from))add('passed-pawn-promotion',{square:move.to,piece:move.promotion});
  const protectedFresh=b.pawns.protectedPassed.filter(s=>newSquare(s,a.pawns.protectedPassed,move));if(protectedFresh.length)add('protected-passed-pawn',{squares:protectedFresh});
  for(const pair of b.pawns.connected)if(newPair(pair,a.pawns.connected,move))add('connected-passed-pawns',{squares:pair});
  const isolated=b.pawns.isolated.filter(s=>newSquare(s,a.pawns.isolated,move));if(isolated.length)add('isolated-pawn',{squares:isolated,iqp:isolated.filter(s=>s[0]==='d')});
  for(const file of b.pawns.tripled)if(!a.pawns.tripled.includes(file))add('tripled-pawns',{file,squares:all(after).filter(p=>p.color===color&&p.type==='p'&&p.square[0]===file).map(p=>p.square)});
  for(const file of b.pawns.doubled)if(!a.pawns.doubled.includes(file)&&!b.pawns.tripled.includes(file))add('doubled-pawns',{file,squares:all(after).filter(p=>p.color===color&&p.type==='p'&&p.square[0]===file).map(p=>p.square)});
  if(a.pawns.islands.length!==b.pawns.islands.length)add('pawn-islands',{before:a.pawns.islands.length,after:b.pawns.islands.length,files:b.pawns.islands});
  for(const component of b.pawns.components){const fresh=component.edges.filter(e=>!a.pawns.chains.some(o=>o.base===oldSquare(e.base,move)&&o.head===oldSquare(e.head,move)));if(fresh.length)add('pawn-chain',{...component,newEdges:fresh});}
  for(const pair of b.pawns.duos)if(newPair(pair,a.pawns.duos,move))add('pawn-duo',{squares:pair});
  for(const group of b.pawns.phalanxes)if(!a.pawns.phalanxes.some(old=>key(old)===key(group.map(s=>oldSquare(s,move)))))add('pawn-phalanx',{squares:group});
  for(const ram of b.pawns.rams)if(!a.pawns.rams.some(r=>r.own===oldSquare(ram.own,move)&&r.enemy===ram.enemy))add('pawn-ram',ram);
  for(const t of b.pawns.tension)if(!a.pawns.tension.some(o=>o.own===oldSquare(t.own,move)&&o.enemy===t.enemy))add('pawn-tension',t);
  if(move.piece==='p'&&move.captured==='p'&&a.pawns.tension.some(t=>t.own===move.from&&t.enemy===move.to))add('resolves-pawn-tension',{from:move.from,to:move.to});
  for(const majority of b.pawns.majorities){const previous=a.pawns.majorities.find(m=>m.wing===majority.wing);if(majority.own>majority.enemy&&previous.own<=previous.enemy)add('pawn-majority',majority);}
  const opposite=p=>p.majorities.some(m=>m.own>m.enemy)&&p.majorities.some(m=>m.own<m.enemy);if(opposite(b.pawns)&&!opposite(a.pawns))add('opposite-wing-majorities',{wings:b.pawns.majorities});
  for(const file of b.files){const prior=a.files.find(f=>f.file===file.file),occupies=['r','q'].includes(move.promotion||move.piece)&&move.to[0]===file.file;
    if(file.own===0&&file.enemy===0){if(prior.own+prior.enemy>0)add('file-opening',{file:file.file});if(occupies&&(move.from[0]!==file.file||prior.own+prior.enemy>0||move.promotion))add('open-file',{file:file.file,piece:move.promotion||move.piece,square:move.to});}
    if(file.own===0&&file.enemy>0&&occupies&&(move.from[0]!==file.file||prior.own>0||move.promotion))add('semi-open-file',{file:file.file,piece:move.promotion||move.piece,square:move.to});}
  for(const pair of b.connections)if(!a.connections.some(p=>p.file===pair.file&&key(p.squares)===key(pair.squares.map(s=>s===move.to?move.from:s))))add('connected-rooks',pair);
  for(const pair of b.queenRook)if(!a.queenRook.some(p=>p.queen===(pair.queen===move.to?move.from:pair.queen)&&p.rook===(pair.rook===move.to?move.from:pair.rook)))add('queen-rook-battery',pair);
  for(const pair of b.queenBishop)if(!a.queenBishop.some(p=>p.queen===(pair.queen===move.to?move.from:pair.queen)&&p.bishop===(pair.bishop===move.to?move.from:pair.bishop)))add('queen-bishop-battery',pair);
  for(const trio of b.tripling)if(!a.tripling.some(t=>t.file===trio.file))add('tripling-file',trio);
  for(const r of b.behind)if(!a.behind.some(o=>o.rook===(r.rook===move.to?move.from:r.rook)&&o.pawn===oldSquare(r.pawn,move)&&o.pawnColor===r.pawnColor))add('rook-behind-passer',r);
  for(const blocker of b.blockers)if(!a.blockers.some(o=>o.square===(blocker.square===move.to?move.from:blocker.square)&&o.pawn===blocker.pawn&&o.piece===blocker.piece))add('passed-pawn-blockade',blocker);
  const seventh=color==='w'?7:2,newSeventh=b.rooks.filter(s=>y(s)===seventh&&!a.rooks.includes(s));if(newSeventh.length){const total=b.rooks.filter(s=>y(s)===seventh);add(total.length>=2?'two-rooks-seventh':'rook-seventh',{squares:total,rank:seventh});}
  if(b.bishopPair&&!a.bishopPair)add('bishop-pair',{squares:b.bishops});
  if(b.bishopEnding&&(!a.bishopEnding||a.bishopEnding.opposite!==b.bishopEnding.opposite))add(b.bishopEnding.opposite?'opposite-bishop-ending':'same-bishop-ending',b.bishopEnding);
  const matchArmy=(own,enemy)=>b.ownArmy===own&&enemy.includes(b.enemyArmy);
  if(a.ownArmy!==b.ownArmy||a.enemyArmy!==b.enemyArmy){
    const armies={own:b.ownArmy,enemy:b.enemyArmy};
    if(matchArmy('r',['bb','bn','nn']))add('rook-two-minors',armies);
    if(matchArmy('q',['rr']))add('queen-two-rooks',armies);
    if(matchArmy('q',['br','nr']))add('queen-rook-minor',armies);
    if(matchArmy('r',['b','n']))add('rook-minor',armies);
    if(matchArmy('b',['n'])||matchArmy('n',['b']))add('bishop-knight',armies);
  }
  if(move.captured||move.promotion){const values={p:1,n:3,b:3,r:5,q:9,k:0},own=all(after).filter(p=>p.color===color).reduce((v,p)=>v+values[p.type],0),enemy=all(after).filter(p=>p.color!==color).reduce((v,p)=>v+values[p.type],0);add('material-balance',{own,enemy,delta:own-enemy,values});}
  const moved=move.promotion||move.piece;
  if(moved==='b'){
    const squares=color==='w'?['b2','g2']:['b7','g7'];if(squares.includes(move.to)&&(!squares.includes(move.from)||move.promotion))add('fianchetto',{square:move.to});
    const long=s=>x(s)===y(s)-1||x(s)+y(s)===8;if(long(move.to)&&(!long(move.from)||move.promotion))add('long-diagonal-bishop',{square:move.to,diagonal:x(move.to)===y(move.to)-1?'a1-h8':'h1-a8'});
  }
  const central=['d4','e4','d5','e5'];
  if(moved==='n'){
    if(central.includes(move.to)&&!central.includes(move.from))add('centralized-knight',{square:move.to});
    const rim=s=>['a','h'].includes(s[0])||[1,8].includes(y(s));if(rim(move.to)&&(!rim(move.from)||move.promotion))add('rim-knight',{square:move.to});
    const rank=color==='w'?y(move.to):9-y(move.to),oldRank=color==='w'?y(move.from):9-y(move.from);if([5,6].includes(rank)&&(rank!==oldRank||move.promotion))add('advanced-knight',{square:move.to,relativeRank:rank});
  }
  if(moved==='k'&&central.includes(move.to)&&!central.includes(move.from))add('central-king',{square:move.to});
  if(b.opposition&&(!a.opposition||a.opposition.kind!==b.opposition.kind))add('king-opposition',b.opposition);
  if(move.piece==='p'&&!move.promotion){const gained=central.filter(s=>after.attackers(s,color).includes(move.to)&&!before.attackers(s,color).includes(move.from));if(gained.length)add('central-pawn-control',{pawn:move.to,squares:gained});
    const center=c=>all(c).filter(p=>p.type==='p'&&p.color===color&&central.includes(p.square)).map(p=>p.square);if(center(after).length>=2&&center(before).length<2)add('pawn-center',{squares:sorted(center(after))});}
  return result;
}
