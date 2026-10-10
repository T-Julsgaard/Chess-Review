# E137 — complete mating-candidate panels and optimal continuations

2026-10-10 before implementation/evaluation. Parent E1368b6e2bf. Authorized current
main, research-only local commits/no push. BUILD-FIRST.md; no long cumulative tests.

Four compatible analysis-tool scopes, without inferring human mental activity:
C0138 compare EVERY legal move from the actual before-board under same finite
forced-mate objective. C0137 eliminate candidates with complete refutation at the
fastest successful continuation bound. C0135 opponent's best delaying reply under
that declared mate-distance objective: after actual, quantify EVERY legal defense
and its exact remaining mate distance, maximize it, retain all tied longest replies.
C0118 principal variation from actual successor: select shortest mating moves,
longest delaying enemy replies, continue to real checkmate. No engine-PV claim,
no general positional optimality, no observation of a player's thinking method.
Broader nonmating comparisons, thinking support and strategic values remain open.

Reuse E029 full legal query; preserve full history and every shorter refutation
for each exact distance. Candidate rows contain actual legal successor, SAN/UCI,
all query depths0..H until success or bound, exact distance/null and claim leaf
audit. Failed finite search is unresolved, not a drawn/lost board. Mechanical
terminal leaf distinguishable. Claimable50move/threefold leaves anywhere required
abort new labels as claim-rule-prerequisite; no mandatory attacker-claim shortcut.

All legal before candidates, no arbitrary truncation. Fastest=min known distance
AFTER candidate; each null row has full failed H proof, so cannot beat a known
distance<=H. Retain all tied fastest candidates, complete eliminated complement
and relevant refutation at fastest bound. Compare only with at least one certified
mate and no claim ambiguity. Actual can fail while another candidate succeeds:
then comparison/filter may be available but actual PV/best-reply labels absent.
No avoidable blunder or overall best-move classification.

For actual certified distance D, PV states each retain complete query0..D proof
panel, and every defender step retains every child's exact query panel0..D-1.
Own choice comes from first successful proof (shortest); enemy choice maximizes
child distance with sorted-UCI tie break. Each step decreases exact distance1,
terminal state distance0 is real mate. Save every PV move/SAN/FEN and full child
panels, not a single unevaluated line. Initial defense panel supports C0135 with
all tied longest delays. Independent checker imports neither solver nor detector;
reuse neutral E029 replayQuery, independently reconstruct candidate legal inventory,
successors, all lower bounds/claim leaves, minima, elimination, every PV defense
table, chosen move/distance/terminal and exact comments. No shared code changes.

Defaultfalse candidatePanelTags; strict maxCandidatePanelNodes integer0..50000
default50000, candidateMatePlies integer0..4 default2. All state/edge/claim scans/
history/PV work shares atomic extra budget. Exhaustion drops all new state/events,
preserves E136 including enabled features. Disabled exactly parent, no implicit
flags. Illegal inputs/strict controls/history/clock, H0/no certified candidate,
actual failure with available mating alternative, exact/one-below and zero budget,
complete panels and independent saved/proof-mutation checks. <=16 authored pilot
cases both colors; cheap fixed50000 smoke first, target seconds/tens of seconds.
No engines/tablebases/acquired games, D001 test guard receipt and source closure.

Prospective core White Kg6/Qg5 versus Kh8, actual Qe7 H2, reuses exposed E136
authored distance2 mechanic. Full before panel may have faster actual mates; actual
PV should be ...Kg8 Qe8#. Variant actual Qf5 should still have a candidate panel
whether or not actual meets same mate bound. Neutral K/R versus distant king H0
should have no certified candidate. Terminal actual Qg7# tests distance0/no reply.
No hypothesis failures silently replaced; retain exposure/amendments if needed.

Queue deviation: defensive rook families need sustained/outcome policy, licensed
tablebase format unavailable, and broad nonmating strategic judgments need validated
evaluation inputs/usefulness. This batch builds complete candidate comparison and
continuation machinery instead of repeating geometric labels or external queries.
All original scopes remain in catalog. Accepted/numerical/production unchanged.
Deferred combined cumulative regression, exhaustive interaction/absence/priority/
history/budget/original-occurrence audit, exact main/repeat/initially clean
reproductions, real-game precision/usefulness and nonmating strategic extension.

Additional prospective branching control before any E137 evaluation: White Kf6/
Qc5 versus Kg8, actual Qg5+ H2. Hypothesis ...Kf8/...Kh7/...Kh8 all permit a mate
next; retain all replies/ties. Include with the original core, Qf5, actual Qg7#,
H0 core, neutral H0, zero and clock99 for16cases total across both colors.
