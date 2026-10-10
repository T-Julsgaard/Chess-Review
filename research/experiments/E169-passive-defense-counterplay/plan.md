# E169 — comparative passive defense and winning counterplay

2026-10-10. Prospective provisional research, parentE1686d7e858. Current main,
research-only local commits/no push. C0446 defensive passive defense, C0868 common
mistake passive defense and C0448 counterplay, approved ranks378/379. Shared
paired proof machinery with separate occurrence scopes and actual-move labels.
Broader passivity/initiative/strategic assessment remains unresolved.

Question: under an actual slider check, does a quiet legal interposition permit
forced enemy mate while a legal checking capture of a checker forces own mate?
Retain both finite policies and both reverse failure queries. Passive label only
when actual is quiet block; counterplay label only when actual is checking capture.
No quietness/count-only quality inference, fabricated enemy turn or null move.

Default-disabled defenseComparisonTags wraps E168 exactly. Required history and
distinct legal defenseAlternative UCI. One move must be nonking quiet noncapture
nonchecking interposition on an actual slider checker/own-king ray, leaving that
checker present; other must capture an actual checking unit, give check and leave
nonterminal play. Moves need not use same unit. Root must be in check with actual
legal defenses. maxDefenseComparisonNodes integer0..50000 default50000;
counterplayPlies integer0..3 default2; passiveLossPlies integer0..3 default3.
Optional defenseComparisonPanel complete raw input. Missing prerequisites abstain;
malformed supplied controls/moves reject. Historical terminal roots abstain.

Collect root/history/actor/king/checker descriptions and sorted move pair with
quiet/active roles and interposition checker certificate. Every variant retains
played move/state/full legal response inventory, E144 tracedQuery for own mate at
counterplayPlies and enemy mate at passiveLossPlies. Positive requires quiet enemy
query win AND quiet own query failure, active own query win AND active enemy query
failure, both variant roots live. Thus geometric defense/capture alone insufficient.
Queries contain complete finite strategy/refutation and exploration ticks. Any
visited fifty/threefold claim suppresses both labels. Atomic cap exhaustion drops
own witness/events preserving parent. Priority190.1, qualityClaim:false, <=24words.
Logical raw cost1+history length+one per variant+all query ticks. Context cost
3+history length; derived cost3. Independent raw replay reconstructs all states,
roles/checkers/inventories and traces without collector/detector/context/derive
imports; independent witness checker rederives actual-role labels and costs.

UNQUERIED synthetic hypothesis: White Kg1 Qd2 Rc1 Rd1 Re1 Bf2 Nh3 versus Black
Kd8 Qg5 Bb5 Be4 Pd7 Pf7. Actual Bg3 blocks queen g-file check but ...Qxg3+ Qg2
Qxg2# may prove H3 loss. Alternative Qxg5+ forces ...f6 then Qxf6# at H2; captures
the checking queen and counterattacks the enemy king. Reverse actual/alternative
shares exactly same raw pair and gives counterplay actual label. Remove Be4:
h1 escape may refute passive H3 loss, so withhold both comparison labels even
if active capture still wins. Own H0 must withhold win. Retain failures and dated
amendment before any adaptive change; no gate relaxation. Existing C0447 unique
immediate-check defense does not supply this paired finite comparison.

White/Black paired actual roles, missing history/alternative, zero cap; <=16-case
guarded authored synthetic pilot. Cheap smoke first, focused strict/missing/
disabled/history/claim/exact budget tests, independent mutations,2 E168 parent
checks. Reuse panels by exact root/history/sorted pair/horizons/full recursive
collector closure, never previous passed message. Save failures/raw and compact
receipts/manifests; soft500KB evidence target. Source verification/diff checks,
RESULT/INDEX and local coherent commit. No engine/tablebase/new real games/human
review/confirmation. Combined cumulative/exhaustive original-occurrence/priority/
absence/history/budget audits and changed main/repeat/clean reproductions deferred
to combined freeze. Strategic passivity, longer counterplay and real-game teaching
value stay open; preserve full catalog and next approved queue.
