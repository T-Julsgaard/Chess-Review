import {browserAPI} from './browser-compat.js';
import {analyseButtonPreview} from './lib/preview-analysis.js';

const active = new Map();
browserAPI.runtime.onMessage.addListener((message,sender,respond) => {
  if (sender.id !== browserAPI.runtime.id || sender.tab || message?.target !== 'button-preview-host') return;
  if (message.type === 'cancel') {active.get(message.id)?.abort(); return;}
  if (message.type !== 'analyse' || typeof message.id !== 'string' || active.has(message.id)) return;
  if (active.size) {respond({ok:false}); return;}
  const controller = new AbortController(); active.set(message.id,controller);
  analyseButtonPreview(message.pgn,{signal:controller.signal}).then(summary => respond({ok:true,summary}),
    () => respond({ok:false})).finally(() => active.delete(message.id));
  return true;
});
