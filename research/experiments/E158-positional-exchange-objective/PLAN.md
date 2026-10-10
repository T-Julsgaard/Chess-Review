# E158 — recorded equal exchange and a joint positional objective

2026-10-10 prospective build registration, parent E157317cb96. No E158 chess
query has run. Authorized current main, research-only/local commits/no push.
Claim C0300 only: an actual recorded equal-value nonpawn exchange followed by a
quiet pawn choice achieves E157's joint pawn-contact/activity objective, while a
declared legal declined-exchange line from the same prior history leaves an
available live unit-safe pawn-contact break after the same current pawn move.
This supports a bounded positional comparison, not best trade, player intention,
general exchange value or lasting strategic advantage. Full catalog stays open.

Actual history's final two plies: own N/B/R/Q captures equal-nominal enemy
N/B/R/Q; enemy N/B/R/Q immediately captures that own mover on the exchange
square. Neither actual exchange move checks. No pawn/promotion/EP in exchange.
Require actual prior and current nominal balances identical. Preserve all true
earlier history, every actual history move's full legal inventory/state/check,
prior root and actual/declined armies, material and pawn inventories.

strategicDecline contains exactly two legal quiet nonchecking UCIs from the same
true pre-exchange prefix. First may be a different own unit: declining a trade
can mean playing elsewhere. Second must move the same original enemy recapturer
from its actual historical source. Both paths end on the same actor turn with
identical pawn inventories and nominal balance, then compare the SAME actual
quiet pawn move and same legal same-pawn strategicAlternative. Other piece/king
placements and surviving units differ and must remain explicit; this is a full
line comparison, not an isolated piece-removal intervention or fake turn.

Reuse frozen E157 collectPanel/verifyPanel/derive/wrapper and independent witness
admission unchanged. Retain both complete panels and full E157 nested reports.
Actual must pass the joint scope. Declined must fail it AND leave >=1 safe
contact break after the actual current pawn move; a failure of only an unrelated
prerequisite cannot establish positional benefit. All visited claim/terminal/
history/budget gates from E157 remain. Default-disabled strategicTradeTags wraps
E157 exactly, maxStrategicTradeNodes integer0..50000 default50000, optional
strategicTradePanels object with actual/declined raw panels independently admitted.
Missing history, exchange or declared line/alternative produces prerequisites;
malformed supplied types or illegal declared lines reject. New event
recorded-positional-exchange-objective, qualityClaim:false, <=24words.

Logical context ledger: validation1, main construction1, one per actual history
ply, main-root metadata1, alternate construction1, one per replayed earlier
prefix ply, one per each of the two declined moves, alternate metadata1;
total7+full history length+prefix length. Each composite history ply retains its
complete before legal inventory, move, before/after FEN, check and flags.
Wrapper adds3; then add each exact E157 logical cost3+panel.nodes. Global atomic
cap across both panels and context; fresh/cache costs identical. No partial
witness/event on exhaustion. Existing parent budgets remain separate.

Prospective authored positive: E157 base army plus White Nd4, Black Nf5 Rf8 Pf4.
Actual recorded Nxf5/Rxf5, declined Kb1/Rf6 (Ka1b1/Rf8f6). Current e2e4 with
strategicAlternative e2e3. Actual removes Nd4 from Bg1/c5/Kb6 pin ray; e4
preserves pin and restricts Nc7/Ng7. Pf4 blocks rook f5's f4 escape in both pawn
choices; its EP/contact reply should be capturable by Bg1. Declined leaves Nd4
blocking pin, permitting ...cxb4 after e4. Equal knights traded, pawn inventory
unchanged, balance matched. All hypotheses tested before larger collection.

Controls: remove Bg1 (actual objective unavailable); add Black Pg5 (independent
...gxh4 remains, actual objective unavailable); replace captured Nf5 with Bf5
(equal nominal3 still valid and should pass); replace Nf5 with Qf5 (unequal
exchange prerequisite, no credit); missing declined line/history/zero cap.
Four smoke eligible families (base/no-bishop/independent-break/equal-bishop),
16-case both-color pilot including four prerequisite families. Retain all raw
branches, failures and original source snapshots. Cache exact smoke panels.
Soft500KB compressed target; budgets and evidence completeness never relaxed for
bytes. No acquired games, engine or tablebase; all entrypoints D001-test guarded.

Focused positive/negative, strict/disabled, matched context, actual exchange and
decline legality, true prefix, exact/one-short budgets and independent mutations;
representative parent checks, small guarded pilot and independent saved replay,
source verification/diff checks now. Full cumulative regression/exhaustive catalog,
priority/history/budget cross-checks and exact main/repeat/clean reproductions at
combined freeze. General strategic trade, durable bind and human usefulness open.
