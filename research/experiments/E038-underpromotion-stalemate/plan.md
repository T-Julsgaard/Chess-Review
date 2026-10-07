# E038: underpromotion tactics and conditional stalemate resources

Date: 2026-10-07. Research only. No usage cutoff or shutdown automation.

An actual non-queen promotion can be explained as avoiding stalemate when the
legal queen promotion with the exact same from/to squares would instead end
in stalemate, while the played underpromotion leaves a nonterminal position
or actually checkmates. This alone establishes avoidance, not a forced win.
If the frozen forced-mate verifier also proves the actual underpromotion,
retain that separate stronger witness without inferring necessity of a
particular non-queen type. Queen promotion can fail while several choices work.

A conditional stalemate resource requires an actual moved non-pawn, non-king
piece and a legal opponent capture of that exact piece that leaves the mover
stalemated. Name the exact capture in short conditional wording. Do not say the
opponent must capture, every defense draws, the mover was losing, or the offer
was optimal. Keep checkmate and other immediate tactical warnings higher.

Use authored synthetic positives, refutations, both colors, alternate replies,
promotion type/queen counterfactual, capture target and FEN witness tampering.
History is replayed when supplied and all candidate captures are legal moves;
do not query legal moves on a malformed hypothetical turn. Draw terminal roots
refuse future claims. Comments <=24 words and qualityClaim remains false.

Independent replay recomputes the alternate queen position and exact legal
capture result. Guard D001 before fixture loading; analyze no dataset games.
Pilot before cumulative E020–E038 tests and source verification; commit source
before main/repeat/initially clean clone. Retain normalized source/output hashes,
exact revision, receipt/config/environment and all evidence under 3 MB. Compact
JSON is lossless and avoids E037's indentation-only retention failure.

Record exact scopes against original underpromotion/stalemate entries; broader
forced stalemate defense and human learning benefit are not established.
