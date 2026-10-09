# E087 causal king mobility, cut-off contacts and castling prevention

Registered2026-10-09 before code/testing. Existing isolated checkout/branch;
sharedmain435df12 clean ancestor. Default-disabled E086 wrapper. Reuse legalPosition
and E027 turn snapshots, E062 removed-piece causal method; no shared source edits.

Compare complete legal enemy king moves before (labelled hypothetical enemy turn)
and actual after, plus remove-only-moved-piece after. Denied destination must
have been legal before, absent after, restored on removal, and attacked by moved
piece after. Rook/queen file/rank cut-off requires a denied destination on its
clear straight line. Retain full actual reply sets; no permanent barrier, winning
ending or safety conclusion. Restriction is exact current legal destinations.
No escape squares only when enemy is actually checked, has legal replies, and
none is a king move; clarify captures/blocks remain possible.

Castling prevention needs enemy legal castle before, absent after, restored by
removing moved nonking piece, intact rights and actual attack on king/transit/
destination square. No lost castling rights or future inability inferred.
New actor escape square requires complete legal actor king destinations before
and hypothetical actor-turn after (EP cleared), a nonking move, and square newly
legal now; no general mate prevention or lasting king safety. Use labelled
snapshots; reject illegal counterfactual states instead of inventing moves.

Claims C0354/C0396 bounded causal straight-line rook/queen king destinations;
C0662 same with pure K/R/P material and moved rook; C0443 causal denied king step;
C0442 checked king has no legal king evasion but other legal replies;
C0773 immediately unavailable legal castle due to moved piece's attack;
C0777 newly legal actor king step from nonking move beyond original home-pawn case.
Ranks61-62/87/175/206/208/227 grouped by legal move/counterfactual machinery.
Broad fortress/cut-off/endgame value, durable restriction and safety stay pending.

Focused positive/negative both colors, line blockers, noncausal/pinned states,
castling rights/check/transit/captures, full king replies, strict/default/disabled,
terminal/history, atomic budgets, <=24word comments and qualityClaim false.
Independent focused causal move-set checker, cheap guarded pilot, E086 affected
checks and source/diff. Deferred combined regression, complete saved semantic
replay, interactions, exact three changed-work reproductions, occurrence audit
and real-game precision/usefulness. No accepted tracker advancement/push.
