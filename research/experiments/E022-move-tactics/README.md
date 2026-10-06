# Move effects and bounded tactical concepts

Research-only `explainMove({fen,move,alternative?,maxTacticNodes?})` extends E021.
UCI move input, short selected comment, separate factual events and evidence.
There is no extension integration. [Tracker](evidence/concept-status.md) retains
the original concept list with scope-limited checked and partial items.

Run `node --test research/experiments/E022-move-tactics/code/*.test.mjs`, then
`node research/experiments/E022-move-tactics/code/run.mjs` (optional
`--out research/runs/E022/name`). Open [demo](evidence/demo.html) to review boards.

Capture gains cover every immediate reply. Absolute skewers cover every defense,
the original target capture and every immediate counterreply, with positive net
nominal material. Exhaustion removes E022 material certificates. This finite
horizon cannot prove long-term advantage. Discovered attacks and en prise use a
legal hypothetical next-turn capture, not a promise that the opponent cannot
respond. Loose pieces count geometric defenders, including pinned defenders.
No intent, best move or usefulness is inferred. FEN cannot supply repetition
history; fifty-move text states only the counter threshold and claim caveat.
