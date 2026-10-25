# Layout at 100% browser zoom

The current Full HD review pass restores the approved pre-redesign composition
at 100% browser zoom. It converts the original coordinates and content scales
together, with scoped component styles, rather than stretching the panel grid.
It applies to 1800–2000px wide, 880–1100px high viewports, covering the 1920 × 1080
screen with browser chrome. Other sizes retain the responsive layout below while
the Full HD appearance is reviewed.

`node scripts/learning-browser.mjs --working-tree --full-hd-reference` renders
revision `8516f684` at 87% and the prototype at 100% in separate test extensions.
It compares panel and content dimensions in physical pixels, saves paired
screenshots, and checks that Reorganize, Reset, and reload preserve the result.

The Full HD review viewport clips panels that expand below the window instead
of adding page scrolling. Individual panel bodies still scroll. The move-list
highlight converts screen distances back to layout pixels when following a
move, and updates without a color transition during rapid navigation.

Learning fades use the individual `translate` property so panel content scales
remain intact. Board return motion converts translations through the review's
scaled ancestor. `--review-interactions` records entry/return frames and checks
interruption, reduced motion, expanded viewport bounds, and rapid move following.
The Full HD learning board and side UI share equal space above and below in the
viewport beneath the header. Centering changes their vertical position while
preserving the board size, right edge, and straight entry/return animation.

Review startup and Reset layout restore 100% browser zoom. Window resizing uses
the actual CSS viewport and never changes browser zoom. A manual zoom choice
made after startup remains available for accessibility.

The automatic review uses CSS grid, real panel dimensions and normal text sizes.
It does not scale or zoom the whole document. The board stays square. The chosen
panel order is retained: review above Moves and Accuracy, with Evaluation,
Engine, playback and Solve Puzzles below them.

| Available viewport | Review behavior | Learning behavior |
| --- | --- | --- |
| At least 1100px wide and 600px high | Board beside two panel columns; all panels and playback fit the window. Long panel contents scroll within their panels. | Board and content beside each other. |
| 820–1099px wide, or a wide window under 600px high | Board, commentary, moves and playback first; remaining panels follow vertically. | Side by side from 980px; otherwise board and content stack. |
| Under 820px wide | Board and playback first; all review panels remain available below. | Board and content stack, with local scrolling and navigation to the current activity. |
| At least 2200px wide and 1200px high | Larger board, columns, labels and controls; board capped at 1400px to keep the workspace coherent on 4K and ultrawide displays. | Wide desktops retain a separate Settings gutter. |

The top bar is 52px tall. On narrow screens its controls compact to fit rather
than introducing horizontal scrolling. Settings stays within the viewport and
scrolls internally. The popup uses its own native 320–360px layout.

Custom panel arrangements retain their saved coordinates and content scales.
Only the custom canvas gets a local transform when the window is smaller than
the arrangement. Drag deltas are converted back to canvas coordinates, and
opening Reorganize preserves the responsive panels' measured dimensions.

Learning reserves a Settings gutter on desktops at least 1600px wide. On laptops
and tablets Settings overlays the content without moving it; reserving a fixed
334px gutter there would unnecessarily force the board above the lesson.

The former default commentary size of 18px migrates once to 16px. Other chosen
sizes are retained, and the migration marker protects later custom choices.

## Verification

`node scripts/learning-browser.mjs --working-tree --native-zoom` runs the real
extension in an isolated Chrome profile. It records screenshots and geometry
in `web-ext-artifacts`, with an HTML gallery and JSON measurements.

Coverage includes every preset from the Screen sizes tool:

| Group | Display sizes |
| --- | --- |
| Desktop | 1920 × 1080, 2560 × 1440, 3840 × 2160, 3440 × 1440 |
| Laptop | 1280 × 720, 1366 × 768, 1440 × 900, 1536 × 864, 1920 × 1200 |
| Tablet | 768 × 1024, 820 × 1180, 1024 × 1366 |
| Phone | 320 × 568, 390 × 844, 430 × 932 |

Desktop and laptop cases also reserve 120px and 160px for browser chrome.
Additional checks cover short windows and landscape orientations; expanded
Accuracy; panel editing, Reset and reload; migration from 87% zoom; both Settings
tabs; light theme; opening lessons; puzzles; both run modes and their results;
and expanded manual entry in the popup.
Display densities of 125%, 150%, and 200% are also emulated while the browser
zoom remains at 100%.

`--viewport-preview`, `--panel-groups`, and `--navigation` provide additional
checks for the live preview, real pointer gestures, saving, keyboard navigation
and returning between review and learning. `scripts/release-layout.mjs
--working-tree` additionally exercises real browser window resizing rather than
only emulated CSS viewports. `npm test`, `npm run verify:source`, and `npm run lint`
remain required checks.

Phone and short-window cases intentionally scroll vertically. Full desktop and
laptop compositions must have no page overflow, no overlapping panels, and no
controls outside the window. Screenshot review supplements those measurements;
the emulated sizes do not constitute testing on physical mobile devices.
