# E039: verified king activation for promotion

Date: 2026-10-07. Research only. Cutoff/shutdown remains cancelled.

For bare K+P versus K, test actual noncapturing king moves. Require an opt-in
kingSupportDepth 1–6 covering all remaining single pawn pushes, with shared
maxKingSupportNodes 0–50,000. Frozen E037 after-move pawn-route query must prove
safe queen promotion against every defender reply and immediate response.
Before the king move, independently retained pawn-only failure tree must prove
that forward pushes alone cannot meet the SAME safe-queen goal. This makes
king activity meaningful rather than inferring benefit from placement alone.

The before tree keeps every own pawn push in failure nodes and one legal
defender refutation at counterchoice nodes. Terminal draws, pawn capture,
blocked pushes, failed queen safety and depth leaves have explicit witnesses.
No-push and capture failures are meaningful, not a requirement that every king
move wins. After proof and before refutation share history-preserving search
budget; any exhaustion emits no new support claim. No FEN-only cache.

Attach exact geometric attributes to ONE certificate event to avoid duplicated
large proofs: centralization is new king arrival on d4/e4/d5/e5; penetration is
advance deeper into relative rank five or above; opposition is same rank/file
or diagonal with even separation and every strict intervening square empty,
opponent to move. Direct has distance two, distant orthogonal four/six, diagonal
has equal even coordinate gaps. Comments name the actual support effect, never
say opposition is the sole cause or a whole-game win. All tags require the
same positive-after/negative-before proof. Generic key/critical squares remain
deferred because a fixed-position certificate is not a universal square theorem.

Authored synthetic positives/refutations, color/rank reflection, unchanged
already-safe routes, wrong material, blocked king/pawn, short/zero budgets,
history/terminal/failure-tree/safety witness tampering. Independent negative
replayer must enumerate all own failure choices; frozen E037 verifies positive
routes. Cumulative E020–E039 tests, source verification, exact source commit,
main/repeat/initially clean clone, normalized input/output hash matching and
guarded D001 receipt. No registered game is analyzed; retain <3 MB lossless
compact evidence and comments <=24 words. No extension, rating work or push.

## Exposed pilot/retention addendum

The first central king move did not secure promotion; preserve it as a negative
case. A separate authored king move into the center unblocks the pawn, giving
a positive contrast. No geometry-only benefit gate is relaxed.

To retain all large paired proofs within the byte cap, allow a deterministic
gzip JSON certificate pack. Results reference each exact before/after proof
by key; display details stay compact. Verify lossless roundtrip, independent
raw proof replay, unique reference keys and compressed/uncompressed hashes in
run metadata. Exact repeat/clean comparison includes the pack bytes. No proof
leaf is dropped; decompression/replay is documented in RESULT.md.
