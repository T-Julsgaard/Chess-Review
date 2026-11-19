# Player profile designs

Settings → Visual → **Player profile → Design** switches between four presentations of the same
recap. All four share the data, engine check, share link and board ownership of
`lib/profile/workspace.js`; only the panel and the board scenes differ. An open profile switches
straight away and reopens on the chapter you were reading (`switchProfileDesign` in `analysis.js`,
`options.resume` in `designs/base.js`). The default stays **Classic**.

| Design | Setting id | Idea | Where it lives |
| --- | --- | --- | --- |
| Classic | `classic` | The original slide deck, unchanged. | `workspace.js`, `profile.css` (through `DesignWorkspace`) |
| Story | `story` | Progress segments, one huge figure per chapter, explicit previous/next buttons, a hue per chapter, and a Share button that copies the profile link. The last chapter recaps the year next to the share buttons. | `designs/story.js` |
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
  and progress segments (`renderNav`, `renderProgress`), and the header Share button (`copyLink`).
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

## Profile games and sharing

- Mosaic squares open the original Chess.com or Lichess game. Only the game count and result
  legend appear beneath the mosaic; individual game details remain available on hover.
- Evidence buttons open games on the profile board. The review's player-strip renderer supplies
  names, ratings and captured pieces; evaluation follows the selected review bar design and its
  spacing. The same sound-event handler respects the review's sound setting and selected effects.
  The five review-style controls include Exit (also Escape), which returns to the current chapter.
- Results squares retain their nodes when switching time controls. Registered percentage properties
  animate the win/draw/loss boundaries; reduced motion applies the new result immediately.
- Rating charts include every local rating point, reach both board edges, and support hover,
  touch and keyboard inspection. Their mode selector uses the full period's rating data.
- The share URL still contains a compressed snapshot in its fragment. A third-party shortener can
  redirect a short URL to that full link; first-party short IDs require a hosted snapshot store or
  generated static pages. No shortening service is contacted automatically.
- `profile/index.html` includes Open Graph and Twitter metadata for a common Chess Review banner
  (`profile/share-preview.png`). Deploy these files to GitHub Pages before testing live previews.
  Personalized preview images require a server-readable profile ID and per-profile metadata:
  social crawlers cannot see URL fragments or run the client-side profile renderer. The existing
  Download card button supplies a personalized image for sharing as an attachment.
