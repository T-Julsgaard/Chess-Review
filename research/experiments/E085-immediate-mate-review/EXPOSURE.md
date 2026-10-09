# E085 development exposure

First18 focused checks fail4 (3.0s): back-rank fixtures with Rb1 allow Rxe1
against ...Re1+, so there is no immediate mate threat. Original roots/moves
retained as explicit negative fixtures; add Rb3/a2-pawn versions, where Rb3-e3
really supplies a legal recapture. No detector predicate or scope gate weakened.

Final independent scans expose one further expectation error: original 'prevented'
Rb1-e1 creates ...Rxe1# even though the original enemy-turn snapshot had no mate
(the rook on b1 could recapture ...Re1+). Retain that as a newly allowed-mate
positive, while forbidding claims that it retains/prevents an existing threat.
Root/reply checker passes; no candidate changes justified by this failed assertion.

Corrected24 E085 plus22 E084 dependency checks pass (final command below).
Independent focused checker enumerates all root/reply moves and alternative
mate sets, rejects omissions/forged terminal/mate flags, checks reused E029 mate
certificate without importing its query. No acceptance/tracker advancement.

Initial final19case pilot passes;2,075,892bytes, SHA256
1ec38d9c208bd2be40ffcfc38ab7f66ec5f94c5b4c1685b8e01e7a13670f31a3.
Complete record preserved at research/runs/E085/precompression/results.json.
Use simple lossless gzip for the Git-retained pilot (duplicate witness overhead);
no branches, fixtures, move records or failures removed. Rebind changed pilot
source and rerun only this cheap19case pilot, not historical evidence.
