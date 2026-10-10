# E154 — comparative piece placements, quiet routes and regrouping objectives

2026-10-10 before implementation/evaluation. Parent E1531bb70ee. Authorized
current main, research-only/local commits/no push. D001-test preflight passed.
BUILD-FIRST focused checks/tiny pilot, no cumulative or lengthy tests.

Original scopes C0293 piece optimization, C0294 maneuvering, C0295 regrouping,
C0296 re-routing. Reuse E151's declared live-unit-safe destination criterion,
not broad positional potential. Full legal own B/N/R/Q profiles retain all
units including zero-move units, all legal options and every immediate enemy
reply with original-unit survival. A safe option requires live after/reply
states, nonempty replies and survival on its destination after every reply.
No early pruning, manufactured turn or unstated intent. Frozen E151 remains
unchanged; adapt neutral full-profile collection for new genuine turn contexts.

For the actual quiet nonpawn/nonking nonchecking mover, enumerate EVERY legal
quiet nonchecking same-source placement at the true current root. Each reaches
a genuine opponent turn. Retain all legal opponent replies and a complete own
freedom profile after each reply. Placement score is the minimum moved-unit
safe-destination count across replies; a terminal placement/reply or absent unit
scores0 and is explicitly invalid for positive labels. Retain all ranks/ties,
failures and candidate complements. C0293 requires at least two eligible
placements, actual valid against every reply, actual tied for maximum and actual
score strictly above current root source count. This optimizes only the declared
immediate maximin criterion over quiet nonchecking moves of this same unit;
captures/checks/other units/long-term quality are outside this comparison.

True last-two-ply history supplies the preceding own relocation and actual enemy
reply, including full before/after FEN, descriptors and checking flags. Retain
the complete profile at the true prior own-turn prefix. C0294 requires two
recorded quiet nonchecking own relocations of the SAME original unit, separated
by an actual quiet nonchecking enemy piece/king reply, visiting at least three
distinct squares, and a valid actual placement. This proves the recorded quiet
route, not absence of all tactical intent. C0296 additionally requires actual
worst-reply freedom strictly greater than both prior route-start and current
source counts. Other routes/histories and strategic better-post judgment remain
unresolved. Current candidate selection cannot invent prior moves or reset turns.

C0295 requires two DISTINCT own units and an explicit shared input goal:
regroupObjective={minimum: integer1..32, firstAlternative: UCI}. Goal means both
tracked units reach at least that many live-unit-safe destinations. At prior
prefix first unit below goal; at current actual root first unit meets goal and
second does not; after actual, BOTH meet goal after EVERY legal enemy reply.
Require first and actual own relocations quiet/nonchecking, enemy recorded reply
quiet/nonchecking piece/king. Preserve actual identities through the two stages.
This is an externally declared operational objective, not inferred human intent.

Additionally reconstruct a genuine comparison history from the SAME prior
prefix: distinct legal quiet nonchecking same-first-unit firstAlternative,
the SAME recorded enemy reply (must remain legal), then the SAME actual current
second-unit move (must remain legal and quiet/nonchecking). Retain all resulting
enemy replies and complete own profiles. This comparison must fail the shared
goal on at least one reply. This adds causal group/objective evidence beyond
relabeling E151 accumulation. Retain the complete failing comparison, no selected
line alone. Missing group objective/compatible history leaves C0295 unavailable;
malformed supplied objective or illegal supplied comparison rejected. Achieving
a declared freedom goal does not establish a new human plan, global best grouping
or strategic coordination, and those broader scopes stay explicitly open.

Interface default-false routeObjectiveTags wraps E153; strict maxRouteNodes
integer0..50000 default50000. Full history required. Unsupported actuals have no
new labels. Optional routePanel untrusted, independently admitted. Every visited
fifty-move/threefold claim context globally suppresses labels. Terminal inventories
close, no vacuous success. Exact disabled parent behavior; atomic exhaustion
drops all new events/witness. qualityClaim:false; event comments <=24words.

Raw schema E154-complete-route-panel-v1: current FEN/full history/actor/root
profile, prior history/last-two records/profile when present, every eligible
current candidate with state/checking/full legal enemy replies/full own profiles,
optional genuine regroup comparison with full alternative history/current root/
actual move/full enemy-response profiles; complete claim paths and logical cost.
Cost3wrapper plus1context+history length; own profile1state+1legal inventory,
each eligible own option1move+1state+1enemy inventory+1per enemy reply. Prior
reconstruction1context+prefix length. Each placement1move+1state+1enemy inventory,
each enemy reply1move+full own profile. Regroup alternate reconstruction1context+
full alternative history length, plus placement cost above. Histories/records
are taken from actual legal reconstruction, not trusted declarations. Cache and
fresh costs match, exact/one-short exhaustion tested. No engine/tablebase/games.

Prospective authored hypotheses (not observations): White Kh1 Bc1 Bf1 Pe2 Pe3
versus Ka8 Pb4. Actual first Bd2, reply ...Kb8. For current Bg2, compare all
quiet placements of Bf1 (including Bh3); hypothesis Bg2 has maximum worst-reply
freedom. Goal3, firstAlternative Ba3: removing the original b2 pawn permits
legal Ba3, but ...bxa3 in the complete alternate continuation should refute
the group goal. Actual Bd2 then Bg2 should meet it. For same-unit route current
Be1 after Bd2/...Kb8, hypothesis measured freedom exceeds both route-start and
current-source counts, and a quiet three-square route is recorded. Actual Bh3
is a prospective nonmaximum control, still possibly meeting the group goal.
Both colors. Additional controls history/goal absence, prior same/different unit,
blocked/illegal comparison, tradeoff/first-unit loss, tactical/checking history,
terminal/claim, EP/promotion identity, strict and disabled inputs.

Cheap smoke first, then <=16 authored/reflected cases, source/input-bound raw
reuse and independent saved semantic checker importing neither detector,
collector nor scoring helpers. Focused inventory/survival/ranking/tie/history/
identity/objective/counterfactual/terminal/claim/budget/event mutations and E153
parent representatives. All chess/evidence entrypoints guarded with receipt.
Retain failures, revision/full source closure/environment/commands/null engine+
seed/output hashes. Soft compressed target600KB; no omitted branches or costly
storage-only work. Source verification/diff. Defer combined regression and
original-occurrence/absence/priority/history/budget audits, exact main/repeat/
initially-clean reproductions, broad strategic validity and real-game usefulness.
Accepted tracker/production/numerical/shared policy unchanged. Full catalog open.
