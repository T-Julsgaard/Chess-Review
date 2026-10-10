# Historical receipt compatibility audit

2026-10-10, after the initial archive admission stopped and before any new chess
evaluation. E116's receipt carries policy document SHA-256
9e6e2e256958657981c680d3678a07ebf28f94c99c809652453004cf161204b6;
the current document carries b9f78bc7e345dc2d5fea681b16f801d85c808ae2173cf8b44ece30ba99e2298f.
Commit ea1e96e changed only DATA_POLICY.md's nine-line computed-tablebase
addendum. It explicitly states that game registries, validators, origins and
archived receipt meanings are unchanged and historical fingerprints must remain.

Retain the failed loader/pilot/build/source closure and actual error log in
evidence/failed-historical-receipt-equality/. Use a strict compatibility audit:
allow only this exact old/current policy-document pair; compare every other
receipt field exactly and verify the current policy's actual bytes. Verify every
original source hash, allowing that same explicitly documented policy file pair
only if it appears in an original source manifest. Original receipts/results
remain unchanged, archive locators bind their original bytes. Later policy or
validator changes must fail. This is evidence admission across a documented
non-game policy addendum, not a chess gate change or a regenerated old result.

After the 18-case pilot, 30 focused checks and independent replay passed, tighten
ID admission to reject JavaScript coercion and add a receipt-mutation check.
Retain initial pilot results and compressed run record. On rerun, reuse all four
fresh E116 results only after exact input/receipt/archive matching and the entire
unchanged recursive E116 collector closure; independently replay them under the
new inspector. Changes confined to scope routing/tests must not force unchanged
chess collection. Bind the initial archive in the final report. No fixture,
scientific gate or origin detector changes.
