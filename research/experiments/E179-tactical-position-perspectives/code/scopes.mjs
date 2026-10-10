const evaluation='20. Evaluation of a position';
export const scopes=Object.freeze({
 C0566:{context:evaluation,scope:'Before-actual root has a legal checking capture with complete own mate policy and failed enemy mate query at declared bounds.',limitations:'Other tactical opportunities, longer tactics and general position quality remain unresolved.'},
 C0568:{context:evaluation,scope:'Actual quiet defense permits the original actor opponent to force finite mate; retain the genuine after frame and opponent identity.',limitations:'Other opponent counterplay, nonmating resources and sustained initiative remain unresolved.'},
 C0570:{context:evaluation,view:true,scope:'Actual after-move frame has a complete finite mate certificate yielding winning/losing outcome for explicit player perspective.',limitations:'General dynamic evaluation, unresolved finite frontiers and longer/nonmating outcomes remain open.'},
 C0574:{context:evaluation,view:true,scope:'Explicit player has a complete forced-mate winning certificate at the actual after-move frame.',limitations:'Other winning positions, longer/nonmating conversion and broad evaluation remain unresolved.'},
 C0978:{context:'38. Chess terminology for position types',view:true,scope:'Explicit player has a complete forced-mate winning certificate at the actual after-move frame.',limitations:'Other winning positions, longer/nonmating conversion and broad evaluation remain unresolved.'},
 C0575:{context:evaluation,view:true,scope:'Other player has a positive complete forced-mate certificate at the actual after frame, proving loss for explicit perspective.',limitations:'A failed own search is insufficient; longer/nonmating losing positions remain unresolved.'}
});
export const allIds=Object.keys(scopes);
export function validateIds(ids){if(!Array.isArray(ids)||!ids.length||new Set(ids).size!==ids.length)throw Error('Require nonempty unique occurrence IDs');for(const id of ids)if(typeof id!=='string'||!Object.hasOwn(scopes,id))throw Error('Unsupported tactical position occurrence');}
export function validateView(view){if(view===undefined)return;if(!view||typeof view!=='object'||Array.isArray(view)||Object.keys(view).some(k=>!['frame','perspective'].includes(k))||view.frame!=='after-actual'||!['w','b'].includes(view.perspective))throw Error('Require explicit after-actual frame and w/b perspective');}
