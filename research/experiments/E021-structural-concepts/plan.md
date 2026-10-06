# E021: Short structural coach concepts

Registered: 2026-10-07, Codex at the user's explicit unattended-work request.
Track: concrete educational vocabulary. Baseline: frozen E020 (`d1509bb`).
This extends the coach research only; the numerical research remains paused.

## Claim and scope

Can objectively defined pawn, file, piece-coordination and material features
produce concise, square-specific move explanations? The target is exact
mechanics on authored positions, not move optimality or player improvement.
Comment quality and real-game precision remain unconfirmed.

Implement these operational concepts, reporting only a newly created feature,
an explicitly changed count, or a relevant moved-piece transition:

- Isolated pawns: no friendly pawn on either adjacent file; IQP subset d-file.
- Doubled/tripled pawns: respectively at least two/three friendly pawns on a file.
- Passed pawns: no enemy pawn ahead on same or adjacent files. Protected passers
  have a friendly pawn attacking their square. Connected passers occupy adjacent
  files with rank difference at most one; this does not claim mutual protection.
  An advance/promotion of an existing passer may get a specific factual comment.
- Pawn chains: friendly directed pawn-defense edges; graph components retain
  root/base and terminal/head squares, including branching chains. Islands:
  contiguous occupied files irrespective of ranks. Pawn duos/phalanxes:
  adjacent friendly pawns on the same rank. Rams: directly opposed pawns on one
  file. Pawn tension: opposing pawns which attack one another. Resolving tension
  requires the played pawn to capture the opposing pawn in such a pair.
- Wing majorities: strict pawn-count superiority on a–d or e–h, with the
  convention explicit in evidence; not a claim that the majority can advance.
- Open files contain no pawns; side-relative semi-open files contain enemy
  pawns but no friendly pawns. Rook/queen occupation is a placement fact.
- Connected rooks attack each other on an unobstructed rank/file; doubling is
  the file subset. A queen–rook battery is an unobstructed shared rank/file;
  queen–bishop battery an unobstructed shared diagonal. Tripling requires two
  rooks and a queen on one file, no unrelated piece between their extremes.
- Seventh-rank rook terminology means the opponent's second rank (White 7,
  Black 2); two-rook subset. A rook directly behind a passed pawn is same-file,
  behind relative to that pawn's color/direction, with an unobstructed segment.
- Bishop pair requires bishops covering both square colors. Bishop endings
  require exactly one bishop per side and only kings/pawns otherwise; distinguish
  same/opposite square colors. Named material imbalances require exact remaining
  non-pawn armies (rook versus two minors, queen versus two rooks, queen versus
  rook plus minor, rook versus minor, bishop versus knight). Nominal material
  balance uses explicit p1,n3,b3,r5,q9, without an evaluation claim.
- Central pawn control is geometric influence on d4/e4/d5/e5. No statement that
  the move improves the position. Subjective strategy, safety, initiative,
  tempo, good/bad trades and advanced endgame claims remain deferred.

All existing E020 tactical facts/certificates must remain available. A short
renderer names each concept and its concrete squares in at most 24 words for
the selected comment; proof details stay in structured evidence. Warnings and
terminal outcomes outrank positional vocabulary. Never praise a feature just
because it exists. No intent inference, promise of a win, or advice to trade.

## Inputs, gates and procedure

Authored synthetic mechanics fixtures only, plus color/rank reflection. No real
games, fit or population inference. The original E020 vocabulary remains the
canonical supplied list; a new cumulative per-entry tracker must link it.
Public-data-v1 D001 preflight passed on 2026-10-07 before resuming. Every executable
input-loading runner/test calls the shared guarded loader; D001 is only a policy
eligibility dependency, not an experimental sample. Frozen E020 evidence stays
unchanged. No new acquisition or confirmation access.

Primary gate: all named positive/negative expectations and independently checked
feature evidence pass, zero expected false positives. Existing-motif motion,
blocked batteries, backward versus passed pawns, same-color promoted bishops,
opposite pawn directions, branching chains, file boundaries and illegal setups
must be exercised. All selected comments must name a concept and satisfy the
24-word bound; labels/evidence cannot be added by the renderer. Report coverage
and abstentions for all cases. Keep E020 tests passing and its source hashes
unchanged. Run targeted tests and verify:source before local commits.

No statistical interval, real-player sample size or baseline usefulness effect
is claimed. Tests are exposed development fixtures. One candidate with fixed
definitions, no fitted parameters or engine. Stop each coherent batch when
tests pass and evidence is retained; log failures and corrections. Repeated
generation must match deterministic report/demo/tracker hashes. A clean Git
export replay checks source and pipeline; shared chess.js remains a common
rules dependency rather than independent chess validation.

Reproduction: `node --test research/experiments/E021-structural-concepts/code/*.test.mjs`,
then `node research/experiments/E021-structural-concepts/code/run.mjs`.
Node 24, no new dependencies; no seed, engine budget or cache substitution.
Compute estimate under one minute/batch and 2 MB retained evidence; smoke
before full evaluation. Retain revision, normalized code/input hashes, policy
receipt, exact command, environment, timings and output hashes.

## Unattended cutoff

The user authorized continuing coach research, local commits and Windows PC
shutdown at about 10% **remaining** in the five-hour window. Check live usage
before each batch, plus the active five-minute heartbeat
`monitor-five-hour-usage-and-shut-down-at-8` (renamed to the 10% coach cutoff).
At usedPercent >=90 for windowDurationMins=300, checkpoint/commit completed
work, disable the heartbeat and issue normal `shutdown.exe /s /t 0` without
`/f`. Never infer usage from elapsed time or shut down on missing usage data.
Do not push or integrate into the extension. No further user confirmation is
needed for the authorized cutoff; sandbox approval review still applies.

## Amendments

None at registration. Append dated development corrections with exposure state.
