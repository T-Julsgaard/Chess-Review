import {renderStatus as previous} from '../../E024-transitions/code/status.mjs';
const scopes=new Map();
function add(names,scope,checked=true){for(const name of names.split('|'))scopes.set(name,[checked,scope]);}
add('Hanging pawns|Hanging-pawn structure','new same-rank c/d pair at relative fourth/fifth rank, no other c/d or b/e pawns; no weakness claim');
add('Pawn lever','new pawn attack with a legal hypothetical same-side capture; opponent can respond');
add('Central break','new legal pawn-lever target occupies d4/e4/d5/e5; plan or advantage not inferred');
add('Undermining the center','new legal pawn attack on base of enemy chain containing a central pawn; collapse not implied');
add('Removal of the defender|Removing protection','captured geometric defender and a remaining legally capturable target; pinned defenses and finite gain unresolved',false);
add('Locked pawn chains','two matched support components whose members all ram opposing pawns');
add('Closed center','matched locked chains with at least two mover pawns on central squares; no plan claim');
add('Fixed center','central pawn straight advances blocked and no geometric captures now; future transformation/ease not established',false);
add('Open center','d/e files become pawn-free; broader central activity not established',false);
add('Pawn shield|Pawn cover','pawn squares within two forward ranks on three files around c/e/g home-rank king; safety not measured',false);
add('Destroying the pawn shield','capture removes one geometric cover pawn; sacrifice intent or complete destruction not inferred',false);
add('Symmetrical pawn structure','exact same-file rank-reflection of at least two pawns each; full position/evaluation symmetry not implied');
add('Bishop behind pawn chain','friendly chain pawn directly blocks bishop’s forward diagonal; passivity/liberation not assessed',false);
add('Castled king','actual castling event from inherited E020 legal-move fixtures; no inferred prior history');
export function renderStatus(source,report){
 const rows=previous(source,report).split('\n').filter(line=>line.startsWith('- ['));let verified=0,partial=0;const names=new Set();
 const updated=rows.map(line=>{const m=line.match(/^- \[([x ])\] (C\d+) \*\*(.*?)\*\* — (.*)$/),s=scopes.get(m[3]),checked=s?s[0]:m[1]==='x',description=s?`${checked?'Mechanics verified':'Partial'}: ${s[1]}.`:m[4];if(checked){verified++;names.add(m[3]);}else if(description.startsWith('Partial:'))partial++;return`- [${checked?'x':' '}] ${m[2]} **${m[3]}** — ${description}`;});
 return`# Cumulative coach concept tracker\n\nUpdated: 2026-10-07. [Original supplied list](../../E020-coach-concepts/CONCEPTS.md) is unchanged; every repeated entry retains its stable occurrence ID.\n\n${rows.length} entries; ${verified} verified occurrences across ${names.size} names; ${partial} partial occurrences. Checked means stated synthetic mechanics, not human benefit, real-game precision, optimality or extension readiness.\n\n[Plan](../plan.md) · [Result](../RESULT.md) · [Demo](demo.html) · [Evidence](results.json)\n\n${report.fixtures} authored/reflected cases. Comments <=24 words. Support/cover and color-complex counts do not establish safety, weakness, good/bad bishop or permanent holes. Specific mate/royal/triple/outpost selection regressions are verified.\n\n## Per-entry status\n\n${updated.join('\n')}\n`;
}
