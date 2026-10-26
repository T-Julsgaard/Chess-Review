# Saved panel designs

Open **Settings → Visual → Tabs** to choose a design for each panel independently.
The choices are local visual preferences and survive reopening the extension.

| Panel | Designs | Default |
| --- | --- | --- |
| Evaluation bar | Original, Balance | Balance |
| Accuracy | Original, Page tabs, Dials | Dials |
| Move list | Original, Full height | Full height |

Original Accuracy restores the combined score/category panel, its seven-row
summary, expandable full category list, explanations and practice button. Page
tabs restores the first three-page design with named buttons. Dials retains the
current compact overview, phase bars and carousel. Expanding the original category
list scrolls inside the fixed panel rather than moving neighboring controls.

Original Move list restores its title header and empty footer strip. Full height
omits both nodes so the scrollable moves body reaches the panel bottom. It keeps
the same move cells mounted when switching; the separate rows/cards/compact and
badge preferences apply to either design.

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
