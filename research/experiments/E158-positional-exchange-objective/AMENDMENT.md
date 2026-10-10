# E158 authored-fixture amendment

2026-10-10 after initial four-family smoke. Three complete comparisons passed
independent replay, but base's prospective positive hypothesis failed: Rf5
occupies Ng7's f5 candidate, so Ng7 has0 safe moves after both pawn choices.
Only Nc7 strictly cramps; rook f5 loses d5 but retains4 safe destinations.
Pawn pin restriction and room comparison pass, joint criterion correctly fails.
No-bishop and independent-break negatives pass. Equal-bishop control's Bf5
attacks b1, making Ka1b1 illegal; context rejects before panel collection.
failure-rook-exchange.json.gz preserves full original smoke (including all six
raw panels from three complete comparisons), errors/inputs, original E158 sources
and full dependency hashes. No observation or branch discarded.

Before next evaluation, use E157 base plus White Nd4, Black Nc6 and Nd8 instead
of the extra Nf5/Rf8/Pf4. Actual Nd4xc6/Nd8xc6, declined Ka1b1/Nd8f7. Current
e4 versus e3 unchanged. Actual removes own Nd4 from the pin ray and leaves the
recapturing Nc6 away from d5/f5, so both original knights can be compared. Nc6's
d4 destination is capturable by Bg1 after e4 and by Pe3 after e3; other new
knight options are hypothesized not to improve. Declined retains Nd4 blocking
the ray and should leave ...cxb4 available. Equal nominal bishop control replaces
captured Nc6 with Bc6, which does not attack b1. Unequal control uses Qc6.
All other control families unchanged. These are new authored development cases,
not confirmation. Rerun only tiny smoke because armies/history bindings changed.
No detector, exchange/context/positional threshold, budget or final gate changes.
