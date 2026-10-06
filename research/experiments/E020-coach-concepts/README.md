# Coach concept prototype

This folder is an isolated research implementation. It is excluded from the
extension package. [CONCEPTS.md](CONCEPTS.md) is the complete user-supplied list;
the [per-entry tracker](evidence/concept-status.md) records implemented scope,
partial coverage and deferred entries. [RESULT.md](RESULT.md) is the canonical
evidence/resume record.

Run from the repo root with Node.js 24:

```sh
node --test research/experiments/E020-coach-concepts/code/*.test.mjs
node research/experiments/E020-coach-concepts/code/run.mjs
```

Open [evidence/demo.html](evidence/demo.html) in a browser. It displays before
and after positions, supported comments, abstentions, invalid moves and
expandable certificates. Color-reflected cases are retained in
[results.json](evidence/results.json). Regeneration reads only authored fixtures;
its guarded D001 eligibility check does not read games into the experiment.

The pure API in [code/concepts.mjs](code/concepts.mjs) is usable from Node:

```js
const result = explainMove({
  fen: '4k3/5q1p/8/5N2/8/8/P7/K7 w - - 0 1',
  move: 'f5d6',
});
// result.events: square-specific concepts and witnesses
// result.comment: selected comment, or null when unsupported
```

Warnings take priority over other tactical comments. A legal `alternative`
from the same starting position is required for an avoidance comparison.
Without it, no avoided-fork claim is made. `scanReplies: false` disables reply
warnings and avoidance. `maxNodes` defaults to 50,000 counted move-generation
and move-application operations, rather than Stockfish nodes. On exhaustion,
all tactical comments are discarded and diagnostics report incomplete work.

Forks cover newly created knight/pawn attacks on at least two non-pawn targets.
Every legal defender reply must admit a target capture by the forker, and
every immediate counterreply must leave a positive net nominal material delta
relative to before the fork move. Branches ending in defender mate or draw
are rejected. Proofs include defender replies, selected captures, worst
immediate responses and their material deltas. The replay checker independently
enumerates these branches using the same bundled legal-move library.

This finite certificate proves its stated capture/material property. It does
not establish a best move, strategic safety, a winning position, or what a
player intended. Neutral wording avoids attaching praise to that evidence.
Pins are described as restrictions on leaving the pin line; a pinned slider
may still move along it. Rule facts never imply castling was safe or an
underpromotion was best. Terminal results take precedence over lesser motifs.

FEN supplies castling/en-passant rights and counters but no earlier repetition
history. Syntax and non-moving king safety are checked; historical reachability
of an arbitrary setup is not proven. Repetition claims, comprehensive dead
position adjudication, strategic advice, relative pins and other fork types
remain deferred. Real-game precision and human instructional value require
fresh registered data and independent assessment under the research protocol.

Any future real-game input-loading entry point must call `openResearchData()`
and use its registered input loaders. Do not feed unapproved game-derived
positions into this API to bypass the repository's data policy.
