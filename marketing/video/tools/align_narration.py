"""Time the narration take against the script.

Transcribes the take with faster-whisper (word timestamps), matches the words to the
script's caption cues, and cuts the take into chunks at the quietest point between
them, so the edit can space the chunks freely. Writes src/data/narration.json.

    python tools/align_narration.py

Needs ffmpeg and faster-whisper (large-v3; CUDA if available, otherwise CPU).
"""
import difflib
import json
import re
import subprocess
from pathlib import Path

import numpy as np
from faster_whisper import WhisperModel

ROOT = Path(__file__).resolve().parent.parent
TAKE = ROOT / 'public' / 'audio' / 'narration-take.mp3'
SCRIPT = ROOT / 'script' / 'narration-script.json'
OUT = ROOT / 'src' / 'data' / 'narration.json'
SR = 16000
NUMBERS = {'twenty-seven': '27', 'twenty-eight': '28', 'ten': '10'}
ALIASES = {'leechess': 'lichess', 'licheess': 'lichess'}


def tokens(text):
    out = []
    for raw in text.replace('.com', ' com').split():
        word = raw.lower().strip('.,:;!?…—"\'()')
        word = NUMBERS.get(word, word)
        word = re.sub(r"[^a-z0-9']", '', word)
        if word:
            out.append(ALIASES.get(word, word))
    return out


def load_audio(path):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(path), '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32)


def quietest(x, a, b, win=0.03):
    """Centre (seconds) of the quietest `win`-long stretch between a and b."""
    i0, i1, w = int(a * SR), int(b * SR), int(win * SR)
    if i1 - i0 <= w:
        return (a + b) / 2
    hop = int(0.005 * SR)
    best, at = None, i0
    for i in range(i0, i1 - w, hop):
        e = float(np.mean(x[i:i + w] ** 2))
        if best is None or e < best:
            best, at = e, i
    return (at + w / 2) / SR


def main():
    script = json.loads(SCRIPT.read_text(encoding='utf-8'))
    x = load_audio(TAKE)
    duration = len(x) / SR
    device = 'cuda'
    try:
        model = WhisperModel('large-v3', device=device, compute_type='float16')
    except Exception:
        model = WhisperModel('large-v3', device='cpu', compute_type='int8')
    segments, _ = model.transcribe(str(TAKE), language='en', word_timestamps=True, beam_size=5,
                                      condition_on_previous_text=False)  # context made it hear "Chess .com" again
    heard = [w for s in segments for w in s.words]
    heard_tokens = [(tokens(w.word) or [''])[0] for w in heard]

    # Every script token, labelled with its chunk and cue.
    flat = []
    for ci, chunk in enumerate(script['chunks']):
        for qi, cue in enumerate(chunk['cues']):
            flat += [(ci, qi, t) for t in tokens(cue)]
    matcher = difflib.SequenceMatcher(a=[t for _, _, t in flat], b=heard_tokens, autojunk=False)
    owner = {}
    for block in matcher.get_matching_blocks():
        for k in range(block.size):
            owner[block.b + k] = flat[block.a + k][:2]
    matched = len(owner) / len(flat)
    if matched < 0.95:
        raise SystemExit(f'only {matched:.0%} of the script was heard; check the take')

    chunks = []
    for ci, chunk in enumerate(script['chunks']):
        idx = [i for i, o in owner.items() if o[0] == ci]
        cues = []
        for qi, text in enumerate(chunk['cues']):
            cue_idx = [i for i, o in owner.items() if o == (ci, qi)]
            cues.append({'text': text, 'start': round(heard[min(cue_idx)].start, 3), 'end': round(heard[max(cue_idx)].end, 3)})
        words = [{'w': heard[i].word.strip(), 'start': round(heard[i].start, 3), 'end': round(heard[i].end, 3)}
                 for i in range(min(idx), max(idx) + 1)]
        chunks.append({'id': chunk['id'], 'first': heard[min(idx)].start, 'last': heard[max(idx)].end,
                       'cues': cues, 'words': words})

    for i, c in enumerate(chunks):
        c['in'] = 0.0 if i == 0 else chunks[i - 1]['out']
        if i + 1 < len(chunks):
            c['out'] = quietest(x, c['last'] - 0.04, chunks[i + 1]['first'] + 0.04)
        else:
            c['out'] = min(duration, c['last'] + 0.6)
    for c in chunks:
        c['in'], c['out'] = round(c['in'], 3), round(c['out'], 3)
        del c['first'], c['last']

    OUT.write_text(json.dumps({'take': 'audio/narration-take.mp3', 'duration': round(duration, 3),
                               'voice': script['voice'], 'chunks': chunks}, indent=1, ensure_ascii=False) + '\n',
                   encoding='utf-8')
    print(f'{len(chunks)} chunks, {matched:.0%} of script words matched -> {OUT}')


if __name__ == '__main__':
    main()
