# Puzzle marketing candidates

Three new alternatives for the Chrome Web Store image set. The existing campaign images are unchanged.

- `chrome-web-store/puzzles-candidate-01.png` — **Your next move.** Large puzzle count beside a focused puzzle board.
- `chrome-web-store/puzzles-candidate-02.png` — **All yours.** Campaign-style headline above the puzzle overview and its three modes.
- `chrome-web-store/puzzles-candidate-03.png` — **Small puzzles. Big progress.** Centered headline with the puzzle count and board in a shared frame.

All exports: 1280 × 800 PNG. Generated with the built-in imagegen tool using existing campaign images and fresh captures from an isolated copy of the current extension as references. Generated UI is a visual reconstruction, rather than a pixel-exact screenshot. Candidate 2 received a targeted correction to restore the g1 knight. The generated compositions were resampled to the existing campaign dimensions for delivery.

## Candidate 2 — selected revision

The selected All yours candidate has a centered headline, no marketing subtitle, and an outer background using the reference's sampled base color, #171512. The logo remains at the top left and the product frame below. Exported at 1280 × 800.

### Exact background and subtitle removal

Removed the marketing subtitle while keeping the centered headline. The built-in imagegen tool performed the image edit; PNG export normalizes the outer background to the reference's sampled base color, sRGB `#171512` (23, 21, 18). Verified the exported 1280 × 800 PNG at seven background positions. The reference's faint per-pixel texture is represented by its base color.

#### Edit prompt

Use case: precise-object-edit. Image 1 is the edit target: centered Chess Review puzzle advertisement. Image 2 is the authoritative background-color reference.
Two changes ONLY:
1. REMOVE the entire gray marketing subtitle "Learn with Chess Review. Free and offline." below the headline. Leave that space empty and seamlessly fill with the outer background. Do not substitute any other text. Keep the headline at the same position and size, and the product frame in its same position.
2. Match the OUTER BACKGROUND to the second reference exactly: the required color is sRGB HEX #171512, RGB 23,21,18, virtually flat dark charcoal. Use exactly this color across the canvas outside the product frame and behind the logo/headline. NO vignette, NO black gradient, NO warmer brown cast, NO hazy cloudy texture, NO glow around or below the frame. Treat this as a strict technical color match to reference 2. The previous approximation was too brown. The background should look identical in color when the two campaign images are placed side by side.
Preserve everything else in image1: top-left white knight green square and CHESS / REVIEW wordmark; centered one-line headline "50,000 puzzles. All yours." with green and white lettering; its original typography; the entire rounded product frame including border, board, UI text, mode cards, settings and controls, all 32 chess pieces and 8x8 squares. Do not darken or recolor the product screenshot. Do not copy any text or screenshot content from reference2. Output same 1280x800 composition.

### Centering edit prompt

Use case: text-localization / precise layout edit. Edit the supplied finished Chess Review marketing image. Make ONLY this layout adjustment: horizontally CENTER the main headline and subtitle on the full 1280-pixel-wide canvas.
Headline exact text: "50,000 puzzles. All yours." Keep it on ONE line, same bold font, same large size, same y-position around y95-152, same green "50,000 puzzles." and off-white "All yours.". The headline block's horizontal center must be x640, with equal left and right outer margins (about160px each for its current width).
Subtitle exact text: "Learn with Chess Review. Free and offline." Keep on ONE line, same light gray font, same size, same vertical position around y171-195. The subtitle's own horizontal center must independently be x640, with balanced left/right margins (about220px each for its current width).
Keep the CHESS / REVIEW logo at the TOP LEFT exactly where it is. Do not center the logo. Keep all elements BELOW y215 unchanged: the entire rounded product frame, board, all 32 chess pieces including white knight on g1, puzzle UI, UI words, controls, colors, shadows, spacing and background. No redesign, no new text, no removal of elements. The only change is moving the two marketing text lines rightwards to center each independently over the existing product frame. Preserve the 1280x800 canvas and all copy.

### Background match revision

Darkened the outer background and reduced its brown glow to better match `chrome-web-store/1 (1).png`. The centered headline, subtitle, logo and product layout are retained. Edited using the built-in imagegen tool.

#### Background edit prompt

