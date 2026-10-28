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
