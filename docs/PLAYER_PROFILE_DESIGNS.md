# Player profile designs

Settings → Visual → **Player profile → Design** switches between four presentations of the same
recap. All four share the data, engine check, share link and board ownership of
`lib/profile/workspace.js`; only the panel and the board scenes differ. An open profile switches
straight away and reopens on the chapter you were reading (`switchProfileDesign` in `analysis.js`,
`options.resume` in `designs/base.js`). The default stays **Classic**.

| Design | Setting id | Idea | Where it lives |
| --- | --- | --- | --- |
| Classic | `classic` | The original slide deck, unchanged. | `workspace.js`, `profile.css` (through `DesignWorkspace`) |
| Story | `story` | Spotify-Wrapped pacing: progress segments, one huge figure per chapter, a "Next: …" button that names what comes next, optional autoplay, a hue per chapter, the last chapter recaps the year next to the share buttons. Click the card to advance (left edge goes back). | `designs/story.js` |
| Dashboard | `bento` | Everything at a glance: a grid of tiles (one number, one label, one micro chart). Hovering a tile previews its chapter on the board; clicking opens a calm detail page with previous/next and **All stats**; Escape returns to the grid. While the grid is showing, the board shows your last 64 days. | `designs/bento.js` |
| Editorial | `editorial` | One scrolling magazine page with a chapter rail. The board follows the chapter you are reading. Each chapter gets a real chart in the column. | `designs/editorial.js` |

## Pieces to mix and match

Each piece is a method or a small module, so a favourite can be moved into another design.

- **Charts on the board** (`designs/board-viz.js`, drawn through `DesignWorkspace.showBoard` →
  `sceneFor` → `drawScene`): columns of lit squares (months, endings by type), a rating line
  across the files with start/peak/end markers, a share of squares lit in reading order (moves
  under five seconds), a glass badge over any scene (win share, head-to-head), and the 64-day
  calendar (Dashboard). Shared scene builders: `ratingScene`, `endingsScene` in `designs/base.js`.
- **New chapter: Your season** (`designs/season.js`): games per month with gaps filled, the longest
  run of consecutive playing days, active days, best and busiest month, most games in one day, and a
  daily calendar. Added after "Your games in numbers" by Story, Dashboard and Editorial
  (`static extraSlides = ['season']`). Classic does not add it.
- **Story**: `hero()` (the one figure per chapter), hairline facts (`.pv-fact`), the results bar
  (`wdlBar`), the ranked openings list (`openingsMini`), the year recap (`recap`), the "Next" button
  and progress segments (`renderNav`, `renderProgress`), autoplay (`togglePlay`, `schedule`).
- **Dashboard**: tiles and micro charts (`grid`, `spark`, `monthBars`, `ring`, `heat`, `wdl`,
  `formatRows`), hover preview (`preview`, `previewBoard`), the detail page (`detail`).
- **Editorial**: the scroll-synced page and rail (`renderPage`, `onScroll`, `activate`), and the
  column charts: results and time controls (`numbersChart`), months and calendar (`seasonChart`),
  openings table, **you against a typical club player** for every signature habit
  (`versusChart`, using the documented baselines), your five most frequent opponents
  (`opponentTable`), win share by time of day (`bandsChart`) and how games end (`endingBars`).

## Notes

- Shared profiles have no game rows, so the season chapter and the 64-day calendar are left out.
- The habits title "Mon player" from the deck reads "Monday player" in the new designs.
- Styles are in `lib/profile/designs/designs.css`, scoped by `.profile-shell[data-design="…"]` and
  `.pv-*` classes; Editorial uses the bundled Lora font for its headings.
- Tests: `tests/profile-designs.test.mjs`.
