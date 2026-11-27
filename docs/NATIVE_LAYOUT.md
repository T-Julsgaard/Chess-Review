# Layout at 100% browser zoom

The approved 1920 × 1080 composition is the reference for automatic layouts.
Its panel coordinates and content scales are converted together from the original
87% arrangement. The original 1800–2000px wide, 880–1100px high viewport result
is preserved exactly, including the narrower Settings panel.

Larger desktops grow the board, panels and their contents together, up to twice
the reference size. The toolbar and Settings grow with them. Ultrawide windows
center the composition rather than stretching the columns across all available
width. Laptop windows keep a content scale floor: their board and scrollable
panel bodies adapt to the available space instead of making all text tiny.

| Available viewport | Review | Learning |
| --- | --- | --- |
| At least 1100px wide and 600px high | Reference composition with two panel columns. All collapsed panels fit. Only panel bodies scroll. | Board and UI beside each other, centered vertically beneath the toolbar. The visible UI reaches the review column's right edge. |
| 820–1099px wide, or a wide window below 600px high | Board, commentary, moves and playback first; other panels follow below. | Side by side from 980px; otherwise board and UI stack. |
| Below 820px wide | Board and playback first, followed by all remaining panels. Text keeps its normal size. | Board and UI stack, with navigation and local scrolling to the active exercise. |

Panel styling is shared across these arrangements: normal panel labels, move
rows, Accuracy categories, Engine controls and Insight typography retain the
reference character. Narrow windows reflow the layout instead of shrinking a
desktop screenshot. Portrait and landscape use the actual available CSS viewport.

Laptop arrangements keep the desktop proportions where it matters: the coach keeps
the same inset from the review panel's right edge, so it never covers the Engine
explanations switch or the close button. Accuracy and Quality never scroll at any
viewport or display scale (100%, 125%, 150%): a short panel first switches the
overview to a compact arrangement of the same figures. Every row (accuracy dials,
phases, rating) reads score, label, score in the same three columns, so all score
boxes share one size; the dials take the height left over, from the desktop size
down to a minimum, below which only their figures remain. Quality tightens its
rows, and only a small remainder is zoomed. Sub-pixel remainders at fractional
scaling are hidden rather than drawing a scroll bar. Advanced is a long list and
keeps its own scrolling. When a new engine line makes Engine taller, its body is
clipped during the glide rather than flashing a scroll bar. Playstyle chapters
are fitted to their panel rather than scrolled. Beside the board the panel always
spans exactly the squares' height; short panels tighten the header, chapter rows
and buttons (two steps) before the chapter is scaled; in the last chapter the
mini-me figure gives way first, so the note and buttons keep their size. When the
floating Feedback button would still touch the section rail after tucking to its
icon, the rail ends just above it.

Desktop page bounds stay fixed when Accuracy expands; content extending beyond
the viewport is clipped. Panel bodies can still scroll. Narrow and short windows
scroll vertically so every section remains reachable. No layout requires
horizontal page scrolling.

Learning preserves the real board and its straight expansion/return animation.
Translations are converted through scaled ancestors. The tab indicator converts
painted coordinates back into content coordinates, including interrupted tab
animations. Panel fades use individual translate animations to preserve content
scale. The active move follows immediately during rapid review navigation.

Settings stays anchored at the right edge. It has a separate gutter on large
desktops and overlays the workspace on smaller windows without reflowing it.
The popup retains its independent 320–360px layout. Custom arrangements retain
their saved coordinates and scales; Reset returns to the current automatic fit.
Opening Reorganize captures the current panel geometry and content scales.
Reorganize shows a square alignment grid beneath the panels. Its Grid selector
offers Standard (16 px), Fine (8 px), and Extra fine (2 px) spacing and remembers
the choice. Moving snaps the panel or selection's outer origin to the grid;
resizing a single panel snaps its right and bottom edges. Group scaling retains
the selected panels' proportions and internal spacing. Changing grid spacing
preserves the existing arrangement, and Done hides the grid.
The compact Layout toolbar can be dragged by its grip or moved with arrow keys
when the grip is focused (Shift moves ten pixels). The minus button minimizes it
to a small bar with an expand button and Done. Moving or minimizing the toolbar
preserves the panel arrangement; resizing the window keeps its controls in view.

Review startup and Reset restore 100% browser zoom. Resizing never changes browser
zoom; a later manual zoom remains available. Display scaling is represented by
the CSS viewport, independently of browser zoom.

## Verification

Run these against the working tree in an isolated Chrome extension profile:

- `node scripts/learning-browser.mjs --working-tree --responsive-reference`
  renders every screen preset, browser toolbar allowances, rotated tablets and
  phones, and short windows. It checks review, both Settings tabs, learning
  destinations and active puzzles, and writes a screenshot gallery and geometry.
- `node scripts/learning-browser.mjs --working-tree --review-interactions`
  checks entry/return frames across desktop and laptop sizes, exact learning
  alignment, expanded Accuracy, interruption, reduced motion, and rapid move
  following at several content scales and in narrow layouts.
- `node scripts/learning-browser.mjs --working-tree --full-hd-reference`
  compares Full HD panel/content dimensions with revision 8516f684 at 87%, then
  checks Reorganize, Reset and reload against the approved physical sizes.
- `node scripts/learning-browser.mjs --working-tree --laptop-fit` checks 22
  laptop/desktop viewports at 100%, 125% and 150% display scaling: no scroll bar
  in Accuracy, Quality or Engine for one to three lines (including after the
  panel's add/remove buttons), readable Accuracy text, equal compact score boxes
  with dials over their columns, coach clear of the explanations switch (also in
  stacked layouts), rail clear of Feedback, and every Playstyle chapter shown
  without scrolling, within the board's height. It saves an Accuracy panel crop
  per viewport and Playstyle shots, both after their animations settle.
  `LAPTOP_FIT_ONLY=review` or `=profile` runs one half.
- `--viewport-preview` checks the live Screen sizes viewer, rotation, fullscreen,
  and isolation from saved user data.

Presets include Full HD, QHD, 4K and ultrawide desktops; 1280, 1366, 1440, 1536
and 1920px laptops; 768, 820 and 1024px tablets; and 320, 390 and 430px phones.
Desktop/laptop runs include 120px and 160px browser toolbar allowances. Browser
screenshots and emulation supplement geometry assertions; they do not constitute
physical-device testing.

Run `npm test`, `npm run verify:source`, and `npm run lint` for source changes.
