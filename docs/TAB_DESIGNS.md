# Saved panel designs

Open **Settings → Visual → Tabs** to choose a design for each panel independently.
The choices are local visual preferences and survive reopening the extension.

| Panel | Designs | Default |
| --- | --- | --- |
| Engine | Original, Focus | Original |
| Evaluation bar | Original, Balance | Balance |
| Evaluation | Original, Timeline, Move bars | Timeline |
| Accuracy | Original, Page tabs, Dials, Reveal | Reveal |
| Move list | Original, Full height, Zoomed in, Zoom +20% | Full height |

Original Accuracy restores the combined score/category panel, its seven-row
summary, expandable full category list, explanations and practice button. Page
tabs restores the first three-page design with named buttons. Dials retains the
current compact overview, phase bars and carousel. Expanding the original category
list scrolls inside the fixed panel rather than moving neighboring controls.

Reveal is a new iteration of Dials with **Estimated rating** labels and no score
glow. When its overview first receives completed results, all numbers count up,
rings and phase bars fill, and player names/labels type in together over 1.2
seconds. One clock drives the reveal. Final text reserves the exact layout and
remains accessible throughout. It waits for startup shutters and background tabs,
does not restart on normal redraws or page changes, and can play for new analysis
results. Turning motion off or requesting reduced motion shows final values
immediately. Original, Page tabs and Dials remain available with their earlier
presentation; existing saved design choices are preserved.

Original Move list restores its title header and empty footer strip. Full height
omits both nodes so the scrollable moves body reaches the panel bottom. It keeps
the same move cells mounted when switching; the separate rows/cards/compact and
badge preferences apply to all designs. Zoomed in uses large notation and spacious
rows. Zoom +20% uniformly enlarges the original list contents by 20%, providing a
gentler increase in text, icons, badges and row spacing. Both keep the same panel
dimensions and full-height scroll area, with the current move kept in view.

Focus Engine highlights the recommended move, separates its continuation, and
keeps a White-relative score beside each candidate. Click a candidate to explore
its variation. The inline **Lines** buttons show one to four candidates using the
existing on-demand search; **Auto-play** lets the engine play its best moves and
can be stopped at any time. The footer explains score signs and shows the engine
and configured search depth. Candidate lines scroll independently of the fixed
header and playback footer on desktop. Practice hides all answers and disables
the controls. Original remains the default and is always available.

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
