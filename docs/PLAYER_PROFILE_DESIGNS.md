# Player profile Story

The player profile opens as a chapter-by-chapter story with a progress strip and charts drawn
on the chessboard. The final **Overview** shows a tile for each available chapter, ordered as
in the story. Each tile shows a highlight and opens the chapter when selected. **Share with a friend**
sits alongside the board.

- `lib/profile/designs/story.js` renders the chapters, progress strip, and chapter navigation.
- `lib/profile/designs/board-viz.js` draws the board charts and manages their transitions.
- `lib/profile/overview.js` builds the chapter tiles for the extension and the shared profile viewer.
- `lib/profile/designs/season.js` adds the monthly activity chapter when enough local game data
  exists. Shared profiles include the chapters available from the report in the link.
- `tests/profile-designs.test.mjs` covers chapter navigation and board interactions.

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
