export function importError(message = 'Import canceled.', code = 'IMPORT_CANCELLED') {
  const error = new Error(message); error.name = 'AbortError'; error.code = code; return error;
}
export function checkImport(signal) {if(signal?.aborted)throw signal.reason || importError();}
export function waitImport(promise, signal) {
  if(!signal)return Promise.resolve(promise);
  return new Promise((resolve,reject)=>{
    const abort=()=>{signal.removeEventListener('abort',abort);reject(signal.reason || importError());};
    signal.addEventListener('abort',abort,{once:true});
    Promise.resolve(promise).then(value=>{signal.removeEventListener('abort',abort);resolve(value);},error=>{signal.removeEventListener('abort',abort);reject(error);});
    if(signal.aborted)abort();
  });
}
export function createImportRequest(parent, budget = 180000) {
  const controller = new AbortController(); let timer;
  const abort = () => controller.abort(parent.reason || importError());
  if(parent?.aborted)abort();else parent?.addEventListener('abort',abort,{once:true});
  if(!controller.signal.aborted)timer=setTimeout(()=>controller.abort(importError('Import took too long. Retry or paste the PGN.','IMPORT_TIMEOUT')),budget);
  return {signal:controller.signal, cancel:()=>controller.abort(importError()), dispose(){clearTimeout(timer);parent?.removeEventListener('abort',abort);}};
}
export function importDelay(ms, signal) {
  checkImport(signal);
  return new Promise((resolve,reject)=>{
    const abort=()=>{clearTimeout(timer);signal.removeEventListener('abort',abort);reject(signal.reason || importError());};
    const timer=setTimeout(()=>{signal?.removeEventListener('abort',abort);resolve();},ms);
    signal?.addEventListener('abort',abort,{once:true});
  });
}
// Keep the budget active through body reading, not just receipt of response headers.
export async function fetchImport(url, options = {}) {
  const {stream = false, ...fetchOptions} = options;
  const request=createImportRequest(options.signal,stream ? 1800000 : 60000);
  try {
    checkImport(request.signal);
    const response=await waitImport(fetch(url,{...fetchOptions,signal:request.signal}),request.signal);
    if(!response.ok){request.dispose();return response;}
    const read=async method=>{try{checkImport(request.signal);const value=await waitImport(response[method](),request.signal);checkImport(request.signal);return value;}catch(error){checkImport(request.signal);throw error;}finally{request.dispose();}};
    const lines = async function* () {
      const reader = response.body?.getReader?.();
      try {
        if (!reader) { for (const line of (await read('text')).split('\n')) if (line.trim()) yield line; return; }
        const decoder = new TextDecoder(); let pending = '';
        while (true) {
          const idle = createImportRequest(request.signal, 60000);
          let chunk;
          try { chunk = await waitImport(reader.read(), idle.signal); } finally { idle.dispose(); }
          checkImport(request.signal);
          pending += decoder.decode(chunk.value, {stream: !chunk.done});
          let end;
          while ((end = pending.indexOf('\n')) >= 0) { const line = pending.slice(0, end); pending = pending.slice(end + 1); if (line.trim()) yield line; }
          if (chunk.done) break;
        }
        if (pending.trim()) yield pending;
      } finally { if (reader) { await reader.cancel().catch(() => {}); reader.releaseLock(); } request.dispose(); }
    };
    return {ok:response.ok,status:response.status,headers:response.headers,json:()=>read('json'),text:()=>read('text'),lines};
  }catch(error){request.dispose();checkImport(request.signal);throw error;}
}
