# E087 development exposure

First19focused checks fail5 (3.8s): blocked-ray/ordinary moves legitimately create
an actor king step by vacating b1/a2; they are negative only for enemy restriction/
cut-off, not all new facts. Retain inputs and require new-king-step while forbidding
cut-off. Original castle root Rf1 already attacked f8, so O-O was not legal before.
Retain as non-new prevention negative; add Rb1-f1 root with genuinely legal before
castle. No causal gate changed.

Final26 E087 plus17 E086 dependency checks pass. Every new claim has a focused
positive/negative; no-king-evasion case retains the legal nonking interposition,
castling prevention has both-color before/actual/remove-piece witnesses.
Independent focused move-set replay and forged reply/destination/castle tests
pass; complete combined event/comment/budget semantic replay still deferred.
