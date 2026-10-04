// The UI captures written by capture/capture-ui.mjs. Layout rectangles and cursor
// positions are in the captured page's CSS pixels; images are that area at full resolution.
import { staticFile } from 'remotion';
import manifest from '../../public/captures/manifest.json';

export type Rect = { x: number; y: number; w: number; h: number };
export type Pt = { x: number; y: number };

type Layout = Record<string, Rect | Rect[] | null>;
type Seq = { dir: string; frames: number; cursor?: ([number, number, number] | null)[]; layout: Layout;
  clip?: { x: number; y: number; width: number; height: number } };

const stills = manifest.stills as unknown as Record<string, { file: string; layout: Layout }>;
const sequences = manifest.sequences as unknown as Record<string, Seq>;

// The page area every full capture covers.
const viewport = manifest.viewport as unknown as { css: [number, number]; cssScale: number };
export const PAGE = { w: viewport.css[0], h: viewport.css[1] };

export const stillSrc = (name: string) => staticFile(stills[name].file);

// Named rectangles of a capture's page (see layout() in capture-ui.mjs).
export type UiRects = { board: Rect; evalbar: Rect; review: Rect; graph: Rect; graphSvg: Rect; stats: Rect; engine: Rect;
  coach: Rect; practiceBtn: Rect; qbreakToggle: Rect; accuracy: Rect; topbar: Rect; players: Rect[];
  // Text extents: the review line, the analysing note, accuracy values and rating estimates.
  ipHead: Rect; ipText: Rect; ipAnalyzing: Rect; currentMove: Rect; accVals: Rect[]; estRatings: Rect[] };
export const stillLayout = (name: string) => stills[name].layout as unknown as UiRects;
export const seqLayout = (name: string) => sequences[name].layout as unknown as UiRects;

// Toolbar popup captures (4× pixels); size is in page pixels.
const popup = (manifest as unknown as { popup: Record<string, { file: string; size: [number, number] }> }).popup;
export const popupSrc = (name: 'closed' | 'pasted') => staticFile(popup[name].file);
export const popupSize = (name: 'closed' | 'pasted') => ({ w: popup[name].size[0], h: popup[name].size[1] });
export const seqLength = (name: string) => sequences[name].frames;
export const seqSrc = (name: string, i: number) => {
  const s = sequences[name];
  const n = Math.max(0, Math.min(s.frames - 1, Math.floor(i)));
  return staticFile(`${s.dir}/${String(n).padStart(4, '0')}.jpg`);
};
export const seqClip = (name: string) => sequences[name].clip;
export const cursorAt = (name: string, i: number) => {
  const s = sequences[name];
  const c = s.cursor?.[Math.max(0, Math.min(s.frames - 1, Math.floor(i)))];
  return c ? { x: c[0], y: c[1], down: c[2] === 1 } : null;
};

// Main review layout (identical across the review captures).
const L = stills['review-55'].layout;
const rect = (k: string) => L[k] as Rect;
export const UI = {
  board: rect('board'),
  evalbar: rect('evalbar'),
  review: rect('review'),
  graph: rect('graph'),
  graphSvg: rect('graphSvg'),
  stats: rect('stats'),
  engine: rect('engine'),
  coach: rect('coach'),
  practiceBtn: rect('practiceBtn'),
  players: L.players as Rect[],
  // Not exposed as mounts by the page; measured once from the same capture.
  moves: { x: 1200, y: 276, w: 300, h: 390 },
};

// Centre of a square (white at the bottom), in page pixels.
export function square(sq: string): Pt {
  const c = UI.board.w / 8;
  return { x: UI.board.x + ('abcdefgh'.indexOf(sq[0]) + 0.5) * c, y: UI.board.y + (8 - Number(sq[1]) + 0.5) * c };
}
export function squareRect(sq: string): Rect {
  const c = UI.board.w / 8;
  const p = square(sq);
  return { x: p.x - c / 2, y: p.y - c / 2, w: c, h: c };
}
export const union = (...rs: Rect[]): Rect => {
  const x = Math.min(...rs.map((r) => r.x)), y = Math.min(...rs.map((r) => r.y));
  return { x, y, w: Math.max(...rs.map((r) => r.x + r.w)) - x, h: Math.max(...rs.map((r) => r.y + r.h)) - y };
};
