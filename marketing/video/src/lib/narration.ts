// Narration timing in video seconds. narration.json is written by tools/align_narration.py;
// edit.json says where each chunk of the take starts in the video.
import edit from '../data/edit.json';
import narration from '../data/narration.json';

export const FPS = edit.fps;
export const DURATION = edit.duration;
export const MUSIC_OFFSET = edit.musicOffset;

type Chunk = (typeof narration.chunks)[number];
export type ChunkId = keyof typeof edit.chunks;

const chunk = (id: ChunkId): Chunk => {
  const c = narration.chunks.find((x) => x.id === id);
  if (!c) throw new Error(`no narration chunk ${id}`);
  return c;
};

// Take time -> video time for a chunk.
const toVideo = (id: ChunkId, t: number) => edit.chunks[id] + (t - chunk(id).in);

// The audio pieces to place: take in/out and video start, in seconds.
export const voiceChunks = narration.chunks.map((c) => ({
  id: c.id as ChunkId,
  in: c.in,
  out: c.out,
  at: edit.chunks[c.id as ChunkId],
}));

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

// Start/end (video seconds) of the n-th word in a chunk that matches `word`.
export function word(id: ChunkId, text: string, nth = 0) {
  const hits = chunk(id).words.filter((w) => norm(w.w) === norm(text));
  const w = hits[nth];
  if (!w) throw new Error(`word "${text}" not found in ${id}`);
  return { start: toVideo(id, w.start), end: toVideo(id, w.end) };
}

// Spoken span of a whole chunk (first word to last word), in video seconds.
export function spoken(id: ChunkId) {
  const ws = chunk(id).words;
  return { start: toVideo(id, ws[0].start), end: toVideo(id, ws[ws.length - 1].end) };
}

// Caption cues for the whole video, in video seconds.
export const cues = narration.chunks.flatMap((c) =>
  c.cues.map((q) => ({ text: q.text, start: toVideo(c.id as ChunkId, q.start), end: toVideo(c.id as ChunkId, q.end) })),
);

export const voice = narration.voice;
