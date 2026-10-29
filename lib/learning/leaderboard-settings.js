import {LeaderboardClient} from './leaderboard-client.js';
import {syncLeaderboardCountry} from './leaderboard-country.js';

const clients=new WeakMap();
export function leaderboardSettingsControls({document,storage,onChange=()=>{},onError=()=>{},url=p=>p,client:providedClient}) {
  if(providedClient)clients.set(storage,providedClient);
  if(!clients.has(storage))clients.set(storage,new LeaderboardClient(storage));
  const client=clients.get(storage),root=document.createElement('div');root.className='set-leaderboard-settings';
  let preferences,player,busy=false,choosing=false,nationality=false,confirmDelete=false,message='';
  const h=(tag,attrs={},...children)=>{
    const node=document.createElement(tag);
    for(const [key,value] of Object.entries(attrs)){
      if(value===undefined||value===null||value===false)continue;
      if(key.startsWith('on'))node.addEventListener(key.slice(2),value);
      else if(key==='disabled')node.disabled=true;
      else node.setAttribute(key,value);
    }
    for(const child of children.flat())if(child!==false&&child!=null)node.append(child.nodeType?child:document.createTextNode(String(child)));
    return node;
  };
  const run=async action=>{
    if(busy)return;busy=true;message='';paint();
    try {await action();}
    catch(error){message=error.message;onError(error.message);}
    finally {try {await onChange();}catch(error){message=error.message;onError(error.message);}busy=false;await refresh();}
  };
  const button=(text,key,fn)=>h('button',{type:'button',class:'set-reset','data-leaderboard-setting':key,disabled:busy,onclick:fn},text);
  const paint=()=>{
    if(!preferences){root.replaceChildren(h('span',{class:'set-note'},'Loading leaderboard settings…'));return;}
    if(client.preview){root.replaceChildren(h('span',{class:'set-note'},'Clear leaderboard test data in Developer debugger to change real leaderboard settings.'));return;}
    const toggle=button(preferences.enabled?'Leaderboards enabled':'Opt in to leaderboards','enabled',()=>{
      if(preferences.enabled)run(()=>client.optOut());else {choosing=!choosing;paint();}
    });toggle.setAttribute('role','switch');toggle.setAttribute('aria-checked',String(preferences.enabled));toggle.disabled=busy||preferences.pendingDeletion;
    const flag=h('input',{type:'checkbox','data-leaderboard-setting':'nationality',disabled:busy||!preferences.enabled,onchange:e=>run(async()=>{
      await client.setNationality(e.target.checked);
      await syncLeaderboardCountry(client,await client.credentials());
    })});flag.checked=preferences.showNationality;
    const choice=h('input',{type:'checkbox','data-leaderboard-setting':'join-nationality',onchange:e=>{nationality=e.target.checked;}});choice.checked=nationality;
    root.replaceChildren(toggle,
      h('p',{class:'set-note'},'Opt in to view rankings and upload verified ranked results. Your generated name and scores are public. Offline progress is not uploaded.'),
      ...(choosing&&!preferences.enabled?[h('label',{},choice,'Show my Chess.com country flag publicly'),
        button('Join leaderboard','join',()=>run(async()=>{await client.optIn(nationality);choosing=false;await syncLeaderboardCountry(client,await client.credentials());}))]:[]),
      h('label',{},flag,'Show nationality'),
      h('p',{class:'set-note'},'Your Chess.com username stays on your device. Turning nationality off removes the online flag when the service is reachable.'),
      preferences.pendingCountryRemoval&&h('p',{class:'set-note'},'Flag removal is pending. Retry when online.'),
      preferences.pendingCountryRemoval&&button('Retry flag removal','retry-country',()=>run(()=>syncLeaderboardCountry(client,player))),
      h('p',{class:'set-note'},preferences.enabled?'Only explicitly started ranked play uploads results. Turning leaderboards off also deletes your online player and records.':'Opted out: viewing and uploads are disabled.'),
      preferences.pendingDeletion&&h('p',{role:'status',class:'set-note'},'Online deletion is pending. Your private key is kept only so deletion can be retried. Joining again is disabled until deletion succeeds.'),
      preferences.pendingDeletion&&button('Retry online deletion','retry-delete',()=>run(()=>client.retryDeletion())),
      h('p',{class:'set-note'},player?'Player: '+player.name:'No player key connected on this device.'),
      player&&button('Delete all online leaderboard data','delete',()=>{confirmDelete=true;paint();}),
      ...(confirmDelete?[h('p',{class:'set-note'},'Permanently delete the connected player, scores and country? This also opts you out and discards unsent results.'),
        button('Delete my online records','confirm-delete',()=>run(async()=>{await client.removePlayer();confirmDelete=false;message='Online leaderboard records deleted.';})),
        button('Cancel','cancel-delete',()=>{confirmDelete=false;paint();})]:[]),
      h('p',{class:'set-note'},'If you cleared your key elsewhere, that key is needed to identify and delete the old online player. Removing the extension alone cannot delete online records.'),
      h('a',{href:url('PRIVACY.md'),target:'_blank',rel:'noopener noreferrer'},'Privacy policy'),
      message&&h('p',{role:'status',class:'set-note'},message));
  };
  const refresh=async()=>{
    try {preferences=await client.preferences();player=await client.credentials();paint();}
    catch(error){root.replaceChildren(h('p',{role:'alert',class:'set-note'},error.message));}
  };
  paint();refresh();return root;
}
