# E082 prospective rook-ending side checks and pawn-count transitions

2026-10-09. Preregister before implementation or fixture evaluation. Fixed queue
ranks33-35: C0665 Side checks, C0681 Four versus three, C0682 Three versus two.
Ranks31Battery/rank32Connected passers already verified; preserve their scopes.
CompletedE081 canonical325names/375verified occurrences,76partial/634unimplemented,
710remaining,62completed studies. Both local repositories clean at821e237.
Research-only exactE081 parent/priority. No extension integration/push/agents.
Usage cutoff/shutdown cancelled; separate numerical goal remainspaused.

## Reuse audit and separate scopes

E057 already provides side-rook-check for the special K/R/P ending with an
advanced passer on the checked king's file. Reuse its exact extraction/replay
where that opt-in source emitted an event. Broader C0665 factual side checks
must independently prove a direct rook check along the enemy king's rank in
an actual live rook ending; no advanced-passer prerequisite, drawing technique,
perpetual check, optimal defense or future-safety inference. ExistingC0664 stays
unchanged. Original narrow detector/evidence remains frozen and unmodified.

FRIEND-01 has64saved cases/22positives and an independent replayer for actual
newly established4v3 one-rook-each ending with all pawns on one wing. Its stated
broader gaps remain gaps. Reuse those hash-bound positions/proofs to cross-check
the covered same-wing subset without silently changing their scope or renumbering
frozen files. New broader factual whole-board4v3 and3v2 require independent gates
for both wings/splitwings, either actor holding largerarmy, legal transitions and
complete inventories. No claim about winning/drawing plans or pawn quality.
FRIEND-02 symmetry and FRIEND-03wedge are separate later reuse audits, not new
verified coverage here. Never copy an unresolved strategic checkmark.

## Interface and bounded certificates

Single research-only rookEndingTags flag, strict boolean defaultundefined-only
false. maxRookEndingNodes enabledsafeinteger0..50000, defaultundefined-only50000.
Disabled exactE081 including ignored new budget. Explicitnull/nonbool/refusal
must not silently enable/default. Foundation nonaccepted returnsnot-applicable.
Actual strict legal move/fullhistory, root and played position live. Full before/
after inventories must contain only kings/pawns/rooks with exactly one rook per
color AFTER for all facts; root need not already meet that ending composition
(e.g. legal capture of last minor or promotion to missing rook).

1. Side check: actual moved piece isrook, playedenemyking incheck but position
not terminal; rook on same rank asenemyking and complete interiorrankray clear.
Save all actual checkers, king/checker identities, whole inventories, exact
rookray includingcells/blockers and every legal enemy evasion UCI/SAN/resulting
FEN/capture/promotion/flags/check/terminal state. King capture orinterposition
allowed; do not call vulnerable rook safe. No assertion this is sole checker.
If taggedfrozenE057 parent sideevent matchesactualrook/king/ray, retain/replay
that event instead of duplicating it; still save complete new witness and exact
reuseeventindex. Otherwise create side-check-proof atpriority76.4, qualityfalse.
Untested template: Side check: Rc3+ checks king e3 along rank 3.
2. Four versus three: afterpure-one-rook-each ending pawns exactly4and3 either
way, and before DOES NOT satisfy samewhole-boardending/countpair predicate.
3. Three versus two: corresponding exact3and2 countpair, beforedoesnotmatch.
Full sortedpawns/rooks/kings/colorcounts, occupiedfiles/wingclassification and
actualcapture/EP/promotion/history/transition preserved. Own/opponent perspective
explicit, no pawnmajorityquality/advantage claim. New4v3 eventrook-four-three and
3v2eventrook-three-two atpriority30.2 abovegenericstructuralending label, below
urgentwarnings/tactics. Text <=24words; template: Four versus three: you have
four pawns against three, with one rook each. Otherwing/split/doubled pawns count
as pawns; never substitute a nominalmajorityfor exactcounts. Existing4v3quiet
transition abstains for newcountfact, while actualsidecheck may still qualify.

Everynew event includescompleteindependentlyreplayable witness andqualityClaimfalse.
Stable inheritedeventpriority/order preserved; highestexistingwarningselected.
Schema v63 enabled; analysisstatus proven/no-new-fact/not-live/not-applicable/
exhausted with explicitcertificatecategories/reuse. Atomic budget exhaustion
clears ALL newwitness/events and returns exactparenttext/events. No searchengine
or evaluations, oldbudgets/depths/order unchanged.

