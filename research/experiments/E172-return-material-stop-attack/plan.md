# E172 — returning recorded sacrifice gain refutes a finite attack

2026-10-10 prospective provisional study, parentE171fddc929. Current main,
research-only local commits/no push. C0474 neutralizing initiative rank383,
C0475 returning sacrificed material to end attack384. BUILD-FIRST.md focused
checks/cheap pilot, combined validation later. All broader strategic scopes and
full catalog remain open; no general end-of-attack or best-move claim.

Require a genuine recorded enemy quiet offer followed immediately by own capture
of that offered unit and at least one later enemy move. Reference acceptedSacrificePly
1-based capture index2..1000 in supplied history. From immediately before offer
to root, acceptance is the only capture and no promotions occur, so recorded
positive net nominal gain is attributable to that unit. Track original accepting
own nonking/nonpawn capturer through subsequent legal history to actual root.

Default-disabled materialReturnTags wraps E171. Required history,
acceptedSacrificePly, returnAlternative distinct legal quiet same-unit move.
Actual noncapture checking move offers that original accepting unit; actual root
and resulting checking position must be live. Alternative noncapture/nonchecking.
maxMaterialReturnNodes integer0..50000 default50000; initiativePlies integer0..3
default3, but H<3 abstains attack-bound-prerequisite (this candidate's registered
scope requires H3). Optional materialReturnPanel complete raw observations.
Missing inputs abstain; malformed/illegal supplied controls reject. Atomic cap
exhaustion drops own witness/events preserving parent. Any visited fifty/threefold
claim suppresses own labels. Priority190.7, qualityClaim:false, <=24word comments.

Two genuine post-move enemy H3 mate queries with full E144 trace/proof admission:
actual fails, quiet alternative succeeds. Retain complete legal response inventory
and every enemy capture of offered original unit after actual/alternative; every
capture has exact state/material, full current legal defender inventory and enemy
mate query H2 from genuine endpoint. C0474 requires nonempty actual captures,
every actual acceptance live/loss>=1/enemy H2 failure, global actual H3 failure and
alternative H3 success. Thus this is finite neutralization by a return tempo.
C0475 additionally requires EVERY accepted return lose no more than recorded gain
and retain >=0 of it relative to pre-offer baseline. Giving back more may still
emit C0474 but not this bounded C0475 scope. Separate event gates, not copied labels.

Raw schema E172-material-return-panel-v1: exact root/history/config/certificate,
offer/accept frames, original capturer identity, nominal anchor/accepted/root gain,
two ordered variants with played/state/legal/global query/complete acceptances
and acceptance states/current legal inventories/H2 queries. Cost1+history length,
one per variant, one per accepting capture and all query ticks. Context3+history
length; derived1+one per variant+one per acceptance. Independent raw reconstruction
and trace replay and independent label/material checker, no detector/collector/
context/derive imports. Source-bind full normalized closure and parent build.

UNQUERIED authored history: initial White Kb1 Qe2 Re1 versus Black Kh8 Ra8 Pf7
Pg7 Ph7, White to move. Qa2 Rxa2 Rd1 leaves Black to move, recorded gain9.
Rb2+ versus Ra3. Hypothesis White cannot force H3 mate after checking return;
Kxb2 gives back5, retaining4, and ...g6/...h6 creates escape; Ra3 permits Rd8#.
Replace original enemy offering queen with Bb3->a2: gain3, identical current root;
same finite neutralization but return5 exceeds gain, C0474 only. Add White Bf8
and Bg6 to initial history: controlling escape squares may preserve H3 mate even
after return, so both labels withheld. Retain failures/amend before adaptive changes.

<=16-case guarded D001-test authored pilot, both colors; missing history/capture
index/alternative, short bound and zero cap controls. Smoke before full small
pilot. Focused strict/missing/disabled/history/claim/budget/material/semantic
mutation checks,2 E171 parent representatives, independent saved replay every
witness. Exact full history/config/horizon/collector closure cache reuse; no
repeating matched searches. Soft500KB evidence target, source verification/diff
checks, RESULT/INDEX/local commit. No engine/tablebase/new real games/human review/
confirmation. Cumulative/exhaustive original-occurrence/absence/priority/history/
budget audits and changed main/repeat/clean reproductions deferred to combined
freeze. General initiative, longer attack and larger material returns stay open.
Next plan-formation/short-term/long-term/objective ranks385–388, with actual
observable policy/objective evidence rather than asserting hidden player intent.
