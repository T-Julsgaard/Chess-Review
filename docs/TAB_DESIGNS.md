# Saved panel designs

Open **Settings → Visual → Tabs** to choose a design for each panel independently.
The choices are local visual preferences and survive reopening the extension.

**Settings → Visual → Premade UI setups** also offers complete starting setups:

- **Old** restores the automatic arrangement used by Reset layout, with every
  tab design set to Original. Expanding Accuracy moves Engine and Solve puzzles
  down, and collapsing it restores their positions.
- **Modern** uses the supplied arrangement, including its panel content scales.
  Accuracy uses Phase report Modern, Move list uses Zoom +20%, Engine uses Minimal,
  Evaluation uses Move bars v3, and the remaining tabs use Original.
  Its unedited arrangement adapts to the available browser viewport with the same
  readable component sizes as Old, including shorter laptop windows. Learning and
  Settings keep their usable width when switching between presets. Moving or
  resizing panels freezes the currently displayed arrangement into a custom canvas.
- **Custom** is selected automatically after moving or resizing panels or changing
  a tab design. Selecting Custom directly keeps the current arrangement and designs.

Choosing a setup applies its arrangement and tab designs. Individual tabs and
panel positions can still be customized. **Reset layout** restores the starting
setup's arrangement and keeps individual tab choices; Custom stays selected if
those designs differ from the starting setup. Visual's **Reset to default** also
restores that setup's tab designs and selects it again. The starting setup and
custom edits survive reopening. Existing edited setups are labeled Custom while
keeping their saved settings and arrangement. Without a starting selection,
Reset layout uses the automatic arrangement. Opening Reorganize, cancelled drags,
window resizing and unrelated preferences do not select Custom.
Setups keep the current game, scores, engine settings and other
visual preferences.

| Panel | Designs | Default |
| --- | --- | --- |
| Engine | Original, Focus, Minimal | Original (Minimal in Modern setup) |
| Evaluation bar | Original, Balance | Balance |
| Evaluation | Original, Timeline, Timeline v2, Move bars, Move bars v2, Move bars v3, Move bars v4, Minimal | Move bars v3 |
| Accuracy overview | Original, Page tabs, Dials, Reveal, Phase report, Phase report 2, Phase report Modern, Phase report Modern v2 | Phase report |
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
categories and first-move links remain available. Category labels are read-only.
Previously saved names still display. Empty totals
stay at zero with empty strips; live analysis shows **Classified so far** and
updates counters, totals and shares without replacing focused controls.

These Move quality choices apply to all paged overview designs, including Page
tabs. Original overview retains its historical combined panel. Accuracy advanced
uses a scrollable 13-stat report under both Modern overviews, with larger values,
pinned player cards and click-to-open explanations. Other overviews retain the
Original metrics layout; the separate preference reserves future design choices.
Both new preferences reset with Visual.
Run `node scripts/learning-browser.mjs --working-tree --move-quality` for eight
viewport sizes, theme screenshots, keyboard activation and saved-choice checks.

Modern's Quality page shares the overview's player cards and their exact position.
Both category designs omit classified totals and color strips, using that space
for a centered list with larger text, badges and balanced count columns. Badges
and labels align in shared columns, with the whole block centered between
the two count columns, without category bars.
Hovering or focusing a category enlarges only its badge; the text and rows stay
in place. Reduced motion disables the transition. Count links still jump to moves.
Run `node scripts/learning-browser.mjs --working-tree --modern-quality` to verify
header alignment, fit at eight viewports, badge-only enlargement and read-only labels.

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

**Phase report Modern v2** is a separate saved Accuracy overview option. It keeps
Modern's arc geometry, phase cards and shared pages, with slightly bolder headline
scores, a soft arc glow and softly highlighted estimated-rating tiles. The effects
are static and use the active theme's colors. The Modern setup still selects the
original Modern report. Run
`node scripts/learning-browser.mjs --working-tree --phase-modern --phase-modern-v2`
to check v2 at eight viewport sizes, both themes and after reloading saved settings.

All paged designs share Accuracy, Quality and Advanced tabs with a liquid selection
animation and a short page transition. Player names stay stationary while the
results move. Arrow/Home/End navigation remains available. During live analysis,
each phase counts up when both players' scores are ready, keeping later phases
behind earlier ones. Later updates and final totals preserve running phase reveals.
Animations respect motion preferences and reduced motion. Run
`node scripts/learning-browser.mjs --working-tree --accuracy-motion` to verify
stationary names, phase arrivals and Move bars styling in both themes.

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

Timeline Evaluation shows a continuous curve around an equal-position line,
with the current score in the upper-right corner. **Timeline v2** adds the shared
category badges for Brilliant, Great, Inaccuracy, Mistake, Miss and Blunder moves
along the curve. Badges show each move's numerical grade, follow the badge font
and size preferences, and can be clicked to jump directly to that move. The
selected move's badge has an outline. Badges remain circular when the panel is
resized and stay inside the plot at its ends. Choose it under **Settings → Visual
→ Tabs → Evaluation → Timeline v2**.
Move bars v3 is the default, including in the Modern setup. Existing Modern setups
using the former Move bars default upgrade once; legacy setups that have not yet
migrated from Original also adopt it. Custom designs and subsequent choices are retained. Move bars gives
every analyzed position its own column: light above zero for White, gray below
zero for Black. Move bars v2 adds category dots at the bar tips. Move bars v3
keeps those dots and connects the current position's bottom marker to the selected
bar tip with a thin, muted guide. Move bars v4 replaces the dots with full-bar
colors for every move category (including red for blunders); the starting position
and unclassified moves keep their neutral White/Black colors.
The Move bars designs use an ivory position/hover marker in
dark themes and charcoal in light themes. These designs support
click-to-jump, hover scores and keyboard navigation (arrows, Home, End), preserve
focus and chart nodes while navigating. Empty
and pending positions show explicit waiting states. The move list, graph,
keyboard, playback and recorded board moves stop at the furthest completed
evaluation. Parallel searches can finish out of order: earlier pending gaps remain
selectable, while moves beyond the last result stay locked. New completed results
extend that limit; autoplay waits there and resumes when it advances. Pending
positions show “Calculating…” and receive their scores when ready. Scores use White's
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

Review layouts use the live content viewport. Above the approved 919px reference
height, the automatic desktop composition and saved layouts grow together with
their contents, limited by the available width and height. Hiding the bookmarks
bar therefore enlarges the review; showing it again restores the fit. Resizing
preserves saved panel geometry, review position and the user's browser zoom.
Run `node scripts/learning-browser.mjs --working-tree --viewport-growth` to check
both Old and Modern through height changes, laptop/large displays and learning
entry/return, with screenshots and bounds checks.

`tests/panel-designs.test.mjs` covers the settings controls, independent storage,
startup/reset behavior, unknown IDs, live counters, score/layout preservation
and full-height frame removal. Run
`node scripts/learning-browser.mjs --working-tree --tab-designs` for an isolated
Chrome audit at desktop, laptop and phone sizes. It measures the extra move-list
space, checks the final move stays visible, compares scores and panel positions,
tests saved choices after reload and saves screenshots of every design.
