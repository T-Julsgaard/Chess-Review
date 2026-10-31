// Small, versioned summaries only. Full-review evidence and settings stay separate.
export const BUTTON_PREVIEW_VERSION = 1;
export function previewGameKey(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:') return null;
    if (/^(www\.)?chess\.com$/i.test(url.hostname)) {
      const id = url.pathname.match(/\/game\/(?:[a-z][a-z-]*\/)?(\d{4,})/i)?.[1];
      return id ? 'chesscom:' + id : null;
    }
    if (url.hostname === 'lichess.org') {
      const segment = url.pathname.replace(/^\/+/, '').replace(/^game\//, '').split('/')[0];
      if (/^(training|analysis|practice|streamer|tournament|broadcast)$/i.test(segment)) return null;
      return /^(?:[a-z0-9]{8}|[a-z0-9]{12})$/i.test(segment) ? 'lichess:' + segment.slice(0, 8) : null;
    }
  } catch {}
  return null;
}

export function savedButtonSummary(record, payload, key) {
  if (previewGameKey(record?.url || record?.meta?.url) !== key || record.pgn !== payload.pgn) return null;
  const saved = record.buttonSummary;
  const accuracy = saved?.version === BUTTON_PREVIEW_VERSION ? saved.accuracy
    : record.meSide === 'w' ? {w:record.myAcc,b:record.opAcc}
      : record.meSide === 'b' ? {b:record.myAcc,w:record.opAcc} : null;
  if (!accuracy || !['w','b'].every(side => Number.isFinite(accuracy[side]) && accuracy[side] >= 0 && accuracy[side] <= 100)) return null;
  const counts = saved?.version === BUTTON_PREVIEW_VERSION && ['w','b'].every(side => ['brilliant','great'].every(name =>
    Number.isSafeInteger(saved.counts?.[side]?.[name]) && saved.counts[side][name] >= 0)) ? saved.counts : null;
  return {version:BUTTON_PREVIEW_VERSION, key, accuracy, counts, estimated:false};
}
