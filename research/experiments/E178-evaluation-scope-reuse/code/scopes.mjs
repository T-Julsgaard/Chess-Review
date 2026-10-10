const initiative={origin:'E143',analysis:'forcingTempoAnalysis',flag:'forcingTempoTags',limit:'maxForcingTempoNodes',scope:'Actual noncapturing check has complete immediate-mate responses to every defense; a same-unit quiet alternative permits certified enemy mate.',limitations:'Sustained/nonmating initiative and general strategic position evaluation unresolved.'};
export const scopes=Object.freeze({
 C0554:Object.freeze({...initiative,context:'20. Evaluation of a position'}),
 C0582:Object.freeze({...initiative,context:'21. Initiative and dynamics'}),
 C0557:Object.freeze({origin:'E174',analysis:'improvementAnalysis',flag:'improvementTags',limit:'maxImprovementNodes',context:'20. Evaluation of a position',scope:'New supported knight outpost with full conservative enemy-pawn challenge-route absence and complete profitable capture policy beating its quiet alternative.',limitations:'Occupied-square pawn weakness only; all-piece permanence, generic weak-square assessment and long-term value unresolved.'}),
 C0563:Object.freeze({origin:'E156',analysis:'pieceObjectiveAnalysis',flag:'pieceObjectiveTags',limit:'maxPieceObjectiveNodes',context:'20. Evaluation of a position',scope:'Two original equal-value own B/N nominees differ in complete profitable tracked-pawn capture coverage after a quiet piece move.',limitations:'Objective-relative minor quality only; general positional strength, durable quality and trade value unresolved.'})
});
export function groupFor(ids){
 if(!Array.isArray(ids)||!ids.length||new Set(ids).size!==ids.length)throw Error('Require nonempty unique occurrence IDs');
 for(const id of ids)if(typeof id!=='string'||!Object.hasOwn(scopes,id))throw Error('Unsupported evaluation occurrence');
 const s=scopes[ids[0]];if(ids.some(id=>scopes[id].origin!==s.origin))throw Error('One source origin per evaluation');return s;
}
