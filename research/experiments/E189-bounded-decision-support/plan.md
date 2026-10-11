# E189 — bounded candidate support, objective outcomes and critical choices

2026-10-11. Prospective BUILD-FIRST batch, parentE188a065f51. Current main,
research-only local commits/no push, standing user checkout exception.
E138/E145/E146 published findings inspected; exposed synthetic development,
not independent confirmation. Existing sources reused, no fresh search.

Three separate original scopes:
- C0788 candidate move selection as an ANALYSIS TOOL, never inferred human
  thought: complete legal root inventory classified by certified actor mate,
  certified opponent mate, mechanical terminal draw and unresolved finite bound.
  Return ALL certified actor-mate choices as a supported shortlist, ALL certified
  losing choices separately, and preserve every unknown/draw. Available iff at
  least one certified actor-mate choice. No unique/best/shortest global ranking.
- C0799 objective evaluation: actual after-move frame has a positive complete
  own OR enemy mating certificate at declared H. Require explicit view
  {frame:'after-actual',perspective:'w'|'b'}, retain winner and winning/losing
  perspective. Unknown finite outcomes and mechanical draws do not pass this
  mate-only scope. Missing view withholds only C0799; malformed view rejects.
- C0803 critical decision: before-actual complete candidate inventory contains
  BOTH a certified actor-mate move and certified enemy-mate move at the SAME H.
  This labels concrete available stakes, independent of actual selected outcome.
  No general positional criticality, unique move, human difficulty or intent.

Callable inspectDecisionSupport(input,options,panel) only admits supplied full
E143-complete-mate-panel-v2 observations. No collector/engine call. Default
enabled=false; plies0..2 default1; maxNodes0..50000 default50000; optional view.
Input legal fen, actual UCI and explicit genuine full history. Missing history/
panel abstains; illegal/malformed supplied controls reject. Live historical root.
Claims visited anywhere in full source exploration suppress all own claims.
Atomic budget cost2+history.length+panel.nodes+panel.rows.length (one per-row
admission/classification ledger tick). Exact/short/zero cap checked. Unresolved
is never converted to draw, balanced, safe, risk probability or enemy win.

Reuse exact E145 source/input/history/H observations, checking every archived
source binding, borrowing lineage/raw archive hashes and source collector closure.
Own runtime and checker EACH fully admit distinct panels via frozen independent
verifyPanel, with separate process-local exact ordinary-value clone caches only.
Different content/history/H must replay/reject. Never persist admission success
or cache own labels. Checker imports no new runtime/context/classifier/collector;
independently reconstructs root/frame/perspective/classes/shortlist/stakes/cost.
Shared Chess and frozen source verifier are explicit limitations.

Fixed representative cases, both colors: published E145 base actual Qg8# gives
all three scopes; quiet Qh5 actual loses but same selection/stakes and C0799
losing perspective; Qd8+ is unresolved at H1 despite its known H2 mating
continuation, so C0799 false while selection/stakes remain. H0 base retains
immediate mate selection/evaluation but no enemy-mate option, hence no criticality.
No-enemy-queen root similarly withholds criticality. Published earlier reversal
decision from TRUE prefix has zero actor mates and positive enemy mate after its
actual Qg5: no shortlist/criticality, positive losing evaluation. Use exact
panelContexts(previous) keys, never erase the real recorded history/counters.

Twelve role cases, eight distinct panels; no exhaustive inherited corpus. Add
representative disabled/missing/strict, explicit/opposite/missing view, exact/
short/zero budgets and valid-baseline own/source mutations. Reuse existing E187
tiny visited-fifty raw at H0 for claim suppression, verifying its original source
closure and archive hash. No new collection. Run focused tests ONCE. Source/diff
checks plus source-bound retained check record. Separate full pilot/replay,
cumulative occurrence/absence/priority/history/budget/terminal matrix and changed
main/repeat/initially clean reproductions remain combined-validation work.
Stop/document unexpected outcomes, no weakened gates. Soft evidence500KB through
parent archive references. Guarded D001-test receipt. No real games/human review,
engine/tablebase, timing advantage or statistical precision claim.

C0797 risk assessment/C0798 practical chances need explicit loss/utility and
eligible calibrated opponent/context probability models; forced outcomes alone
do not supply them. C0800 subjective difficulty needs human/context assessment,
C0801 generic complexity a validated definition/rubric, C0802 uncertainty a
declared estimand/model/information regime. Raw branching or bounded unknowns
alone cannot discharge those ideas. Record prerequisites, keep original complete
teaching scope and no readiness credit for these five concepts.
