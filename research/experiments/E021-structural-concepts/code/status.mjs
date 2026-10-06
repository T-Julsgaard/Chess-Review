import {renderStatus as baseline} from '../../E020-coach-concepts/code/status.mjs';

const scopes = new Map();
function add(names, scope, partial=false) { for(const name of names.split('|')) scopes.set(name,{scope,partial}); }
add('Passed pawn|Passed pawns|Creating a passed pawn|Passed pawn creation','passed-pawn geometry, including legal en-passant exception; creation or advance');
add('Passed pawn promotion','promotion of a previously identified passer');
add('Protected passed pawn','passer attacked by a friendly pawn; legal recapture or safe advance not promised');
add('Connected passed pawns','adjacent-file passers at most one rank apart; reciprocal protection in supplied wording not established',true);
add("Isolated pawn|Isolated queen's pawn / IQP|Isolated queen's pawn structure",'no friendly pawn on either neighboring file; IQP restricted to d-file');
add('Doubled pawns|Tripled pawns','same-file friendly pawn counts');
add('Pawn chain|Base of the pawn chain|Head of the pawn chain','directed pawn-support component; rear bases and most advanced heads');
add('Pawn island','contiguous occupied-file groups');
add('Pawn duo|Pawn phalanx','adjacent same-rank pawns; phalanx requires at least three');
add('Ram','opposing pawns block straight advancement');
add('Pawn tension|Releasing tension','opposing pawn attacks; resolving capture');
add('Pawn majority|Pawn majorities|Queenside majority|Kingside majority|Opposite-wing pawn majorities|Three-versus-two queenside majority|Four-versus-three kingside structure','counts on fixed a–d/e–h wings; no plan or advantage claim');
add('Open file|Open files|Semi-open file|Rook on an open file|Rook on a semi-open file|Occupying an open file','pawn-free file geometry and new rook/queen occupation');
add('Connected rooks|Connect the rooks|Doubling rooks','unobstructed same-rank/file rook alignment; geometric support only');
add('Tripling on a file','two rooks and queen on one file without other intervening pieces');
add('Queen-rook battery|Queen-bishop battery','unobstructed queen–rook orthogonal or queen–bishop diagonal alignment');
add('Battery|Queen battery','queen–rook and queen–bishop types only',true);
add('Rook behind a passed pawn|Rook behind the passed pawn','unobstructed rook behind own or enemy passer; no best-placement claim');
add('Knight blockade of passed pawn|Rook blockade','piece occupies enemy passer’s next forward square; no permanent restraint claim');
add('Rook on the seventh rank|Rook on the second rank|Two rooks on the seventh|Seventh-rank rook','relative seventh rank (White 7, Black 2); new placement');
add('Bishop pair','both square-color complexes represented; excludes two same-color promoted bishops');
add('Opposite-colored bishops|Same-colored bishops|Opposite-colored bishop ending|Same-colored bishop ending','one bishop per side, only kings/pawns/bishops remain; square-color classification');
add('Rook versus two minor pieces|Queen versus two rooks|Queen versus rook and minor piece|Rook versus minor piece|Bishop versus knight|Knight versus bishop|Rook versus bishop|Rook versus knight','exact non-pawn army combinations only; strategic comparison deferred',true);
add('Fianchetto','bishop arrives on b2/g2/b7/g7; development history and suitability not inferred',true);
add('Long-diagonal bishop','bishop arrives on a1–h8 or h1–a8; full diagonal control not established',true);
add('Centralized knight','knight arrives on d4/e4/d5/e5');
add('Central king|King centralization|Centralizing the king','king arrives on d4/e4/d5/e5; safety and benefit not established',true);
add('King opposition|Opposition|Distant opposition|Diagonal opposition','unobstructed king geometry only; side benefiting not established',true);
add('Control the center','new pawn attacks on d4/e4/d5/e5 only',true);
add('Pawn center|Classical center','at least two pawns occupy d4/e4/d5/e5; formation facts only',true);
add('Material balance|Material imbalance','nominal 1/3/3/5/9 arithmetic and listed exact army subsets; positional value deferred',true);

export function renderStatus(source,report){
  const previous=new Map(baseline(source,report).split('\n').flatMap(line=>{
    const match=line.match(/^- \[([x ])\] (C\d+) \*\*(.*?)\*\* — (.*)$/);
    return match ? [[match[3],{checked:match[1]==='x',description:match[4]}]]:[];
  }));
  let count=0,verified=0,partial=0;
  const names=new Set();
  const rows=source.split(/\r?\n/).filter(line=>line.startsWith('- ')).map(line=>{
    const name=line.slice(2).split(' — ')[0].replaceAll('*','').trim(), scope=scopes.get(name), old=previous.get(name);
    const checked=scope?!scope.partial:old.checked;
    const description=scope?`${scope.partial?'Partial':'Mechanics verified'}: ${scope.scope}.`:old.description;
    if(checked){verified++;names.add(name);} else if(description.startsWith('Partial:'))partial++;
    return `- [${checked?'x':' '}] C${String(++count).padStart(4,'0')} **${name}** — ${description}`;
  });
  return `# Cumulative coach concept tracker\n\nUpdated: 2026-10-07. [Original supplied list](../../E020-coach-concepts/CONCEPTS.md) remains unchanged; repeated entries retain stable IDs.\n\n${count} entries; ${verified} verified occurrences across ${names.size} names; ${partial} partial occurrences. Checked means the stated synthetic mechanics scope passed, not verified human usefulness, optimality, real-game precision or extension readiness. Partial items remain unchecked.\n\n[Plan](../plan.md) · [Result](../RESULT.md) · [Demo](demo.html) · [Evidence](results.json)\n\n${report.fixtures} authored/reflected cases; selected comments have at most 24 words. E020 fork witnesses are replayed; structural tests independently recompute selected geometry/counts but share chess.js. No real-game evaluation.\n\n## Per-entry status\n\n${rows.join('\n')}\n`;
}
