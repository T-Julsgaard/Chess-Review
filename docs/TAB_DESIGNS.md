# Saved panel designs

Open **Settings → Visual → Tabs** to choose a design for each panel independently.
The choices are local visual preferences and survive reopening the extension.

**Settings → Visual → Premade UI setups** also offers complete starting setups:

- **Old** restores the automatic arrangement used by Reset layout, with every
  tab design set to Original. Expanding Accuracy moves Engine and Solve puzzles
  down, and collapsing it restores their positions.
- **Modern** uses the supplied `chess-review-layout (7) modern.json` arrangement,
  including its panel content scales. Accuracy uses Phase report (the first
  version), Move list uses Zoom +20%, Engine uses Minimal, and the remaining
  tabs use Original.

Choosing a setup applies its arrangement and tab designs. Individual tabs and
panel positions can still be customized. **Reset layout** restores the selected
setup's arrangement and keeps individual tab choices. Visual's **Reset to
default** also restores that setup's tab designs. The selected setup and custom
edits survive reopening. Existing users keep their settings and saved arrangement
until they choose a setup; without a selection, Reset layout uses the automatic
arrangement. Setups keep the current game, scores, engine settings and other
visual preferences.

| Panel | Designs | Default |
| --- | --- | --- |
| Engine | Original, Focus, Minimal | Original (Minimal in Modern setup) |
| Evaluation bar | Original, Balance | Balance |
| Evaluation | Original, Timeline, Move bars | Timeline |
| Accuracy overview | Original, Page tabs, Dials, Reveal, Phase report, Phase report 2, Phase report Modern | Phase report |
| Accuracy move quality | Original, Distribution | Distribution |
| Accuracy advanced | Original | Original |
| Move list | Original, Full height, Zoomed in, Zoom +20% | Full height |

Original Accuracy restores the combined score/category panel, its seven-row
summary, expandable full category list, explanations and practice button. Page
tabs restores the first three-page design with named buttons. Dials retains the
current compact overview, phase bars and carousel. Expanding the original category
list grows the panel and moves Engine and Solve puzzles down in the same column.

Accuracy's three pages have separate rows in Tabs. The existing `accuracyDesign`
preference and saved overview choices remain intact. Move quality has its own
`accuracyQualityDesign` preference: Original retains the earlier category list;
Distribution adds paired classified-move totals, category color strips and
compact comparison rows. Count backgrounds show each category's share of that
player's classified moves, using a separate denominator for each player. All ten
categories, editable names and first-move links remain available. Empty totals
stay at zero with empty strips; live analysis shows **Classified so far** and
updates counters, totals and shares without replacing focused controls.

These Move quality choices apply to all paged overview designs, including Page
tabs. Original overview retains its historical combined panel. Accuracy advanced
currently offers its existing Original metrics layout; its separate preference
reserves the page for future iterations. Both new preferences reset with Visual.
Run `node scripts/learning-browser.mjs --working-tree --move-quality` for eight
viewport sizes, theme screenshots, keyboard activation and saved-choice checks.

Reveal is a new iteration of Dials with **Estimated rating** labels and no score
glow. When its overview first receives completed results, all numbers count up,
rings and phase bars fill, and player names/labels type in together over 1.2
seconds. One clock drives the reveal. Final text reserves the exact layout and
remains accessible throughout. It waits for startup shutters and background tabs,
does not restart on normal redraws or page changes, and can play for new analysis
results. Turning motion off or requesting reduced motion shows final values
immediately. Original, Page tabs and Dials remain available with their earlier
presentation; existing saved design choices are preserved.

Phase report is the latest Accuracy overview: large headline scores, compact
paired phase cards, then estimated ratings at the bottom. Cards show only their
score with the existing Excellent/Good/Inaccuracy/Mistake/Blunder color;
visible category text and symbols are omitted. Presentation thresholds are
documented in [the Accuracy panel guide](ACCURACY_PANEL.md); numerical scores,
annotations and rating calculations are unchanged. Missing samples stay neutral.
It retains the compact height, carousel, synchronized reveal and earlier designs.
Run `node scripts/learning-browser.mjs --working-tree --phase-overview` to check
eight viewport sizes and save screenshots, including a clearly named display
fixture demonstrating all five category bands without storing fake game analysis.

Phase report 2 is a separate overview option with a shared comparison grid.
Player names sit above their numerical columns; a softly framed Accuracy row
leads, followed by three aligned phase rows and Estimated rating below. Labels
occupy the left column, colored scores stay compact, and names can wrap to
two lines. The original Phase report remains unchanged and stays the default.
The new arrangement preserves the same phase colors, scores, rating model,
compact panel size, carousel and reveal animation. Select it under **Visual →
Tabs → Accuracy overview**. Run the browser audit with `--phase-report-2` to
verify alignment and fit at eight viewport sizes.

Phase report Modern adapts the first Phase report to the Modern setup's narrow,
taller Accuracy panel. Two Reveal arcs frame the headline scores, with paired
phase cards and estimated ratings below. Select **Settings → Visual → Tabs →
Accuracy overview → Phase report Modern**; it saves independently of the earlier
designs. Accuracy scores throughout the overview designs omit the percent symbol;
Advanced's engine top-move match remains a percentage.

