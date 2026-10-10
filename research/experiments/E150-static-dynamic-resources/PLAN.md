# E150 — persistent material edge and temporary checking-piece resource

2026-10-10, before implementation/evaluation. Parent E149 b7be813. Authorized
current main, research-only/local commits/no push. D001-test preflight passed.
BUILD-FIRST: no cumulative/long tests. Full catalog and broader claims retained.

Reviewed exact C0276 positional advantage (long-term, not immediate tactics),
C0277 static advantage (durable feature), C0278 dynamic advantage (temporary,
activity/initiative), C0280 long-term compensation. E138 small-budget scores
cannot authenticate long-term advantage; E091 finite material policy discards
early-failed branches and cannot supply complete raw comparison observations.
C0276/C0280 remain UNcredited prerequisites: require defensible long-term,
nontactical outcome/activity evaluation and independent validity evidence.
Do not rename a finite tactical proof as their solution.

Provisional C0277: existing signed nominal material lead >=3 before actual quiet
nonpawn/nonpromotion move. EVERY legal enemy reply must be live and retain>=3;
for each, there exists a legal quiet nonpawn actor reply retaining>=3 immediately
and through ALL immediate enemy counterreplies, all live. This is an explicit
policy across two opponent turns, not perpetual durability or a positional score.

Provisional C0278: actual quiet nonpawn checking move creates a geometric fork
of >=2 enemy nonking nonpawn units; actual piece had no legal capture at root.
Against EVERY legal enemy defense, that SAME moved unit has a capture preserving
positive nominal gain from the before-actual baseline immediately and through
ALL immediate counterreplies, with absolute actor balance positive and no
terminal frames. Compare an explicitly supplied distinct legal quiet nonpawn
same-source alternative: identical-unit/material/horizon capture policy FAILS.
Both complete policies retained. This establishes forcing activity versus a
specific lost bounded resource, not best move, all alternatives, guaranteed
game win, intended plan or persistent positional advantage. Alternative failure
does not mean no deeper compensation or eventual resource.

Default-false advantageResourceTags wraps E149. Strict maxAdvantageResourceNodes
integer0..50000 default50000. Optional advantageAlternative UCI must be distinct,
legal quiet same-source nonpawn move; unavailable alternative abstains from
dynamic scope. Missing full legal history abstains from all new scopes. No engine,
tablebase, acquired games, new policy or accepted/production/numerical changes.

Complete two-variant (actual plus explicit alternative, if supplied) raw panel:
full legal root inventory, exact histories, baseline/material/terminal state.
Every variant retains ALL opponent legal replies, and each reply's complete
actor legal inventory. For root material>=3, retain EVERY quiet nonpawn actor
reply; for each variant, also retain EVERY same-moved-piece capture. Union
deduplicated and sorted. Each attempt retains full legal enemy counterinventory
and ALL counterreply FEN/material/terminal flags, failures included. Never
short-circuit failed policies. Terminal frames close with empty inventories.
Record every visited fifty-move/threefold claim context; any such context
abstains globally. EP/promotion victim/identity conventions preserved.

Cost:3wrapper +1root context+history length+1root state+1root inventory;
per variant1move+1state+1enemy inventory; per enemy reply1move+1state+1actor
inventory; per eligible actor reply1move+1state+1counterinventory+1per counter.
Same logical charge fresh/cache; atomic exhaustion removes every new event and
witness, preserving parent. Caller panel independently semantically admitted.
Independent saved checker derives policy selections separately without importing
detector, collector or derivation helpers. Full source closure includes parent
build inputs, all new helpers/tests/fixtures/plan and configurations.

Prospective authored hypotheses (not outcomes):
- Static: White Kh1,Qd3 vs Kh8,Ra8, actual Kg1. Existing4point lead should
  admit quiet support replies through both complete enemy turns. Stronger queen
  safety and general position quality are not assumed.
- Dynamic: White Kh1,Qe2,Ne5,Pa2,Pb2 vs Kh8,Qd8,Rh6; Nf7+ forks d8/h6.
  After every king defense, Nxd8 should retain9points; compare Ng4, where an
  enemy defense should eliminate the same knight's bounded capture resource.
- Both colors; controls: inadequate starting lead, capturable queen, missing
  alternative, missing history, zero cap, nonchecking move, recapturable gain,
  terminal/claims. Preserve failures and prospective amendments before fixes.

Cheap smoke first, then reuse hash-bound raw panels for focused checks/pilot.
Pilot<=16authored/reflected cases; focused strict/disabled/history/complete
inventory/cache/exact-one-short/identity/terminal/claim/policy mutations and
representative E149 parent checks. Estimate smoke cost before expanding. Soft
compressed target250KB; retain all branches and justify any overrun. Guard all
entrypoints; receipt, environment, argv, null engine/seed, revisions, actual
source/output hashes and compressed raw/pilot retained. Independent saved replay,
source verification and diff. Defer combined cumulative/occurrence/absence/
priority/history/budget audits, exact main/repeat/initially-clean reproductions
and real-game precision/usefulness. Goal remains open.
