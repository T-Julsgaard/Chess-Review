# Psst open-source variants

- `small-promo-tile-minimal-psst-440x280.png`: 440 x 280, opaque RGB PNG.
- `marquee-promo-tile-minimal-psst-1400x560.png`: 1400 x 560, opaque RGB PNG.

These alternatives replace the plain Open-source line with "psst.. it's [Open-Source]". The aside and square brackets use muted gray, while Open-Source stays bold off-white. The small tile uses two lines for the sign-off; the marquee uses one. Previous variants are preserved. Generative edits may alter fine raster details and interpret font and color specifications.

Created using built-in imagegen, resampled with System.Drawing HighQualityBicubic, decoded to verify exact dimensions and opaque RGB PNG format, and visually checked at full and half size against a light gray surround. Checked copy, brackets, contrast, margins, and separation from the knight.

## Final small tile edit prompt

```text
Use case: text-localization.
Edit target: supplied finished Chess Review SMALL promotional tile. Preserve EXACT 440:280 (11:7) aspect ratio.
Request: Replace ONLY the existing bottom-left "Open-source" text with this playful typographic sign-off:
first line: "psst.. it's"
second line: "[Open-Source]"
Exact characters matter: psst is lowercase, followed by TWO periods, a space, it's with an apostrophe. Second line contains square brackets and exact capitalization Open-Source (capital O and S).
Typography: "psst.. it's" is a quiet, small regular-weight gray aside, around 12px at final 440px width, left edge x24, baseline around y231. On the next line, "Open-Source" is bold warm off-white matching "Free", around 22px final. The square brackets "[" and "]" have the SAME size as Open-Source but are visibly muted medium gray (#7C7C77), not white. Align bracketed line at x24 with baseline around y255. Whole sign-off must stay within x24..260 with ample bottom margin and clear separation from the green analysis headline. It is typography only; brackets are punctuation, NOT a box or button.
Keep all other content as closely unchanged as possible: CHESS / REVIEW wordmark; exact original headline Free / chess / analysis. in its existing bold type, size and colors; Free must stay white; same ivory knight shape, pose, lighting, size and location; same green platform and muted green accent; same dark charcoal backdrop and overall layout. No additional copy, icon, badge, panel, arrow, frame, watermark, gradients or decorative elements. Make the footer feel like a quiet conspiratorial aside with the open-source words still easy to read. High resolution output for exact final-size export.
```

## Final marquee edit prompt

```text
Use case: text-localization.
Edit target: reference 1, the existing Chess Review MARQUEE promotional tile. Output EXACTLY 1400:560 aspect ratio (2.5:1), high resolution for resampling.
Supporting reference: reference 2, the newly edited SMALL tile. Match its sign-off wording and color treatment ONLY. Keep the marquee's own wide layout and two-line headline.
Primary request: Replace ONLY the existing bottom-left "Open-source" text with a playful single-line typographic sign-off reading exactly:
"psst.. it's [Open-Source]"
psst is lowercase followed by TWO periods; it's has an apostrophe; Open-Source has capital O and capital S and one hyphen; use square brackets.
Make "psst.. it's" smaller and regular weight, muted medium gray #93938D, around 29px at final 1400x560. Immediately following on the SAME line, render "[Open-Source]" with the words Open-Source in bold warm off-white matching Free, about 48px final. The punctuation "[" and "]" must be the same size as Open-Source but visibly softer medium gray #7C7C77. The entire line starts at x98 with a shared baseline around y480 and ends before x820, clear of the knight platform. It should feel like a quiet conspiratorial aside and premium editorial typography. The brackets are plain punctuation, not a box, badge or button. Keep enough comfortable breathing room above and below.
Invariants: Keep main headline exactly "Free chess" / "analysis." with original size, line breaks, font, position, spacing and green and white colors. Keep Free white. Keep CHESS / REVIEW wordmark unchanged. Keep same ivory knight, sculpture, pose, size, location, lighting, same green square platform, same smooth charcoal backdrop and calm spacious composition. No extra copy, badges, icons, panels, arrows, frames or watermark. Do not change anything else.
```
