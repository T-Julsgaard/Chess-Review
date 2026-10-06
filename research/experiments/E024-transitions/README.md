# Endgame, trade and placement comments

Research-only `explainMove({fen,move,history?,...})` imports E023. Optional
`history:{fen,moves}` must legally replay to the exact input position and counters.
Only a genuine immediate recapture produces trade labels; promotion exchanges
are excluded. Missing history never implies a queen or rook trade.

Run `node --test research/experiments/E024-transitions/code/*.test.mjs`, then
`node research/experiments/E024-transitions/code/run.mjs` (optional
`--out research/runs/E024/name`). [Tracker](evidence/concept-status.md) and
[demo](evidence/demo.html) keep the original list and concise examples.

Pure ending labels describe exact remaining armies, without predicting outcome.
Basic mating-army labels require actual checkmate against a lone king;
queen-and-rook mate requires rook support for the checking queen. Placement
comments describe geometry; outposts, centralization and rook lifts remain
partial interpretations, without safety, permanence or strategic-value claims.
No extension integration. All fixtures are authored synthetic development data.
