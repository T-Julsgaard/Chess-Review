import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {Chess} from '../lib/chess.js';
import {LESSONS, OPENINGS, CATEGORIES, THEME_NAMES, playUci, linePositions, positionKey} from '../lib/learning/content.js';
import {legalPosition} from '../lib/learning/rules/E020-concepts.mjs';
import {validateExercise, validatePuzzleMove, validSquares} from '../lib/learning/validation.js';
import {puzzleExplanation} from '../lib/learning/workspace.js';

const library=JSON.parse(fs.readFileSync(new URL('../data/learning/puzzles.json',import.meta.url)));
const book=JSON.parse(fs.readFileSync(new URL('../data/book.json',import.meta.url))).epd;
test('every complete lesson has legal examples, a contrast, and passing exercises across all seven categories',()=>{
  assert.deepEqual(new Set(LESSONS.map(l=>l.category)),new Set(CATEGORIES));
  assert.equal(new Set(LESSONS.map(l=>l.id)).size,LESSONS.length);
  for(const l of LESSONS){
    assert.ok(l.explanation&&l.why&&l.mistakes.length>=2&&l.exercises.length>=2);
    assert.ok(l.exercises.some(e=>e.type==='choice'),'A board contrast is required: '+l.id);
    for(const ex of l.examples){const c=legalPosition(ex.fen);assert.equal(ex.captions.length,ex.moves.length+1);for(const move of ex.moves)playUci(c,move);legalPosition(c.fen());}
    for(const ex of l.exercises){
      legalPosition(ex.fen);
      const answer=ex.type==='choice'?ex.answer:ex.type==='squares'?(ex.selection==='one'?validSquares(ex).slice(0,1):validSquares(ex)):ex.solution?.[0];
      assert.ok(answer!==undefined,'Recorded solution required: '+l.id);
      assert.equal(validateExercise(ex,answer).status,'correct',l.id);
    }
    for(const id of l.prerequisites)assert.ok(LESSONS.some(p=>p.id===id));
  }
});
test('alternative valid moves and square answers are accepted without claiming move quality',()=>{
  const dev=LESSONS.find(l=>l.id==='development').exercises[0];
  for(const move of ['g1f3','b1c3']){const r=validateExercise(dev,move);assert.equal(r.status,'correct');assert.equal(r.moveQuality,'not-assessed');}
  const outpost=LESSONS.find(l=>l.id==='outpost').exercises[0];
  for(const sq of ['c5','e5'])assert.equal(validateExercise(outpost,[sq]).status,'correct');
  assert.equal(validateExercise(outpost,['c5','e5']).status,'incorrect');
  const discovery=LESSONS.find(l=>l.id==='discovery').exercises[0];
  for(const move of ['c3d4','c3b4','c3f6'])assert.equal(validateExercise(discovery,move).status,'correct');
  const promo=LESSONS.find(l=>l.id==='promotion').exercises[0];
  for(const piece of 'qrbn')assert.equal(validateExercise(promo,'e7e8'+piece).status,'correct');
  const luft=LESSONS.find(l=>l.id==='back-rank').exercises[2];
  for(const move of ['h7h6','h7h5','g7g6','f7f6'])assert.equal(validateExercise(luft,move).status,'correct');
});
test('unsupported objectives, failed admission and exhausted proofs abstain; legal wrong moves are separate',()=>{
  const fork=LESSONS.find(l=>l.id==='fork').exercises[0];
  assert.equal(validateExercise(fork,'e4f6',{maxNodes:1}).status,'inconclusive');
  assert.equal(validateExercise({...fork,objective:'event:unknown'},'e4f6').status,'inconclusive');
  assert.equal(validateExercise({...fork,type:'squares',rule:'unknown'},['a1']).status,'inconclusive');
  assert.equal(validateExercise({...fork,fen:'bad'},'e4f6').status,'inconclusive');
  assert.equal(validateExercise(fork,'e4e5').status,'illegal');
  assert.equal(validateExercise(fork,'e4c5').status,'incorrect');
});
test('50,000 distinct licensed puzzles replay legally and cover every theme and difficulty, with sampled runtime validation and explanations',()=>{
  assert.equal(library.schema,1);assert.equal(library.license,'CC0-1.0');assert.equal(library.puzzles.length,50_000);
  assert.equal(library.selection.target,50_000);assert.equal(library.selection.maximumPerGroup,2084);
  assert.equal(new Set(library.puzzles.map(p=>p.id)).size,library.puzzles.length);
  assert.equal(new Set(library.puzzles.map(p=>positionKey(p.fen))).size,library.puzzles.length);
  const quotas={};
  for(const p of library.puzzles){
    const detailed=(quotas[p.theme+':'+p.difficulty]||0)<3||parseInt(p.id,36)%503===0;
    const c=legalPosition(p.setup.fen);playUci(c,p.setup.move);assert.equal(c.fen(),p.fen);
    assert.ok(p.solution.length%2===1&&/^[a-f0-9]{64}$/.test(p.source.rowSha256)&&p.source.url.endsWith('/'+p.id));
    assert.equal(p.source.license,'CC0-1.0');assert.ok(p.themes.includes(p.theme));
    assert.equal(p.difficulty,p.rating<1300?'Introductory':p.rating<1850?'Intermediate':'Advanced');
    for(let i=0;i<p.solution.length;i++){
      // Exercise the runtime validator on a deterministic sample; every move in
      // every puzzle still receives full legal replay and admission below.
      if(!(i%2)&&detailed)assert.equal(validatePuzzleMove(p,i,p.solution[i]).status,'correct',p.id+':'+i);
      playUci(c,p.solution[i]);legalPosition(c.fen());
    }
    if(p.themes.includes('mate'))assert.ok(c.isCheckmate(),p.id);
    if(detailed)assert.equal(puzzleExplanation(p).length,p.solution.length);
    quotas[p.theme+':'+p.difficulty]=(quotas[p.theme+':'+p.difficulty]||0)+1;
  }
  assert.equal(Object.keys(quotas).length,36);
  for(const theme of Object.keys(THEME_NAMES))for(const difficulty of ['Introductory','Intermediate','Advanced']){
    const n=quotas[theme+':'+difficulty];assert.ok(n>=12&&n<=2084,theme+':'+difficulty+' = '+n);
    assert.equal(library.selection.groups[theme+difficulty],n);
  }
  assert.ok(library.selection.compressedBytesRead<=library.selection.maxDownloadBytes);
});
test('expansion preserves every original puzzle record and ID for saved progress and resumable puzzles',()=>{
  assert.equal(library.selection.retained,25_000);
  const retained=JSON.stringify(library.puzzles.slice(0,25_000));
  assert.equal(createHash('sha256').update(retained).digest('hex'),'46d54f3b6b68088a328b1b67f98c26597d35fe9505376ce26d586b39705ebf0b');
});
test('any legal checkmate wins a mate-in-one puzzle, while other moves remain incorrect or illegal',()=>{
  const p={fen:'7k/5K2/8/6Q1/8/8/8/8 w - - 0 1',solution:['g5g7'],themes:['mateIn1']};
  let alternatives=0;
  for(const move of new Chess(p.fen).moves({verbose:true})){
    const c=new Chess(p.fen);c.move(move);
    const answer=validatePuzzleMove(p,0,move.lan);
    assert.equal(answer.status,c.isCheckmate()?'correct':'incorrect',move.san);
    if(c.isCheckmate()){
      assert.equal(answer.terminal,true);assert.equal(answer.fen,c.fen());assert.equal(answer.move.lan,move.lan);
      if(move.lan!==p.solution[0])alternatives++;
    }
  }
  assert.ok(alternatives>0);
  assert.equal(validatePuzzleMove(p,0,'a1a2').status,'illegal');
  assert.equal(validatePuzzleMove(p,0,'g5g6').status,'incorrect');
});