Use case: precise-object-edit. Input image 1 is the EDIT TARGET: the centered "50,000 puzzles. All yours." marketing image. Input image 2 is a BACKGROUND COLOR REFERENCE ONLY: the matching existing Chess Review campaign image.
Change ONLY the outer canvas BACKGROUND of image1 to match the dark background of image2. The reference background is a very dark, almost uniform warm charcoal, approximately RGB(23,21,18), HEX #171512, with only extremely faint fine texture. It does NOT have the pronounced mottled golden/brown haze, bright sepia glow behind the product, or lighter tan patches currently visible in image1. Especially darken the bright brown background area beneath the product frame, making it match the reference. Use the reference's restrained near-black background consistently around the entire canvas. This must be a perceptible darkening and reduction of the golden-brown cast, bringing it into the same series as image2.
Preserve EVERYTHING ELSE from image1: the exact centered headline and subtitle positions and sizes; green "50,000 puzzles." and off-white "All yours."; subtitle "Learn with Chess Review. Free and offline."; top-left knight logo and CHESS / REVIEW wordmark; the entire product screenshot and rounded product frame including its location, borders, puzzle mode cards, filters, text, all 64 chessboard squares and all 32 pieces including the white knight on g1. Do not darken the board, interface, lettering or logo; only the OUTSIDE canvas background. Do not copy content from image2. No new text, no rearrangement, no crop, no extra objects. Same 1280x800 landscape composition.

## Generation prompts

### Candidate 1

