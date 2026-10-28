# Prominent open-source variants

- `small-promo-tile-minimal-open-source-440x280.png`: 440 x 280, opaque RGB PNG.
- `marquee-promo-tile-minimal-open-source-1400x560.png`: 1400 x 560, opaque RGB PNG.

These alternatives enlarge the existing Open-source line and change it from subtle gray to bold off-white, making it part of the main message. The original minimal variants are preserved. The design retains the ivory knight, single green platform, dark backdrop, and white Free text. Generative edits may alter fine raster details and interpret requested font sizes rather than reproducing exact metrics.

Created with built-in imagegen, then resampled with System.Drawing HighQualityBicubic to the exact store dimensions. Both final exports were decoded to confirm PNG, dimensions, and opaque RGB format, and visually checked at full and half size against a light gray surround.

## Final small tile edit prompt

```text
Use case: text-localization.
Edit target: supplied finished Chess Review small promotional tile, ratio 440:280.
Primary request: Make the existing "Open-source" line substantially more prominent while preserving the design the user loves. Change ONLY that existing footer line: increase it to approximately TWICE its present font size, from about 11px to about 21px at the final 440x280 size; use semibold or bold naturally proportioned sans serif in warm off-white matching "Free", instead of faint gray. Keep the wording exactly "Open-source" with lowercase s. Keep its left edge aligned with the headline at x25 and its baseline around y252 so there is generous bottom margin. This should feel like an intentional fourth line of the message and be plainly readable even at half size, but still be smaller than "Free chess analysis."
Invariants: Keep the exact headline "Free" / "chess" / "analysis." unchanged in size, line breaks, position, spacing and color. Keep "Free" white. Keep the CHESS / REVIEW wordmark unchanged. Keep the same ivory knight, pose, lighting, size, position, green square platform, and matching green. Keep the exact same dark charcoal background and generous breathing space. Do not add any extra words, symbols, badges, buttons or decorations. Do not redesign the image or change the composition. Preserve 11:7 aspect ratio, rendering high resolution for clean resampling.
```

## Final marquee edit prompt

```text
Use case: text-localization.
Edit target: reference 1, the existing finished Chess Review marquee promotional tile, aspect ratio EXACTLY 1400:560 (2.5:1).
Supporting reference: reference 2 is the newly revised SMALL tile. Use it ONLY to match the more prominent white "Open-source" treatment. The output must remain a wide marquee with its original TWO-line main headline, never the small tile's three-line layout.
Primary request: Make the existing "Open-source" line on the marquee substantially bigger and brighter to match the revised small tile. Change ONLY that existing lower-left line: increase it from approximately 23px to approximately 48px at 1400x560, set it in bold naturally proportioned modern sans serif and warm off-white matching "Free". Exact wording "Open-source" with lowercase s. Left edge x100 aligned with main headline, baseline near y483, entire line fits within the left text column well before the knight. It should be a clearly readable third statement beneath the two-line headline and feel deliberately integrated, retaining comfortable space.
Invariants: Keep the exact two-line main headline "Free chess" / "analysis." unchanged in size, line breaks, position, spacing, white and green color. Keep Free white. Keep CHESS / REVIEW wordmark unchanged. Keep same ivory knight pose, form, lighting, size and position, identical green square platform, same green palette, smooth dark charcoal background. Do not add extra words, marks, badges, icons, frames or buttons. Preserve the clean spacious design. Do not redesign the image. Whole finished banner fills canvas, high resolution for resampling, exact 2.5:1 landscape aspect ratio.
```