All paged designs share a folded bottom-right corner. Click it, press Enter or
Space, or drag it left/up to turn to the next page. Short drags, Escape and pointer
cancellation return the corner without changing pages. Existing page buttons and
arrow/Home/End navigation remain available. Sheet turns and the score reveal
respect animation preferences and reduced motion. Run
`node scripts/learning-browser.mjs --working-tree --phase-modern` to verify the
Modern layout at eight viewports, settings persistence, real pointer dragging,
sheet cleanup and reduced motion, with dark/light screenshots.

Original Move list restores its title header and empty footer strip. Full height
omits both nodes so the scrollable moves body reaches the panel bottom. It keeps
the same move cells mounted when switching; the separate rows/cards/compact and
badge preferences apply to all designs. Zoomed in uses large notation and spacious
rows. Zoom +20% uniformly enlarges the original list contents by 20%, providing a
gentler increase in text, icons, badges and row spacing. Both keep the same panel
dimensions and full-height scroll area, with the current move kept in view.

Focus Engine refines the original layout: score badges on the left, compact move
sequences on the right, Stockfish and depth in the header, and the full-width
**Play best moves from here** button below. Notation wraps to two lines in narrow
panels, with the first move emphasized and move numbers muted. Click a line to
explore it; hover or focus it for the full continuation and score explanation.
Set the number of lines in **Settings → Engine → Panel lines**. The candidate
list scrolls independently of playback on desktop, and practice hides answers.
Saved Focus selections use this revised layout. Original remains the default.

Minimal is the Modern setup's Engine design. A slim header holds depth and a
green play button (red when playing); larger single-line variations show plain
scores and an emphasized first move. The default single line sits at the top,
with **+ Add line** directly below it. Each press requests one more candidate,
up to three. **− Remove line**
removes the last candidate, down to one. Both actions save the panel-line count;
the add button disappears at three lines. Minimal caps older four-line choices
and on-demand searches at three; Original and Focus still support four. All rows
and controls fit the preset's existing height without a scrollbar. Hover or
focus a row for its continuation and score explanation, or activate it to
explore the variation. The full engine name is in the depth tooltip. Existing
Modern setups using the former Original default upgrade once;
later individual design choices are retained. Select Minimal independently under
**Visual → Tabs → Engine**.
Run `node scripts/learning-browser.mjs --working-tree --engine-minimal` to check
all three line counts, adding/removing and keyboard use at six viewport sizes,
and save screenshots.

Changing designs does not change the game, selected move, annotations, numerical
accuracy, Elo estimate, engine settings, analysis cache key or panel arrangement.
Both designs' choices participate in Visual's **Reset to default**. Missing or
unrecognized saved IDs fall back to the current defaults.

Balance uses a slim White/Black rail, labeled ends and a single score badge that
follows the balance. A light badge favors White, a dark badge favors Black, and
0.0 marks an equal position. Scores always use White's perspective (+ for White,
− for Black); M means mate. Hover or focus the bar for an accessible description.
It follows board flips, keeps the previous fill while showing an ellipsis during
live search, and respects animation settings and reduced motion. The scale and
engine scores match Original; the fill is not a win probability. Existing bar
color styles and panel dimensions apply to both versions.

Run `node scripts/learning-browser.mjs --working-tree --evaluation-bar` to check
score fit, mates, flips and saved choices at four viewport sizes with screenshots.

Timeline Evaluation shows a continuous curve around a labeled equal-position
line. Its header pairs the selected move with its score and a plain-language
White/Black advantage label. Move bars gives every analyzed position its own
column: light above zero for White, gray below zero for Black. Its compact
previous/next buttons step through evaluated positions. Both designs support
click-to-jump, hover scores and keyboard navigation (arrows, Home, End), preserve
focus and chart nodes while navigating, and stop at the analyzed prefix. Empty
and pending positions show explicit waiting states. Scores use White's
perspective regardless of board orientation; M means mate. Original retains the
earlier graph styles. Designs share engine results and do not change analysis.

Run `node scripts/learning-browser.mjs --working-tree --evaluation-panel` for
screenshots and checks of both designs at five sizes, keyboard/pointer navigation
and saved choices after reload.

## Adding another iteration

Register a stable ID and display label in `lib/panel-designs.js`; preserve existing
IDs so saved choices continue to work. Accuracy renderers share the current
review state and use a scoped class in `lib/panel-designs.css`. Move-list designs
configure the frame around the existing scroll body. Add new branches to the
appropriate renderer without changing scoring or running engine searches.

The defaults and Visual reset keys come from that registry. Keep old renderers
and scoped styles available when adding an iteration, and reset the active stats
references when switching so in-progress analysis updates the correct design.

## Verification

`tests/panel-designs.test.mjs` covers the settings controls, independent storage,
startup/reset behavior, unknown IDs, live counters, score/layout preservation
and full-height frame removal. Run
`node scripts/learning-browser.mjs --working-tree --tab-designs` for an isolated
Chrome audit at desktop, laptop and phone sizes. It measures the extra move-list
space, checks the final move stays visible, compares scores and panel positions,
tests saved choices after reload and saves screenshots of every design.
