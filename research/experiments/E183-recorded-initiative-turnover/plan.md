# E183 — recorded turnover of checking mating resources

2026-10-10. Parent E182efa0992. BUILD-FIRST, current main authorized,
research-only local commits, no push. Register before new collection or testing
the authored historical roots below. Original IDs C0595 losing initiative,
C0596 seizing initiative and C0597 counter-initiative. Full strategic meanings
remain in scope; these are finite positive-resource transitions only.

API inspectTurnover(source,input,result,options), sources tempo(E143) or
defense(E169); evaluateTurnover may collect only the missing earlier certificate.
Current source must be exactly enabled and independently semantically admitted,
with genuine full history and strict original horizons/caps. Options:
priorAlternative UCI, priorPlies integer0..3 default0, optional complete
priorTree, maxTurnoverNodes integer0..50000 default50000. No unknown keys.
No production events, priorities, scoring or source-result mutation.

Reconstruct the entire genuine history; its LAST recorded move is the opposing
actor's actual preceding move. A nonempty prior prefix is permitted and must be
replayed exactly. Keep before-that-move, after-that-move/current-before, and
current-after frames, actual preceding move metadata, both actor perspectives
and clocks. No inverted FEN, null move or invented prefix. Root and all recorded
positions must be legal/live before a subsequent actual move. Missing history,
empty history or missing earlier certificate is an explicit prerequisite.

At the exact prior root, priorAlternative must be a distinct legal checking
move by the previous opposing actor. Admit a full E146 continuation tree for
that alternative at declared priorPlies, using the exact earlier history prefix.
Independently solve all legal OR-own / ALL-enemy branches, retain a complete
winning policy, and require every selected attacking move to check. The
alternative itself must check; immediate checkmate is a valid positive earlier
resource, not a failed-search surrogate. Unresolved leaves cannot become
loss/draw. E146's tree includes all legal branches even where a witness policy
chooses only winning own continuations. Suppress scopes on any visited claim.

Current positive resource: E143 actual row actor query, or E169 actual active
checking-capture own query. Require a complete actor-winning mate policy and
every attacking policy choice to check; the actual current move must check.
Together current actual checking move and its complete after-policy establish
the new actor's mating resource at current-before. E169's quiet-loss comparison
may be present but is not substituted for earlier positive history evidence.
Do not require the old label to fire if the independently admitted actual
positive query suffices. No claim of optimal play or earliest/fastest takeover.

Separate gates:
- C0595, previous actor perspective: positive earlier checking-mate alternative
  plus the actual recorded previous move handing the opposing actor a positive
  checking-mate resource. This resource conflict establishes the earlier actor
  cannot retain that mating resource against correct play. No inference from
  a failed short own search. Actual current checkmate may complete this loss.
- C0596, current actor perspective: those positive opposing historical resources
  and actual current NONTERMINAL checking move start its own certified mating
  policy. A current checkmate is completion, not ongoing initiative, so withhold
  this scope at terminal current-after.
- C0597: all C0596 gates, plus the actual preceding opposing move checked the
  current actor and current move is a legal checking evasion. The current root
  must genuinely be checked, with checker identity and actual check/evasion
  frames retained. A quiet previous move cannot establish counter-initiative.

Atomic budget2setup + source analysis.nodes + history.length+1 + priorTree.nodes
+ one tick per independently solved prior node. Fresh/saved exact and one-short
must agree; exhaustion discards earlier tree/policy/ledger/all positive claims.
Do not recollect the source panel through the wrapper; source inputs/results
are supplied and independently admitted. inspectTurnover never collects.

Authored historical families, both colors (new hypotheses, not yet tested):
1. E143 original forcing root, but earlier Black rook on h6, Black to move;
   recorded ...Rh6-h7 yields the current White root. Earlier alternative
   ...Qd2-e1# should certify Black's resource at H0. Current Qg5-d8+ should
   preserve its E143 H2 complete White policy. C0595/C0596 true, C0597 false.
2. E169 original active root, but earlier Black queen on h5, Black to move;
   recorded ...Qh5-g5+ yields current White checked root. Earlier alternative
   ...Qh5-h1# should certify Black's resource at H0. Current Qd2xg5+ should
   preserve E169 A2/D3 full own policy. All three true.
New clocks/history differ from archived empty-history panels: NEVER silently
reuse snapshots. First check exact old E143/E165 and E169 cache keys. Collect
new full source panels only if absent, with original source horizons/caps.
Smoke one White family at a time, checkpoint raw before wrapper derivation,
then reflection. Two prior H0 terminal trees per family; check exact E146/E155/
E180 history/config keys before fresh collection. Reuse the resulting four
source panels and four tiny prior trees for all compatible pilot roles.

Controls for each family/both colors: positive; actual source nonwinning or
quiet role (E143 Qh5 / E169 Bg3); legal nonchecking prior alternative (tempo
...Rh6-h5, defense ...Qh5-h4) must withhold/reject the checking prerequisite;
missing history; empty history snapshot; missing priorAlternative; zero wrapper
budget; and priorAlternative equal actual preceding move (not a contrast).
Additional focused legal checking-but-refuted earlier alternative, current
terminal completion, genuine longer prefix, visited history claims, shortened
current source bounds, altered earlier full graph/history/clock/branch/outcome/
cost, altered source query, and independent decision/frame/perspective/policy/
bound mutations. If an authored hypothesis fails, preserve it and register a
dated amendment before a new root, never silently raise horizons or budgets.

Main pilot32cases/96decisions from eight families x two source families x two
colors. No aggregate positive count is prespecified. Independent saved checker
imports no new runtime/evaluator/collector/context/derive; separately reconstruct
genuine prefix, earlier OR/ALL policy/checks, actual source query/check policy,
frames/actors/gates/atomic work. Frozen E143/E169/E146 independent admission and
Chess are shared limitations. Strict exact-content process-local source caches
may avoid repeating admission of identical values, never persisted successes;
changed source bytes must replay and custom serialization must reject.

Source bind full normalized recursive closure and full E182 build; retain
original raw/query/history/config/input/result hashes and eligibility receipts.
Soft evidence500KB; preserve failures and justify overruns. Exposed authored
synthetic development, no engines/tablebases/acquired games/human validity.
Focused representatives and small pilots only. Combined cumulative regression,
exhaustive occurrence/absence/priority/history/budget audits and changed
main/repeat/clean reproductions remain deferred. Equilibrium and durable
advantage, broad nonmating initiative and all original catalog scopes remain
open. Next audit outcome/timescale/rubric prerequisites for C0599–C0601.
