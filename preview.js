import {browserAPI} from './browser-compat.js';
import {analyseButtonPreview} from './lib/preview-analysis.js';
import {createProfileEngineHost} from './lib/profile/engine-sample.js';

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
async function profileData(action, ...args) {
  const response = await browserAPI.runtime.sendMessage({type:'profileHostData', action, args});
  if (!response?.ok) throw Error(response?.reason || 'Profile data unavailable');
  return response.value;
}
const profileHost = createProfileEngineHost({store:{
  loadEngine:(...args) => profileData('loadEngine', ...args),
  saveEngine:(...args) => profileData('saveEngine', ...args),
  saveJob:job => profileData('saveJob', job),
}, loadPgn:(site,row,signal,account) => profileData('loadPgn', site, row, account),
  onBusy:busy => {void browserAPI.runtime.sendMessage({type:'profileEngineBusy',busy}).catch(() => {});}});
browserAPI.runtime.onMessage.addListener((message,sender,respond) => {
  if (sender.id !== browserAPI.runtime.id || sender.tab || message?.target !== 'profile-engine-host') return;
  if (message.action === 'start') {profileHost.start(message.job).then(respond,error => respond({ok:false,reason:error?.message})); return true;}
  if (message.action === 'cancel') {respond(profileHost.cancel()); return;}
  respond(profileHost.status());
});
