# Minimal Chess Review promotional redesign

## Deliverables

- `small-promo-tile-minimal-440x280.png`: 440 x 280, opaque RGB PNG.
- `marquee-promo-tile-minimal-1400x560.png`: 1400 x 560, opaque RGB PNG.

A fresh direction based on the images and preferences in the "Fix promo tile chess visuals" conversation. Both images use one ivory knight on one green square, a dark charcoal backdrop, oversized naturally proportioned typography, and quieter open-source copy. "Free" remains off-white. The compact image stacks the headline into three lines; the marquee uses two. These are promotional illustrations, not screenshots of the extension.

The existing promo tiles are preserved. No store listing was updated.

## Method and verification

Created using the built-in imagegen tool. The small tile was generated with the existing small promo and extension icon as brand references; the marquee used the newly generated small tile as its visual reference. Generated rasters were resampled with System.Drawing HighQualityBicubic into the exact store dimensions, with no further creative image editing. Both final PNGs were decoded to verify dimensions and opaque RGB format, then visually inspected at full and half size against a light gray surround. Generative rendering interprets palette and font requests rather than guaranteeing exact color values or font families.

Chrome's [listing guidance](https://developer.chrome.com/docs/webstore/best-listing) specifies 440 x 280 and 1400 x 560 and recommends uncluttered compositions that remain legible at half size.

## Final small tile prompt

```text
Use case: ads-marketing.
Asset type: FINAL Chrome Web Store small promotional tile for Chess Review, landscape aspect ratio EXACTLY 440:280 (11:7). Generate at 1320x840 if possible so it downsizes cleanly.
Primary request: Completely rethink the existing chess extension promotional tile around minimalistic simplicity that immediately catches the eye in a crowded extension store. This is a finished premium brand advertisement, not a screenshot or design presentation.
Input images: reference 1 is the existing promo, for brand name and green association ONLY. Reference 2 is the extension icon, for the recognizable Staunton knight silhouette ONLY. Do not retain the old full-board layout or old typography.
Art direction: Flat solid very dark neutral charcoal #171715, warm off-white #F6F5EF, one consistent muted but vivid brand green #7CB94D. Smooth absolute background with no smoky texture, mottling, brown haze, scenery, gradient, spotlight, or vignette.
Layout: Exceptionally disciplined Swiss editorial typography, bold naturally proportioned modern sans serif, left aligned. At top left a small, widely tracked white wordmark exactly "CHESS / REVIEW", understated and readable. Beneath it, the dominant headline occupies the left roughly 57% in three lines with exact text:
"Free"
"chess"
"analysis."
Use off-white for Free and chess, brand green for analysis. All three headline lines same very bold but not inflated font, approximately 43px high at final 440px width, tight clean line height, natural glyph proportions. Headline begins around x24 y80 at final size. Do not horizontally compress any letters. Small quiet footer at bottom left exactly "Open-source", light gray, around 11px final.
Single strong hero visual on right: a large beautifully shaped ivory Staunton chess knight, facing left toward the headline. Sophisticated smooth matte ceramic, restrained directional studio lighting on the object ONLY, realistic well-made sculptural form, readable silhouette, tiny dark eye, no ornate mane curls. It stands on ONE thin muted green square platform in subtle three-quarter perspective. Knight plus platform occupies right 37% of tile, about x287..419, y62..238 final. Keep clear space between knight and typography, whole knight and platform inside safe margins. Soft small contact shadow directly under the object only. This is a striking graphic composition with just the type and ONE isolated hero piece, roughly 30% breathing room.
Constraints: only the four specified text components. No full chessboard, no board fragments, no arrows, no app panels, no browser chrome, no floating UI, no badges, no giant 3D text, no neon, no gradients on background, no extra icons, no button, no watermark, no frame around the overall image. Free MUST be white. Brand green MUST look consistent across type and platform. Strong legibility when displayed at 220x140. Make it feel calm, exact, expensive, effortless.
```

## Final marquee prompt

```text
Use case: ads-marketing.
Asset type: FINAL Chrome Web Store marquee promotional tile, EXACT 1400:560 aspect ratio (2.5:1), render 2800x1120 if possible. Single finished banner fills the entire image.
Primary request: Adapt the supplied redesigned small Chess Review promo into an impeccably minimal wide banner. The supplied image is the definitive visual reference: carry over the EXACT same ivory ceramic knight, green square platform, green hue, near-black charcoal backdrop and bold Swiss modern sans serif. This is a coherent two-size brand campaign, not a new style.
Layout: very generous margins, highly intentional asymmetry. At left x90 y75 final, small white spaced wordmark exactly "CHESS / REVIEW", around 22px. Main headline starts x85 y172: first line exactly "Free chess" in warm off-white, second line exactly "analysis." in the same muted vibrant green as the reference. Type size approximately 103px final, weight very bold, natural proportions without stretched glyphs. Left text area x85..835. The headline should be the first read, calm confident typography with deliberate line breaks. Lower left x90 y445 final: a restrained small gray line exactly "Open-source", approximately 23px. Free MUST be white.
Right: same single large ivory Staunton chess knight facing left, no other pieces, on the same ONE thin square green platform in three-quarter perspective. Keep the beautiful recognizable sculptural form and subtle object-only lighting. Entire knight plus platform around x940..1295 y70..480 final, visibly smaller relative to canvas than on the compact tile, so it feels spacious. Clearly separate typography and object. Small soft contact shadow only.
Backdrop: absolutely solid smooth premium dark charcoal #171715, no smoke, no texture, no fog, no brown haze, no light pools, no vignette. Ivory #F6F5EF and muted green #7CB94D as reference. Keep both whites consistent across type and knight. Negative space is essential.
Text must be exactly and only "CHESS / REVIEW", "Free chess", "analysis.", "Open-source".
Avoid: chessboards, arrows, app panels, accuracy meters, browser chrome, cards, badges, buttons, checkmarks, extra copy, watermark, collage, multiple banners, decorative lines, gradients on the backdrop. Work well at half size. Feels like a beautifully art-directed premium chess tool, not a game advertisement.
```