## Exact work and independent replay

Tick before rootload, eachactualhistoryply, rootlegalenumeration, actualmove,
fullbeforeinventory, fullafterinventory, eachbefore/afterrook-ending/countsummary,
sideeligibility/checkerextract, eachinteriorraycell, legalenemy-evasionenumeration,
eachlegalreplyplay/classification, each reused sourceevent semanticcheck and each
new eventattachment. Countbeforework, nodeslimit+1 onexhaustion. Full savedwitness
may be assembled onlyafterallrequiredwork; no partlycertifiedeventleaks.

Independentreplayer imports Chess/assert and exactE081 parent/priority plus frozen
E057 replay for reused sourceevent; no newsourcegeometry/counthelpers. Derive
64square inventory, scalarrows/ray, histories/actualplayed identities, counts,
composition, pre-existing predicate, completelegal evasions/leafstates, categories,
reuseindex, exacttext/priority/selection/nodecount independently. Reject tampered
inventory/pawncount/color/wing/king/rook/ray/blocker/checker/evasionomission/illegal
reply/history/EP/promotion/terminal/category/reuseindex/budget/event/text/quality/
selection. Valid storage with recomputed hashes still requires semanticreplay.

## Prospective gates and evidence

Bothcolors, sidecheckswithoutadvancedpasser and sourceE057specialpositive;
left/right/filemirrors/allrankdirections underlegality, capturablechecker,
interposition/kingescapes, rookcapturecheckingmove, rearfilechecknegative,
blockedrookray/otherpiececheck/extraorabsentrook/queens/minors/checkmate/terminal,
checkerpromotiononly(notactualrookpiece)retainednegative, existinghistory.
4v3and3v2 positivebothcolors/actorlargerandactorsmaller/bothwings/splitwings/
splitd-e/doubledpawns, independent countinventory; transitions bypawncapture,
rookcaptureoflastminor, promotioncreatingone-rookeachending wherelegal. Existing
matchesquietnegative, wrongcounts/extra/absentrooks/othermen/terminalnegative.
ReuseguardedFRIEND-01eligiblecases and semanticproofs for covered subset; save
originalfrozenrevision/input/outputhashes. Keep broaderFRIENDlimitations explicit.
Higherwarningpriority, default/disabled, strictnull/nonbool/noninteger/negative/
overlimit, zero/exact/one-less atside/material/multipleeventstages, foundation,
root/actualmate/stalemate/dead/clock/repetition, valid/malformed/mismatched/illegal
history/FEN/UCI and comprehensivewitness/rehashedstorageforgery gates.
Allfailedroots retained; addcorrectedroots, no weakenedpredicateorselectedpositives.

D001preflight andsharedguardloader beforeeveryinput inrunner/test/probe/audit.
Authoredsyntheticdevelopmentonly, noexternalgame acquisition orrealgameprecision/
humanusefulness/outcomeclaim. Completepositions/proofs/histories/failures/provenance.
Cheapcorepilot andfocusedactive/dependencychecks duringdevelopment; finishfull
fixturematrix/tamper/savedpilot/candidaterunner/tracker/demo beforeonefinalfull
cumulativecoach/source/diff atsource-freezeboundary. Repeatonlyifchanges/failure/
concerns invalidateit, concrete reasonrecordedbeforelaunch. No full inherited
collectionafterroutineeditsorwhileknowndevelopmentacceptanceworkunfinished.
Threefresh main/repeat/initiallyclean detachedcumulative runs; independent saved
semanticreplay, all5456 orderedE081fullfingerprints/originallist hash unchanged;
onlyC0665/C0681/C0682 mayadvance,1082outsiderows unchanged. Statuscounts onlytool.
Estimate1100-1300s/run fromlatestE081; around8MBsoftstorage target. InheritedE079
losslesscodec, smallnewproofs inline; noexcessivesize-onlyoptimizationorpruning.
No source/HEAD/frozeninputmutationduringruns; reusebranch/checkouts. Cleanlocal
reconciliation and completed-onlyexistingresearch/mainFF, nopush.

Next: implementactualrook-ending wrapper andindependentreplay, thensmallguarded
side/4v3/3v2pilot beforeexpandedregisteredcoverage. No acceptance yet.