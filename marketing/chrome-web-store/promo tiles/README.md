# Chrome Web Store promo tiles

- `small-promo-tile-440x280.png`: 440 x 280 PNG.
- `marquee-promo-tile-1400x560.png`: 1400 x 560 PNG.

Both tiles highlight the black bishop on c8 instead of the knight on c6.
The e6 pawn is removed and the arrow follows the clear c8-h3 diagonal.
The empty d7 highlight is retained. The marquee's accuracy overlay is removed.

## Edit method and prompts

Edited independently by two agents with the built-in imagegen tool, using each
original PNG as its edit target. The generated outputs were resampled with
System.Drawing HighQualityBicubic to the exact export dimensions. Both final
PNGs were decoded and visually checked for text, layout, highlights, diagonal,
and panel removal. Generative editing and resampling can change fine raster
details beyond the requested corrections.

Small tile prompt:

> Use case: precise-object-edit. Edit the supplied small promo tile. Preserve
> text, logo, composition, border, board size and position, other pieces, wood
> tones, green palette and dark texture. Restore the normal square under the c6
> knight, remove the e6 black pawn, highlight the c8 bishop green, and retain the
> empty d7 green square. Draw one straight translucent green arrow from c8 to h3
> through d7, e6, f5 and g4. Preserve CHESS / REVIEW, Analyze your game., and Move
> by move. No new text or watermark.

Marquee prompt:

> Use case: precise-object-edit. Edit the supplied marquee while preserving
> composition, text, logo, typography, smoky background, and board location.
> Remove the entire accuracy overlay and restore the underlying board and
> background. Remove the e6 black pawn. Restore the normal tan square beneath
> the c6 black knight. Highlight the c8 black bishop green and retain d7 green.
> Replace the arrow with a straight translucent green c8-h3 bishop diagonal.
> Preserve all remaining pieces and styling. No extra words or watermark.

## Open-source headline variants

- `small-promo-tile-open-source-440x280.png`: 440 x 280 PNG.
- `marquee-promo-tile-open-source-1400x560.png`: 1400 x 560 PNG.

These sibling versions preserve the corrected originals above. The small tile
uses three lines: "Open-source" in white, then "Free Chess" and "Analysis" in
green. Each line uses a naturally proportioned font size to give similar visual
widths. The marquee uses "Open-source, free" in white above "Chess Analysis" in
green, with both lines centered on the same axis. The logo is centered above
the enlarged headline, and the board sits farther right. Both exports were
created with built-in imagegen, resampled with System.Drawing HighQualityBicubic,
decoded to confirm PNG format and dimensions, and visually checked. The original
tile hashes were checked to confirm neither original changed.

Small variant prompt:

> Use case: text-localization. Change only the left headline to exactly three
> lines: Open-source / Free Chess / Analysis. Use white for the first line and
> green for the others. Use naturally proportioned bold sans serif with no
> horizontal compression: first line about 28-30 px and following lines larger
> so each line is about 205 px wide. Preserve the logo, dark texture, board
> placement, all pieces, green c8 bishop, ordinary c6 knight square, absent e6
> pawn, green d7 and c8-h3 arrow. No accuracy panel, added text or watermark.
> Keep the 440:280 aspect ratio.

Marquee variant prompt:

> Refine the existing banner into balanced columns. Move the board substantially
> right without enlarging it. Enlarge white Open-source, free and green Chess
> Analysis, centering both on one axis. Center the logo lockup above them.
> Preserve the background, pieces, highlights and corrected bishop arrow.
> No accuracy panel, extra copy or watermark. Keep the 1400:560 aspect ratio.
