// Writes the English captions (SRT and WebVTT) from the aligned narration, in video time:
// one cue per spoken sentence, at most two lines of 42 characters.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const VIDEO = fileURLToPath(new URL('../', import.meta.url));
const narration = JSON.parse(readFileSync(`${VIDEO}src/data/narration.json`, 'utf8'));
const edit = JSON.parse(readFileSync(`${VIDEO}src/data/edit.json`, 'utf8'));
const MAX = 42;

const cues = narration.chunks.flatMap((c) => c.cues.map((q) => ({
  text: q.text,
  start: edit.chunks[c.id] + (q.start - c.in),
  end: edit.chunks[c.id] + (q.end - c.in),
})));

// Two lines balanced around the middle, preferring a break after punctuation and never
// leaving a short function word at the end of the first line.
function lines(text) {
  if (text.length <= MAX) return [text];
  let best = null;
  for (let i = text.indexOf(' '); i > 0; i = text.indexOf(' ', i + 1)) {
    const a = text.slice(0, i), b = text.slice(i + 1);
    if (a.length > MAX || b.length > MAX) continue;
    const weakEnd = /\s(?:a|an|the|and|or|for|to|of|in|on|at|by|from|with|is)$/i.test(a);
    const score = Math.max(a.length, b.length) - (/[,.:;—…]$/.test(a) ? 8 : 0) + (weakEnd ? 8 : 0);
    if (!best || score < best.score) best = { score, a, b };
  }
  if (!best) throw new Error(`cannot fit caption in two lines: ${text}`);
  return [best.a, best.b];
}

// Shown slightly before the words and held a little after, never overlapping the next cue.
const timed = cues.map((q, i) => {
  const next = cues[i + 1];
  const start = Math.max(0, q.start - 0.1);
  const limit = next ? next.start - 0.1 - 0.02 : Infinity;
  const end = Math.min(Math.max(q.end + 0.4, start + 1.2), limit);
  return { ...q, start, end };
});

const stamp = (t, sep) => {
  const ms = Math.round(t * 1000);
  const h = Math.floor(ms / 3600000), m = Math.floor(ms / 60000) % 60, s = Math.floor(ms / 1000) % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}${sep}${String(ms % 1000).padStart(3, '0')}`;
};

const srt = timed.map((q, i) => `${i + 1}\n${stamp(q.start, ',')} --> ${stamp(q.end, ',')}\n${lines(q.text).join('\n')}\n`).join('\n');
const vtt = 'WEBVTT\n\n' + timed.map((q) => `${stamp(q.start, '.')} --> ${stamp(q.end, '.')}\n${lines(q.text).join('\n')}\n`).join('\n');

mkdirSync(`${VIDEO}captions`, { recursive: true });
writeFileSync(`${VIDEO}captions/chess-review-intro.en.srt`, srt);
writeFileSync(`${VIDEO}captions/chess-review-intro.en.vtt`, vtt);
console.log(`Wrote ${timed.length} cues to captions/`);
