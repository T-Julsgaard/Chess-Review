# E097 promotion races and passed-pawn restraint
Registered2026-10-09, E096 wrapper. Reuse unchanged E037 all-defense surviving
queen route and independent replay; E021 passed-pawn facts,E022 capture proof,
E027 labelled turn frames,E024 history. Default-disabled endingRaceTags,
racePushes1..6(default2),maxEndingRaceNodes0..50000(default50000),atomic budget.

C0647/C0729 own and enemy passed pawns plus positive complete own queen route,
including all enemy advances/promotions/checks; queen survives next response with
positive root gain. Queen-race resource, not first promotion/optimal result.
C0680 same proof when both armies have >=1rook and otherwise kings/pawns only.
C0648/C0726 same race certificate when EVERY selected surviving queen promotion
leaf gives actual check; future checking queen route, no assumed opponent tempo.
C0705 certified pawn route when opponent sole nonpawn is a knight and pawn lies
outside all other pawn files (at least one), or actual knight captures such an
enemy passed pawn with positive E022 gain through every immediate counterreply.
No knight-distance heuristic. C0783 actual nonking mover removes ALL currently
legal enemy passer advances,old had some,remove ONLY actual mover restores one;
labelled hypothetical frames, immediate causal restraint, not permanent stopping.

Both colors, checking queen race,rook race,knight route/interception,legal causal
restraint,blocked/captured/stalemate/insufficient routes,inside-file and removal
negatives,default equality,strict bounds,atomic budgets,independent positive route/
material/legal inventory replay,tampering. Focused E097/E096/E037/E022 tests,
cheap guarded authored D001 pilot,complete normalized dependency/source/staged
diff checks. Keep all broader ending/race/strategic scopes unresolved. No actual
game inputs. Defer combined suite,complete saved semantic/absence replay,
interactions,exact3 reproduction,occurrence audit,usefulness. Same clean shared/
isolated66614c9. Neverpush. Usage90%used; at about95%used save/commit exact resume
and explicitly authorized PC shutdown. No live frozen inputs changed.
