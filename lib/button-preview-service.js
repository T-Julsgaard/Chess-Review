import {previewGameKey, savedButtonSummary} from './button-preview.js';
import {finishedPreviewGame} from './preview-analysis.js';
import {createImportRequest, checkImport, waitImport} from './import-request.js';

export function createButtonPreviewService({api, loadGame, runPreview}) {
  const pending = new Map(), cache = new Map();
  const cancel = (tabId, key) => {
    const job = pending.get(tabId);
    if (job && (!key || job.key === key)) {job.request.cancel(); pending.delete(tabId);}
  };
  return {cancel, async get(tabId, key) {
    if (!Number.isInteger(tabId) || !/^(chesscom:\d{4,}|lichess:[a-z0-9]{8})$/i.test(key || '')) return {ok:false};
    const previous = pending.get(tabId);
    if (previous?.key === key) return previous.promise;
    cancel(tabId);
    if (pending.size >= 8) return {ok:false,key};
    const request = createImportRequest(undefined,25000), job = {key,request};
    job.promise = (async () => {
      const payload = await waitImport(loadGame(tabId,{signal:request.signal}),request.signal);
      checkImport(request.signal);
      if (previewGameKey(payload?.meta?.url) !== key) throw Error('Game changed during lookup');
      const parsed = finishedPreviewGame(payload.pgn);
      const stored = await waitImport(api.storage.local.get('library'),request.signal);
      for (const record of Array.isArray(stored.library) ? stored.library : []) {
        const summary = savedButtonSummary(record,payload,key);
        if (summary) return {ok:true,...summary,players:parsed.players};
      }
      const cacheKey = key + '\n' + payload.pgn;
      if (cache.has(cacheKey)) return {ok:true,...cache.get(cacheKey)};
      const summary = await waitImport(runPreview(payload.pgn,request.signal),request.signal);
      checkImport(request.signal);
      const result = {...summary,key,players:parsed.players};
      cache.set(cacheKey,result);
      while (cache.size > 30) cache.delete(cache.keys().next().value);
      return {ok:true,...result};
    })().catch(() => ({ok:false,key})).finally(() => {
      request.dispose(); if (pending.get(tabId) === job) pending.delete(tabId);
    });
    pending.set(tabId,job);
    return job.promise;
  }};
}
