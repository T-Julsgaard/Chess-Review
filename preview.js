import {browserAPI} from './browser-compat.js';
import {analyseButtonPreview} from './lib/preview-analysis.js';
import {createProfileEngineHost} from './lib/profile/engine-sample.js';
import {createProfileStore} from './lib/profile/store.js';
import {loadProfilePgn} from './lib/profile/pgn-source.js';

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

// Player profile engine sample: a budgeted depth-8 pass over selected games. The
// background keeps this document open while a job runs and closes it when idle.
const profileHost = createProfileEngineHost({store:createProfileStore(browserAPI.storage.local), loadPgn:loadProfilePgn,
  onBusy:busy => {void browserAPI.runtime.sendMessage({type:'profileEngineBusy',busy}).catch(() => {});}});
browserAPI.runtime.onMessage.addListener((message,sender,respond) => {
  if (sender.id !== browserAPI.runtime.id || sender.tab || message?.target !== 'profile-engine-host') return;
  if (message.action === 'start') {profileHost.start(message.job).then(respond,error => respond({ok:false,reason:error?.message})); return true;}
  if (message.action === 'cancel') {respond(profileHost.cancel()); return;}
  respond(profileHost.status());
});