test('bundled puzzles accept alternative final checkmates, including captures and underpromotions',()=>{
  for(const [id,alternatives] of [['0DybW',['c6a5']],['00NEO',['b7g7']],['00LRq',['e8b8','a7b8q','a7b8r','a7b8b','a7b8n']]]){
    const p=library.puzzles.find(p=>p.id===id),step=p.solution.length-1;
    const c=new Chess(p.fen);for(const move of p.solution.slice(0,step))playUci(c,move);
    for(const move of alternatives){
      const after=new Chess(c.fen());playUci(after,move);assert.ok(after.isCheckmate(),id+':'+move);
      const answer=validatePuzzleMove(p,step,move);
      assert.equal(answer.status,'correct',id+':'+move);assert.equal(answer.terminal,true);
      assert.equal(answer.fen,after.fen());assert.equal(answer.move.lan,move);
    }
  }
});
test('all opening variations have legal annotated moves and reuse named positions from the offline book',()=>{
  assert.equal(OPENINGS.length,36);
  assert.equal(new Set(OPENINGS.map(o=>o.id)).size,OPENINGS.length);
  assert.equal(new Set(OPENINGS.map(o=>o.title)).size,OPENINGS.length);
  const lines=OPENINGS.flatMap(o=>o.lines);
  assert.equal(lines.length,72);
  assert.equal(new Set(lines.map(line=>line.moves.join(' '))).size,lines.length);
  const bookNames={
    italian:/Italian Game/,ruy:/Ruy Lopez/,scotch:/Scotch Game/,'queens-gambit':/Queen's Gambit/,
    slav:/Slav Defense/,london:/London System/,sicilian:/Sicilian Defense/,french:/French Defense/,
    caro:/Caro-Kann Defense/,'kings-indian':/King's Indian Defense/,nimzo:/Nimzo-Indian Defense/,english:/English Opening/,
    vienna:/Vienna Game/,'kings-gambit':/King's Gambit/,'four-knights':/Four Knights Game/,petrov:/Petrov's Defense/,
    philidor:/Philidor Defense/,ponziani:/Ponziani Opening/,'danish-gambit':/Danish Gambit/,scandinavian:/Scandinavian Defense/,
    pirc:/Pirc Defense/,modern:/Modern Defense/,alekhine:/Alekhine Defense/,'semi-slav':/Semi-Slav Defense/,
    tarrasch:/Tarrasch Defense/,chigorin:/Chigorin Defense/,trompowsky:/Trompowsky Attack/,colle:/Colle System/,
    'queens-indian':/Queen's Indian Defense/,grunfeld:/Grünfeld Defense/,benoni:/Benoni Defense/,benko:/Benko Gambit/,
    catalan:/Catalan Opening/,reti:/Réti Opening/,dutch:/Dutch Defense/,bird:/Bird Opening/
  };
  for(const o of OPENINGS){
    assert.ok(o.plans&&o.structure&&o.mistakes&&o.tactic&&o.source);
    assert.ok(o.level>=1&&o.level<=3);
    assert.ok(o.lines.length>=2);assert.deepEqual(o.colors,['w','b']);
    assert.equal(new Set(o.lines.map(line=>line.name)).size,o.lines.length);
    for(const line of o.lines){
      const label=o.id+':'+line.name;
      assert.ok(line.name&&line.moves.length>=10,label);
      assert.equal(line.moves.length,line.notes.length,label);
      assert.ok(line.notes.every(note=>typeof note==='string'&&note.trim().length>0),label);
      const {positions}=linePositions(line);
      // Require this course's opening, rather than accepting a generic e4/d4 name.
      const names=positions.map(fen=>book[positionKey(fen)]).filter(Array.isArray);
      assert.ok(bookNames[o.id]&&names.some(entry=>bookNames[o.id].test(entry[1])),label);
      for(const fen of positions)legalPosition(fen);
    }
  }
});
test('opening perspectives match the usual repertoire side while both sides remain available',()=>{
  const black=['slav','sicilian','french','caro','kings-indian','nimzo','petrov','philidor','scandinavian','pirc','modern','alekhine','semi-slav','tarrasch','chigorin','queens-indian','grunfeld','benoni','benko','dutch'];
  const white=['italian','ruy','scotch','queens-gambit','london','english','vienna','kings-gambit','four-knights','ponziani','danish-gambit','trompowsky','colle','catalan','reti','bird'];
  assert.deepEqual(OPENINGS.filter(o=>o.defaultColor==='b').map(o=>o.id),black);
  assert.deepEqual(OPENINGS.filter(o=>o.defaultColor==='w').map(o=>o.id),white);
  for(const o of OPENINGS)assert.deepEqual(o.colors,['w','b']);
});

test('instructional tactical examples distinguish an uncovered attack from a safe gain and replay the Italian king hunt legally',()=>{
  const discovery=LESSONS.find(l=>l.id==='discovery').exercises[0],c=new Chess(discovery.fen);
  playUci(c,'c3d4');assert.equal(c.move('Qxc1+').captured,'r');
  const italian=new Chess();for(const san of 'e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5 d5 exd5 Nxd5 Nxf7 Kxf7 Qf3+'.split(' '))italian.move(san);
  assert.ok(italian.isCheck());assert.equal(italian.get('f7').type,'k');
});
