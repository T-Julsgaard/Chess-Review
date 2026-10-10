# Initial focused harness outcome

2026-10-10. npm run research:coach-tests -- E184: 15 of16 focused checks
passed; total112.9seconds. Sole failure: the terminal-fixture test expected
not-live for White Kf7 Qg6 / Black Kh8 with WHITE to move. That is a live
extra-material position and correctly returned material-prerequisite.
Correct ONLY the authored fixture's side to move to Black (actual stalemate),
with syntactic black king move controls; re-run only this affected check.
No runtime gate or expected terminal behavior changed. No H6 panel recollection,
full suite or repeat of15 passing unaffected checks is needed.

Initial source snapshot: corrected-smoke collection preceded this test file.
The erroneous source line was:
`const fen=boardFen({h8:'k',f7:'K',g6:'Q'}),t=inspectKingRoute({fen,move:'f7f6',history:{fen,moves:[]}},{enabled:true,alternative:'f7e6'});assert.equal(t.status,'not-live');`

Observed assertion: actual material-prerequisite, expected not-live,
routes.test.mjs line26; runtime2.8163ms for that test. The remaining15 checks
include both-color positives, noncausal shoulder controls, exact/one-short cap,
strict/history/immutability controls and independently mutated source/result
proofs. Their passed evidence is not a full combined acceptance claim.
