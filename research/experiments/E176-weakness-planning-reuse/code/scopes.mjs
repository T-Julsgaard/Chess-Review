// Original strategic-planning occurrences; available means this bounded scope only.
export const scopes = Object.freeze({
  C0541: Object.freeze({origin:'E116',analysis:'centerRestraintAnalysis',flag:'centerRestraintTags',limit:'maxCenterRestraintNodes',scope:'Causal enemy pawn fixation with profitable same-color bishop exploitation after every reply.',limitations:'No permanence, general weakness valuation or long-term strategic plan.'}),
  C0542: Object.freeze({origin:'E168',analysis:'forcedWeaknessAnalysis',flag:'forcedWeaknessTags',limit:'maxForcedWeaknessNodes',scope:'Check forces new pawn isolation and a complete target-capture mate policy while a quiet alternative permits escape.',limitations:'No general induction, durable weakness value or longer strategic plan.'}),
  C0543: Object.freeze({origin:'E153',analysis:'weaknessAnalysis',flag:'weaknessTags',limit:'maxWeaknessNodes',scope:'New second isolated-pawn pressure enables a complete profitable capture policy requiring both opposite-wing targets.',limitations:'Existing structural defects are exploited; new structural weakness creation, permanence and long-term strategy remain open.'})
});
export function scopeFor(id) {
  if (typeof id!=='string' || !Object.hasOwn(scopes,id)) throw Error('Unsupported weakness-planning occurrence');
  return scopes[id];
}