Use case: ads-marketing.
Create candidate 1 of a new Chess Review Chrome Web Store marketing image. Landscape canvas EXACTLY 1280x800 px, 8:5 aspect ratio.
Input image 1 is the authoritative brand/style reference from the existing campaign. Input image 2 is another authoritative campaign reference, illustrating the text-left/product-right composition. Input image 3 is the REAL current puzzle board capture and must be faithfully reproduced for the product insert, with the same 8x8 grid, piece positions, chess piece shapes, board colors and orientation.
Match the existing marketing set extremely closely: near-black warm charcoal (#14130f) subtle vignette and fine texture; off-white bold geometric sans-serif headline, fresh leafy green (#89c65a) accents; identical green rounded square white knight logo and spaced CHESS / REVIEW wordmark at top left around x55 y30; soft rounded dark frame, fine muted olive/gray border and restrained shadow. No new branding, no gradients on letters.
Composition: left half spacious typography, right half one large authentic square chess puzzle board in a rounded charcoal product frame, with a very small green Puzzles tab and label Black to move at its top. Board around x695 y183, 530x530 px. Preserve the actual screenshot board as an insert, not a redesigned chess scene. The headline is the hero. Large stacked lines starting x58 y205: green "50,000", off-white "puzzles.", off-white "Your next move." Last line can be smaller than the number to fit. Below, around y560, one short light-gray subheading on two lines: "Learn with Chess Review." and "Free. Offline. Ready when you are."
Text (verbatim, no additional marketing text): CHESS / REVIEW; 50,000; puzzles.; Your next move.; Learn with Chess Review.; Free. Offline. Ready when you are.; Puzzles; Black to move.
Keep visual hierarchy clean, easy to read at thumbnail size, generous negative space, flat front-on layout matching reference 2. No people, no 3D objects, no invented UI cards, no browser chrome, no extra badges or feature lists, no CTA button, no watermark. This is a polished sibling of the supplied marketing campaign.

### Candidate 2

Use case: ads-marketing. Candidate 2 for Chess Review's Chrome Web Store campaign. Create a polished wide 1280x800 landscape marketing image (8:5).
Input image 1: authoritative existing brand/campaign reference. Match exact visual language: warm near-black vignetted textured background, bold friendly geometric sans serif headline with off-white and leafy green #8bc55e, CHESS / REVIEW spaced wordmark beside green rounded white knight icon at top-left, thin olive-gray rounded screenshot border, subtle shadow. Input image 2: authentic current learning UI, use as the product screenshot insert, preserve its actual design, visible text and 8x8 chess board precisely. Do not invent features or rearrange individual interface elements.
Composition should closely echo campaign image 1: brand at x55 y30; one large single-line headline at x55 y110 reading "50,000 puzzles. All yours." with "50,000 puzzles." in green and "All yours." in white; font around 66px, exact copy and fully visible. Beneath it one gray line around y184: "Learn with Chess Review. Free and offline." Main content below y250 is a large wide rounded product screenshot frame, centered with 65px left/right margins, about 485px tall, holding a crisp crop from input image 2 of the chess board on the left and the puzzle panel on the right. Remove browser/top app toolbar and excess empty top/bottom margins by cropping only; keep the puzzle panel navigation, colored Solve a puzzle / Time attack / Knockout cards and rating/type filters visible. Match the actual app screenshot, no screenshot text inventing. Board remains square and 8x8. No annotations overlaying the screenshot. The headline and screenshot should feel balanced like the supplied reference. Keep overall background and frame warm and dark. No CTA, no badges, no floating extra cards, no additional copy, no people, no 3D props, no watermark.
Exact marketing text: "CHESS / REVIEW", "50,000 puzzles. All yours.", "Learn with Chess Review. Free and offline."

#### Targeted correction

Use case: precise-object-edit. Image 1 is the edit target, a finished Chess Review marketing image. Make ONE tiny correction: the chessboard's starting position is missing the WHITE KNIGHT on g1. Add the white knight on the second square from the RIGHT in the BOTTOM row of the chessboard (g1, immediately left of the white rook on h1 and immediately right of the white bishop on f1). It should use precisely the same white knight chess piece design and scale as the white knight on b1, the second square from the left in that same bottom row. The second input is the real screenshot for exact verification of the starting position. There must be EIGHT white pieces across the bottom row, from left to right rook, knight, bishop, queen, king, bishop, KNIGHT, rook. Do not remove any other piece.
Keep EVERYTHING ELSE pixel-faithful: composition, headline "50,000 puzzles. All yours.", subtitle "Learn with Chess Review. Free and offline.", logo, branding, colors, type, screenshot frame, puzzle mode cards, filters and every other square/piece. No other edits. Same canvas/aspect ratio.

### Candidate 3

Use case: ads-marketing. Create candidate 3, a clearly different composition for Chess Review's Chrome Web Store. Exact target canvas 1280x800 landscape, 8:5.
REFERENCE ROLES: Image 1 and 2 are existing marketing images, authoritative for precise typography, colors, branding, dark background, spacing and rounded frames. Image 3 is the actual real current puzzle chessboard, authoritative for all 64 squares, piece positions, shapes and colors. Reproduce the board faithfully as a flat product screenshot, not an imagined board.
Brand aesthetic must look like a sibling to the existing campaign: near-black warm charcoal subtle textured vignette; off-white ultra-bold rounded geometric sans; leafy green #8dc65b emphasis; green rounded square white knight icon and spaced CHESS / REVIEW wordmark at x55 y30 like reference 1. Soft thin olive gray frame edges, restrained shadows.
COMPOSITION DIFFERENT FROM REFERENCES: centered editorial poster, headline centered across the top below the left aligned brand; headline on one line "Small puzzles. Big progress." in very bold 57px sans, with "Big progress." green and "Small puzzles." off-white. Subheadline centered around y195 in gray 29px: "Learn with Chess Review."
Below around y270: a single wide rounded charcoal feature frame spanning x105 to1175, bottom y745. Inside the frame, left side is large spacious typographic count, right side is a clean authentic square chessboard from image3 at x730 y292 about430x430. The left content x150 y325: gigantic green "50,000" at about150px, then bold white "free offline puzzles" around42px, then a single quiet gray "Find your next best move." around28px. No feature list. On the left lower edge of the frame a subtle small green puzzle-piece icon may be used as one visual anchor with no more text. The actual 8x8 board on right should dominate the frame's right half, accurately preserving the image3 position. No invented UI or extra widgets.
Exact text: "CHESS / REVIEW", "Small puzzles. Big progress.", "Learn with Chess Review.", "50,000", "free offline puzzles", "Find your next best move."
Avoid any other text, badges, CTA buttons, bright glows, 3D pieces, people or illustration styles. Strong readability at small sizes. Keep ample empty space, sophisticated warm dark color, green number hero and real square board. All text must be fully visible and fit comfortably.

