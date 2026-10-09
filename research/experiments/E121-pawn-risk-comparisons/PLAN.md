# E121 — pawn-risk comparisons

Preregistered 2026-10-10, build-first parent E120. C0862 pawn grabbing and C0869
overextension. Reuse E104 complete legal-alternative mate comparison unchanged;
do not repeat its searches or substitute geometry for strategic meanings.

Default-false pawnRiskTags; enabled internally enables defenseChoiceTags, rejects
explicit conflicting false/nonboolean. E104 defenseChoicePlies0..3/default1 and
maxDefenseChoiceNodes retain own budget. maxPawnRiskNodes integer0..50000 default
50000 separately bounds new work; atomic new exhaustion preserves parent.
Disabled exactly E120. Legal live actual/history <=10 units for new claims.

Require E104 actual enemy mate success AND some legal alternative mate failure
at identical H; also require fresh actual query succeeds to exclude history-only
outcomes. Reuse complete E104 actual/alternative trees, with selected first safe
alternative. C0862: actual nonking unit captures enemy pawn; report exact pawn
capture permits mate versus the alternative, without greed/intent/nominal value
judgment. Capture itself may change material but tactical consequence is proved.

C0869: quiet own same-file pawn advance to relative rank>=4, no rights. Restore
ONLY that pawn to its recorded original square in fresh postmove frame, preserving
side/clocks and clearing EP. Require legal restored frame and full enemy mate
failure at same H. Establish advanced-pawn placement's bounded exposure effect;
no general territorial overextension, permanent weakness or opening advice.
Both actual full-history and fresh actual success mandatory. No copied E104 label.

New checker reuses independent E104 checker and E029 neutral replay, never candidate
or solver. Reconstructs move identity, complete all-alternative comparison, fresh
and restored frames, labels. Focused both colors, positive/negative restoration,
capture versus safe alternatives, no safer alternative, strict/disabled/history,
terminal/draw and atomic budget; small guarded synthetic pilot and source/diff.

D001 test preflight passed. No acquired games/labels/engine/production. Register
before new evaluation. Defer full cumulative regression, exhaustive integration/
absence/history/priority/budget/occurrence audit, frozen main/repeat/clean and
real-game precision/usefulness. General unnecessary-move and outpost judgments
remain open with explicit strategic/history prerequisites.
