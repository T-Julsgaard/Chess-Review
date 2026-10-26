# Accuracy panel

**Settings → Visual → Tabs** selects the panel design. Accuracy offers Original,
Page tabs and Dials; Dials is the default described below. The original summary
and first paged iteration remain available for comparison. See
[panel design choices](TAB_DESIGNS.md) for saved settings and future iterations.

The panel has three pages with fixed, shared dimensions. Overview is the initial
page; selecting a page never resizes a panel or moves playback controls. Desktop
uses the original **compact** Accuracy height, including the original 87px
content inset when loading a saved expanded layout. A slim bottom carousel
replaces the three large tabs: previous/next arrows flank the current page name
and three clickable position markers. The carousel supports Left, Right, Home
and End. Short windows scroll the page body while navigation remains visible.
Move counts and evaluation-loss links are keyboard buttons. Category aliases
remain editable. Accuracy and Moves have no visible title headers; their panels
retain accessible names. No page has explanatory footer copy, score/category
tooltips or a practice button.

## Overview and phase scores

Overall accuracy and estimated Elo retain the existing calibrated scoring and
rating modes. Phase accuracy is computed locally from the same scored decisions,
without new searches, permissions, requests or changes to saved analysis.

The overview pairs two open-arc accuracy dials with prominent Elo estimates.
Opening, middlegame and endgame use paired bars aligned with the same player
columns. Arcs and bars are decorative; numerical scores remain readable text,
and unavailable scores show an em dash with an empty meter. Perfect accuracy
uses `100%` so it fits comfortably inside the dial. The score display never
changes the underlying calculated values.

Lichess's [phase accuracy implementation](https://github.com/lichess-org/lila/blob/master/modules/analyse/src/main/AccuracyPercent.scala)
partitions a game and runs its accuracy aggregator on each phase. Its
[board divider](https://github.com/lichess-org/scalachess/blob/master/core/src/main/scala/Divider.scala)
uses piece count, back-rank development and a piece-mixing measure. This panel
uses an independent, simpler divider inspired by the first two signals:

- Opening ends once ten or fewer knights, bishops, rooks and queens remain in
  total, or either home rank contains fewer than four pieces of its own color.
- Endgame begins once six or fewer knights, bishops, rooks and queens remain.
- A decision belongs to the phase of the position **before** that move.
  Phases never go backwards after a promotion. A custom starting FEN can begin
  directly in the middlegame or endgame. A direct opening-to-endgame transition
  does not invent a middlegame sample.

This does not reproduce Lichess's divider exactly. Phase boundaries are
heuristics, not official opening-book boundaries. Lichess also uses a different
[whole-game aggregation](https://lichess.org/page/accuracy); this extension keeps
its own scoring definitions. SF18 phase accuracy uses the existing arithmetic
mean of calibrated decision quality. SF19 uses its existing mean of arithmetic
and harmonic means. Forced moves are excluded from both. A phase requires every
played move for that side in the phase to have compatible scored evidence; an
unreached phase, forced-only sample, missing observation or mixed-engine sample
shows an em dash. Complete earlier phases can still be computed if later
analysis is incomplete. While analysis is running the UI shows pending scores.

## Move quality

All ten existing categories appear, including Excellent, Good and Book. The
left column is the selected player's side, regardless of board orientation;
player names and color dots identify both columns. A nonzero count jumps to
that player's first original-game move in the category. Zero counts are disabled.

## Advanced

All metrics use completed, compatible evidence for the original game. They do
not follow an exploratory variation or change the accuracy/rating models.

- **Average centipawn loss:** mean of `max(0, best.cp - played.cp)` from each
  eligible decision's paired, mover-relative root search. A played top move has
  zero loss. Both observations must be finite centipawn scores with no mate
  distance. Forced moves and mate-scored observations are omitted. The accessible
  value label includes the number of included moves; 100 cp represents one pawn.
- **Engine top-move match:** percentage of non-forced scored decisions whose
  played UCI move exactly matches the engine's first choice, including promotion
  suffixes. This is distinct from the displayed Best category, since annotation
  precedence can label a top move Book, Brilliant or another category.
- **Largest evaluation loss:** maximum centipawn loss in that same cp sample,
  with a button to the original move. Ties choose the earliest move. A zero loss
  is displayed without an active jump. Mate distances are never presented as cp.

No eligible sample or incomplete/mixed evidence produces an em dash, not zero.

## Verification

`tests/game-statistics.test.mjs` covers boundaries, custom starts, phase
aggregation under both engines, missing evidence, mate/forced exclusions,
perspective, exact matches and largest-loss plies. DOM regressions cover page
selection, arrows, count/loss navigation, category aliases, disabled zero counts,
loading updates and removal of explanation/practice controls.

Run `node scripts/learning-browser.mjs --working-tree --accuracy-pages` for an
isolated Chrome audit with the Opera Game, complete SF19 scoring, before/after
screenshots and eight desktop/laptop/mobile viewport sizes. It checks fixed
geometry, larger fonts, page fitting, horizontal overflow and keyboard access.
