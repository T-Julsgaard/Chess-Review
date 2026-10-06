import {renderStatus as previous} from '../../E026-pin-proofs/code/status.mjs';
const scopes=new Map();
function add(names,scope,checked=true){for(const name of names.split('|'))scopes.set(name,[checked,scope]);}
add('Defense','one N/B/R/Q had a hypothetical immediate profitable-capture threat; every actual capture after the move permits a reply with no net nominal loss; other targets and later play excluded');
add('Active defense','same finite target-defense proof plus actual capture or check; no enduring activity/initiative claim');
add('Defensive pawn move','actual pawn move passes finite target-defense proof for a surviving non-pawn piece');
add('Eliminating attacking pieces','played capture removes the original attacker of the certified old profitable-capture threat and passes actual target-defense proof');
add('Blocking files','played move blocks an actual clear enemy slider file attack on surviving own piece/king; geometry only');
add('Blocking diagonals','played move blocks an actual clear enemy slider diagonal attack on surviving own piece/king; geometry only');
add('Closing lines|Blocking','played move interrupts a previously clear enemy slider attack line; no wider safety or evaluation claim');
add('Interposition','legal check evasion blocks a specified checking slider between attacker and king');
add('King escape','actual king move legally evades check; no longer-term safety claim');
add('Air / luft|Creating luft','noncapturing pawn move opens legal adjacent king step, with old hypothetical back-rank mate witness and no actual opponent mate in one afterward');
add('Creating escape squares','vacated pawn square becomes legal adjacent home-rank king step; generic mate prevention or durable safety not established',false);
export function renderStatus(source,report){
 const rows=previous(source,report).split('\n').filter(l=>l.startsWith('- ['));let verified=0,partial=0;const names=new Set();
 const updated=rows.map(line=>{const m=line.match(/^- \[([x ])\] (C\d+) \*\*(.*?)\*\* — (.*)$/),s=scopes.get(m[3]),checked=s?s[0]:m[1]==='x',description=s?`${checked?'Mechanics verified':'Partial'}: ${s[1]}.`:m[4];if(checked){verified++;names.add(m[3]);}else if(description.startsWith('Partial:'))partial++;return`- [${checked?'x':' '}] ${m[2]} **${m[3]}** — ${description}`;});
 return`# Cumulative coach concept tracker\n\nUpdated: 2026-10-07. [Original supplied list](../../E020-coach-concepts/CONCEPTS.md) is unchanged, including all repeated occurrence IDs.\n\n${rows.length} entries; ${verified} verified occurrences across ${names.size} names; ${partial} partial occurrences. Checked means stated synthetic mechanics, not real-game precision, teaching benefit or extension readiness.\n\n[Plan](../plan.md) · [Result](../RESULT.md) · [Demo](demo.html) · [Evidence](results.json)\n\n${report.fixtures} authored/reflected cases; selected comments <=24 words. Old capture/mate threats explicitly use a hypothetical opponent turn, with en-passant cleared. Actual replies prove immediate defense for one target; luft rules out only mate in one.\n\n## Per-entry status\n\n${updated.join('\n')}\n`;
}
