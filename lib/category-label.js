// Transparent category artwork, shared by the bundled PNG generator and renamed
// categories. Fixed canvas dimensions keep placement stable while images load.
export const CATEGORY_LABEL_FONT = 'italic 700 26px "Badge Space Grotesk"';
export function categoryLabelPng(document, name, color) {
  const scale = 3, width = 280, height = 60;
  const canvas = document.createElement('canvas');
  canvas.width = width * scale; canvas.height = height * scale;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Category label canvas unavailable');
  ctx.scale(scale, scale);
  ctx.font = CATEGORY_LABEL_FONT;
  const text = name.toUpperCase();
  const size = Math.min(26, 26 * (width - 36) / Math.max(1, ctx.measureText(text).width));
  ctx.font = CATEGORY_LABEL_FONT.replace('26px', `${size}px`);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  // A slim dark edge and short extrusion keep the lettering readable on every
  // board palette. Only the glyphs are painted; the canvas stays transparent.
  ctx.strokeStyle = '#162027'; ctx.lineWidth = 3;
  ctx.shadowColor = '#0008'; ctx.shadowBlur = 5; ctx.shadowOffsetY = 3;
  ctx.strokeText(text, width / 2, height / 2 + 2);
  ctx.shadowColor = 'transparent';
  ctx.fillStyle = '#162027'; ctx.fillText(text, width / 2, height / 2 + 2);
  const fill = ctx.createLinearGradient(0, height / 2 - size / 2, 0, height / 2 + size / 2);
  fill.addColorStop(0, '#ffffff'); fill.addColorStop(.3, '#ffffff');
  fill.addColorStop(.7, color); fill.addColorStop(1, color);
  ctx.fillStyle = fill; ctx.fillText(text, width / 2, height / 2);
  return canvas.toDataURL('image/png');
}
