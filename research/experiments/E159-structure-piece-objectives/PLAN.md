# E159 — pawn structure and bishop/knight objective comparisons

2026-10-10 prospective compatible batch. Parent E1581c80b51, no E159 chess query
before registration. Current main authorized, research-only/local commits/no push.
Four provisional scopes C0319/C0329/C0338/C0339; broader strategic definitions,
typical superiority, endgame outcome and lasting usefulness remain unresolved.

Opened-bishop mode: recorded final own pawn captures an enemy pawn, then enemy
nonpawn/king recaptures that same pawn. Full true prefix retained. Two pawns
removed, nominal balance unchanged, original own B/N and two declared enemy pawn
targets remain. Current quiet bishop move follows a diagonal that was blocked
solely by the exchanged own pawn before the trade and is now clear. Its same-
source declared prior alternative must be legal quiet nonchecking at the true
earlier own turn. Reuse complete E156 all-defense capture/counterreply policies
for each target in actual and prior contexts, never fake a turn or remove pieces.
Both targets must be on opposite wings (a-c/f-h), not central files.

C0319: bishop covers both declared capture objectives after the newly legal
placement, neither before the exchange under prior alternative. Actual movement
ray/prior sole pawn blocker and exact pawn-count change retained. This is a
specific opening-of-line benefit, not inference from pawn count alone.
C0338: additionally equal-value knight covers neither opposite-wing objective,
while bishop covers each. These are separate available capture policies, not a
promise to capture both pawns sequentially or a general endgame theorem.
C0329: same explicit failed both-wing knight roles, with all replies/refutations;
label objective-limited knight, not a general bad-knight value judgment.

Closed-knight mode: one declared enemy pawn target, actual quiet knight move.
Own B/N compared by complete E156 policy. Every in-board first diagonal neighbor
of bishop is an own pawn rammed against an enemy pawn immediately in front;
bishop has no legal move after every enemy reply. Target is on bishop diagonal,
blocked solely by one of these ram pawns, in every tracked reply position.
Knight covers objective, bishop fails; knight jumps across the blocked line.
C0339 is this bounded closed-structure advantage, not proof of durable strength.
Retain full geometric rays/rams and all actual legal inventories and failures.

Interface: default-disabled structurePieceTags wraps E158 exactly;
structurePieceMode opened-bishop|closed-knight, structurePieceUnits two distinct
own squares ordered bishop/knight, structurePieceTargets two/one enemy pawn
squares respectively, structurePieceAlternative prior bishop UCI in opened mode.
Strict maxStructurePieceNodes integer0..50000 default50000. Optional ordered
structurePiecePanels four/one complete E156 panels independently admitted.
Missing history/mode/objective/alternative/exchange reports prerequisites;
malformed inputs/illegal prior alternatives reject. Current move quiet same
nominated bishop/knight as mode, nonchecking; all child claim/terminal gates carry
through. Atomic global budget includes every panel; qualityClaim:false, <=24word
events in order opened-bishop-capture-policy, both-wing-bishop-objective-advantage,
knight-limited-on-both-wing-objectives, closed-pawn-ram-knight-objective.

Context cost validation1, construction1, one per full actual history ply, root
metadata1 =3+history length; snapshot actual prior during true replay, no second
turn reconstruction. Retain before/after inventories/armies/flags/balance per ply.
Wrapper adds3, each child exact E1563+panel.nodes. Fresh/cache identical costs.
Frozen E156 collector/wrapper/derive/legal checker and independent witness checker
unchanged; own independent context/structure/comparison replay imports no own
builder/collector/detector/derive helpers. Shared Chess semantics remain a limit.

Prospective open base: White Kh8 Bf1 Na1 Pe2 Pf6 Pa5; Black Kg4 Pf3 Pf7 Pa6.
Actual exf3+/Kxf3, current Bc4, prior Bg2. Targets a6/f7. Own Pe2 sole blocker
of f1-e2-d3-c4 ray; after exchange both targets should have bishop coverage but
neither knight coverage. Add Black Na8: ...Nc7 should refute a6 capture. Knight
control replaces Kh8/Na1 with Kg8/Nh8: f7 knight coverage should suppress both-
wing and limited-knight events while preserving opening benefit.

Prospective closed base: White Kh8 Bf1 Nd1 Pe2 Pg2 Pb4; Black Kh1 Pe3 Pg3 Pb5.
Actual Nc3, target b5. Rams e2/e3 and g2/g3 block both bishop exits; target ray
f1-e2-d3-c4-b5 has sole ram blocker e2. Knight should cover every defense.
Add Black Ra5: retained recapture/material-loss response should refute policy.
Remove Black Pe3: knight still works but absent ram should withhold structure
label. Six white smoke families; 16case both-color pilot adds missing history and
zero cap. Cache exact smoke panels, retain failed hypotheses/source snapshots.
Soft500KB gzip target; completeness/budgets not relaxed for storage. No acquired
games/engine/tablebase; D001-test guards/receipts for all evaluation entrypoints.

Outpost reuse audit/deviation: E070 already proves conservative pawn-supported
rank4-6 knight outposts with full pawn-route DAGs and replies, so do not duplicate
it. C0321/C0701 retain future exchanges/permanence as broader gaps and receive
no new credit here. Correct original-ID routing and a declared bounded holding/
exchange policy remain follow-up work. Shared structure/objective machinery
justifies batching C0329/C0338/C0339 with preceding C0319 now; no catalog deletion.

Focused strict/disabled/history/ray/ram/positive/negative/budget/mutation checks,
representative parent checks, small guarded pilot and saved semantic replay,
source verification/diff checks now. Full cumulative/exhaustive catalog/priority/
history/budget integration and exact main/repeat/clean reproductions deferred to
combined freeze. Real-game precision/usefulness and every broad scope remain open.
