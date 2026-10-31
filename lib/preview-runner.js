import {analyseButtonPreview} from './preview-analysis.js';
import {checkImport, waitImport} from './import-request.js';

// Chrome hosts workers in its hidden extension document. Firefox can host them
// directly in its module background page. The queue bounds CPU across all tabs.
export function createPreviewRunner(api, analyse = analyseButtonPreview) {
  let tail = Promise.resolve(), creating = null, queued = 0;
  async function ensureDocument() {
    if (creating) return creating;
    creating = (async () => {
      const contexts = await api.runtime.getContexts({contextTypes:['OFFSCREEN_DOCUMENT'],documentUrls:[api.runtime.getURL('preview.html')]});
      if (!contexts.length) await api.offscreen.createDocument({url:'preview.html',reasons:['WORKERS'],
        justification:'Calculate local accuracy estimates for completed games on review buttons.'});
    })();
    try {await creating;} finally {creating = null;}
  }
  return (pgn, signal) => {
    queued++;
    const run = tail.catch(() => {}).then(async () => {
      checkImport(signal);
      if (!api.offscreen?.createDocument) return analyse(pgn,{signal});
      await ensureDocument(); checkImport(signal);
      const id = crypto.randomUUID();
      const cancel = () => {void api.runtime.sendMessage({target:'button-preview-host',type:'cancel',id}).catch(() => {});};
      signal?.addEventListener('abort',cancel,{once:true});
      try {
        checkImport(signal);
        const result = await waitImport(api.runtime.sendMessage({target:'button-preview-host',type:'analyse',id,pgn}),signal);
        if (!result?.ok) throw Error('Preview unavailable');
        return result.summary;
      } finally {signal?.removeEventListener('abort',cancel);}
    });
    const settled = run.finally(async () => {
      queued--;
      if (!queued && api.offscreen?.closeDocument) {
        try {await api.offscreen.closeDocument();} catch { /* It may already be closed after cancellation. */ }
      }
    });
    tail = settled.catch(() => {});
    return settled;
  };
}
