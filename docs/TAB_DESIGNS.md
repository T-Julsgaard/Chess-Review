# Saved panel designs

Open **Settings → Visual → Tabs** to choose a design for each panel independently.
The choices are local visual preferences and survive reopening the extension.

| Panel | Designs | Default |
| --- | --- | --- |
| Engine | Original, Focus | Original |
| Evaluation bar | Original, Balance | Balance |
| Evaluation | Original, Timeline, Move bars | Timeline |
| Accuracy overview | Original, Page tabs, Dials, Reveal, Phase report | Phase report |
| Accuracy move quality | Original, Distribution | Distribution |
| Accuracy advanced | Original | Original |
| Move list | Original, Full height, Zoomed in, Zoom +20% | Full height |

Original Accuracy restores the combined score/category panel, its seven-row
summary, expandable full category list, explanations and practice button. Page
tabs restores the first three-page design with named buttons. Dials retains the
current compact overview, phase bars and carousel. Expanding the original category
list scrolls inside the fixed panel rather than moving neighboring controls.

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
percentage with the existing Excellent/Good/Inaccuracy/Mistake/Blunder color;
visible category text and symbols are omitted. Presentation thresholds are
documented in [the Accuracy panel guide](ACCURACY_PANEL.md); numerical scores,
annotations and rating calculations are unchanged. Missing samples stay neutral.
It retains the compact height, carousel, synchronized reveal and earlier designs.
Run `node scripts/learning-browser.mjs --working-tree --phase-overview` to check
eight viewport sizes and save screenshots, including a clearly named display
fixture demonstrating all five category bands without storing fake game analysis.

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
