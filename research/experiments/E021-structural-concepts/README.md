# Short structural coach comments

Research-only expansion of E020. `explainMove({fen, move, alternative?})` returns
short selected text plus separately inspectable factual events and evidence.
Moves use UCI. Invalid positions/moves are refused. No extension files import it.

Run `node --test research/experiments/E021-structural-concepts/code/*.test.mjs`
then `node research/experiments/E021-structural-concepts/code/run.mjs`.
Optional `--out research/runs/E021/name` preserves repeat evidence.

The [demo](evidence/demo.html) shows before/after boards. The cumulative
[tracker](evidence/concept-status.md) preserves every original concept entry;
partial interpretations remain unchecked. Only newly created facts or meaningful
piece transitions generate events. One selected comment stays within 24 words.
Tactical warnings and terminal outcomes take priority over structural facts.

These are geometry/count definitions, not quality advice. A protected pawn can
still be lost; a battery can be pinned; a centralized king can be unsafe. King
opposition identifies geometry without declaring who benefits. No engine,
real-game precision estimate or player learning study has validated usefulness.
