# P010 — Lightweight explanations in Insights

Date: 2026-11-26. User-authorized production implementation; research acceptance
and numerical scoring are unchanged. No new experiment or data collection.

The user requested an Insights switch for engine explanations, more room without
the coach portrait, short useful move explanations and a selected-move threat
preview. The existing `lib/move-explanation.js` already uses saved Stockfish PVs
and fixed-position geometry. Keep this independent of the optional research
detector pipeline and its proof/search costs.

Production baseline: `a38a1a7c`. The implementation is the commit containing this
record; its hash is reported with the completed task.

## Selected concepts and wording

- Retain legal-PV captures, promotions, forks, pins, skewers, discovered/double
  checks and engine mate distance. Quote mating lines only when legal replay
  confirms the reported distance and checkmate. A separate inconsistent mate PV
  cannot supply the threat arrow.
- Adapt the cheap board facts in [E021](../experiments/E021-structural-concepts/RESULT.md)
  and the relevance policy in [P007](P007-focused-coach-lessons.md): a rook entering
  an open/semi-open file, newly connected rooks, an advanced passed pawn, a newly
  defended attacked piece, early minor-piece development and a pawn opening a
  bishop diagonal. Describe castling without asserting that the king is safe.
  These are narrow changed-position facts, not strategic proof certificates.
- Select one useful fact, with tactical consequences before quiet geometry.
  Weak moves describe the reply or missed opportunity rather than praising an
  incidental feature of the played move. Name quiet alternatives too.
- Put “g4 is a blunder” above the explanation. Prefer a short “Better was …”
  over repeated consequences, numerical evaluation loss or vague praise.
  Do not claim “only move” without uniqueness evidence. Remove material-loss
  totals measured at an arbitrary endpoint of a truncated PV.

Exclude routine pawn chains/duos, generic long-diagonal placement, speculative
back-rank safety, exhaustive fork certificates, mate searches, exchange trees,
history reconstruction and strategic plans. Their cost or weak relevance does
not serve this compact view. No claim about teaching effectiveness follows.

## Runtime and UI contract

The rectangular switch beside Close game uses `coachEngineReplies` and stays in
sync with Coach settings. Turning it on removes the portrait and its reserved
space while preserving the selected coach. Turning it off restores the portrait.
The move assessment and small threat button share a row to fit desktop Insights.
Normal and Dopamine review styles retain their existing scores and navigation.

“Show threat” draws the first legal saved reply after this exact played ply,
including opponents' bad moves, rather than calculating a hypothetical player-
relative null move. It makes no engine request, does not change the global threat
setting and clears on navigation, variation exploration or disabling explanations.
Bounded, illegal, terminal and inconsistent mate lines abstain. Existing Dopamine
reply/alternative exploration is retained. No cache/schema migration is needed;
old explicit choices and the existing Dopamine fallback remain valid.

Changed production files: `analysis.js`, `lib/move-explanation.js`,
`lib/review-archive.css`, `styles.css` and localized control/settings text.
Regression tests use authored synthetic sequences and positions; no external
games, research evidence or locked confirmation labels are read or reused.

## Verification and release state

Focused regression: 47/47 pass, covering wording, legal PV admission, both colors,
quiet-fact positive/negative cases, alternatives, portrait restoration, persistence,
focus and threat cleanup. Real isolated Chrome checks pass at 1920×1080,
1366×768 and 390×844, including native Space activation and desktop content-fit
assertions. Desktop and narrow screenshots were visually inspected.

Full production regression: 2,024/2,024 pass. Source verification and diff checks
pass. Extension lint: zero errors, zero notices, eight warnings in existing
manifest and dynamic-content/import locations. The isolated browser record and
screenshots are in the ignored local directory
`web-ext-artifacts/release-0.5.1-RhvS3p/learning-audit-aseJjL/`;
`scripts/engine-explanations-audit.mjs` retains the reproducible UI assertions.
No push or publication is authorized.
