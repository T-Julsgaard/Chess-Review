# Accuracy panel

**Settings → Visual → Tabs** separates Accuracy overview, Accuracy move quality
and Accuracy advanced. Overview offers Original,
Page tabs, Dials, Reveal, Phase report and Phase report 2. Phase report is the default. The original summary
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

Phase report replaces the dials with large overall scores, three compact rows of
paired phase cards, and estimated ratings below the phases. Each card shows only
the exact phase accuracy, colored with the corresponding move-category palette.
Category names and symbols are omitted from the visible cards.
Phase report 2 keeps these elements but arranges them in a comparison grid, with
player names, overall accuracy, phase percentages and estimated ratings sharing
the same two numerical columns. The row labels sit on the left; Estimated rating
remains last. It is a separate option, preserving the first Phase report.
The score display never changes the underlying calculated values. Dials and
Reveal retain their earlier dial/bar layout for comparison.

The new phase badges use these **presentation bands**, independent of individual
move classification and its winning-chance-loss thresholds:

| Phase accuracy | Badge | Existing category color |
| --- | --- | --- |
| 90–100% | Excellent | `--q-excellent` (green) |
| 80–<90% | Good | `--q-good` (soft green) |
| 65–<80% | Inaccuracy | `--q-inacc` (yellow) |
| 50–<65% | Mistake | `--q-mistake` (orange) |
| 0–<50% | Blunder | `--q-blunder` (red) |

These are original UI bands, not Lichess's thresholds or new calibration claims.
Contextual move labels such as Brilliant, Great, Miss and Book are not inferred
from aggregate phase accuracy. Accessible card labels retain the performance
category. Missing/unreached/forced-only phase samples remain neutral with
an em dash; they never receive a bad-play color. During
analysis they show a neutral pending state. Custom category names apply when the
overview renders. Accessible card labels include player, phase, exact percentage,
category and the number of scored decisions.

Engine settings default to two analysis lines. The first line finishes the scoring
pass and makes the review available; extra lines run afterward in one background
worker with a 16 MB hash. Searches retain the selected depth and full game history.
The worker rests for at least three times each search duration, yields on keyboard,
pointer and scroll input, and pauses while hidden or while foreground analysis or
practice is active. Only completed, exact alternatives at a common depth can
certify Great. New categories update Quality counts, move labels and board badges,
and are saved with the review. Accuracy and estimated rating retain their original
single-line scoring evidence. Changing the analysis-line count does not repeat
the scoring pass.

Reveal removes the glow from the previous Dials design and labels the estimate
**Estimated rating**. Results count up and meters fill while all player/phase
labels type in together, once per loaded set of results. The 1.2-second animation
waits until cached reviews are visible, keeps final text sizes reserved, and
restores the exact original score text when complete. Motion-off and reduced-motion
preferences display final results immediately. Earlier designs remain selectable.

Phase report retains that synchronized reveal for its overall scores, estimated
ratings, phase percentages and phase labels. The final category
color stays stable throughout counting, rather than flashing through lower bands.

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

Distribution is the default Move quality design. It pairs classified-move totals
and slim category color strips above compact comparison rows. Each count has a
subtle category-colored background proportional to that player's classified
moves. Totals include all ten categories, including Book; the two players have
independent denominators. Zero totals leave the strips empty. During analysis,
**Classified so far** identifies partial counts; totals and shares update in place
alongside the existing count buttons. The earlier list is available as Original
in the separate Accuracy move quality setting, without changing Overview.

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

Modern's Advanced page is a larger, scrollable post-game report with 13
comparisons in two groups with centered section headings. Its player cards use
the overview's exact markup, position and typography, and stay pinned while the body scrolls. Navigation
stays visible. There are no percentage bars, hover explanations or comeback
meter. Every metric has an **i** button in a fixed top-right position beside the
title that opens its plain-language explanation inside the card. One explanation
opens at a time; clicking again or pressing
Escape closes it. Escape restores focus to the info button. Opening a card
brings it into view, and changing pages dismisses explanations.

**Decision quality** includes the original three metrics, Longest clean streak,
Clean decisions, Best five-decision stretch, Accuracy in balanced positions,
Accuracy while defending, and Accuracy while ahead.

- Clean streak/share use completed classifications rated Good or better,
  including Book. Inaccuracy, Mistake, Miss and Blunder are errors. Forced
  replies neither extend nor break a streak and do not enter the share.
  Missing eligible classifications leave the result unavailable. Tied longest
  streaks retain the earliest run; selecting a streak revisits its first move.
- Best stretch uses five consecutive eligible decisions with the existing
  engine-specific accuracy aggregator. At least five decisions are required;
  tied stretches retain the earliest. The value links to its first decision.
- Balanced/defending/ahead accuracy select eligible decisions by the paired
  root search's mover-relative score before the decision: absolute cp <100,
  cp <=−100, and cp >=100 respectively. Mate scores are omitted from these
  subsets. Sample counts appear below each accuracy.

**On the clock** includes Clock advantage, Biggest clock lead, Average thinking
time and Longest think.

- Clock advantage is the percentage of recorded checkpoints where a player's
  remaining clock was strictly higher. A checkpoint follows each pair of turns,
  including black-to-move excerpts, so both players have moved once. Only pairs
  with both clock tags are compared. Ties enter the denominator but count for
  neither side. Only the percentage appears on the card; the clickable
  explanation describes comparing full moves and skipping missing clock pairs.
  This is a share of checkpoints, not an estimate
  of elapsed wall-clock seconds. It works without a TimeControl header and
  with staged controls because remaining clocks can be compared directly.
- Biggest clock lead is the largest positive difference at those checkpoints,
  linked to the corresponding position. Never ahead is zero; no sample is
  unavailable. Ties retain the earliest checkpoint.
- Thinking times use previous own clock + increment − current own clock,
  retaining fractional seconds and zero-second moves. Missing tags invalidate
  dependent intervals; they are never bridged. Simple base time and optional
  increment controls are supported. Custom starts require real prior samples.
  Unsupported controls show an em dash for thinking times while clock
  comparisons remain available. Longest think links to its original move.

The report uses the original mainline, including cached reviews. It does not
follow variations or change accuracy, annotations or rating models. The same
report appears under both Modern overview designs; other designs retain their
existing Advanced layout. Run
`node scripts/learning-browser.mjs --working-tree --modern-advanced` for eight
viewports, pinned header and info-button geometry, genuine wheel/keyboard input, all 13
explainers, clock data, cached reload and dark/light screenshots.

## Verification

`tests/game-statistics.test.mjs` covers boundaries, custom starts, phase
aggregation under both engines, missing evidence, mate/forced exclusions,
perspective, exact matches and largest-loss plies. DOM regressions cover page
selection, arrows, count/loss navigation, category aliases, disabled zero counts,
loading updates and removal of explanation/practice controls.
`tests/move-quality-design.test.mjs` covers distribution denominators, empty and
live totals, preserved focus, saved page choices, reset behavior and navigation.
Run `node scripts/learning-browser.mjs --working-tree --move-quality` to check
the redesign at eight sizes with light/dark screenshots and real keyboard links.

Run `node scripts/learning-browser.mjs --working-tree --accuracy-pages` for an
isolated Chrome audit with the Opera Game, complete SF19 scoring, before/after
screenshots and eight desktop/laptop/mobile viewport sizes. It checks fixed
geometry, larger fonts, page fitting, horizontal overflow and keyboard access.
