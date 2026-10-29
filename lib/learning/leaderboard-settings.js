import {LeaderboardClient} from './leaderboard-client.js';
import {syncLeaderboardCountry} from './leaderboard-country.js';
import {nationalityPicker} from './leaderboard-nationality.js';

const clients=new WeakMap();
export function leaderboardSettingsControls({document,storage,onChange=()=>{},onError=()=>{},url=p=>p,client:providedClient}) {
  if(providedClient)clients.set(storage,providedClient);
  if(!clients.has(storage))clients.set(storage,new LeaderboardClient(storage));
  const client=clients.get(storage),root=document.createElement('div');root.className='set-leaderboard-settings';
  let preferences,player,busy=false,choosing=false,nationality='',confirmDelete=false,message='',failed=false;
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
  const run=async(action,success='')=>{
    if(busy)return;
    const focus=document.activeElement?.getAttribute('data-leaderboard-setting');
    busy=true;message='';failed=false;paint();
    try {await action();message=success;}
    catch(error){message=error.message;failed=true;onError(error.message);}
    finally {
      try {await onChange();}catch(error){message=error.message;failed=true;onError(error.message);}
      busy=false;await refresh();
      if(focus)root.querySelector('[data-leaderboard-setting="'+focus+'"]:not(:disabled)')?.focus({preventScroll:true});
    }
  };
  const button=(text,key,fn,{kind='',disabled=false}={})=>h('button',{type:'button',class:'set-reset leaderboard-settings-button '+kind,
    'data-leaderboard-setting':key,disabled:busy||disabled,onclick:fn},text);
  const note=text=>h('p',{class:'set-note'},text);
  const paint=()=>{
    root.setAttribute('aria-busy',String(busy));
    if(!preferences){root.replaceChildren(note('Loading leaderboard settings…'));return;}
    if(client.preview){root.replaceChildren(note('Clear test data in Developer debugger to edit your leaderboard settings.'));return;}
    const enabled=preferences.enabled,pending=preferences.pendingDeletion;
    root.dataset.state=pending?'pending':enabled?'enabled':'off';
    const picker=nationalityPicker({document,url,value:preferences.nationality||'none',disabled:busy,
      attributes:{'data-leaderboard-setting':'nationality'},onChange:value=>run(async()=>{
        await client.setNationality(value);await syncLeaderboardCountry(client,await client.credentials());
      },'Nationality saved.')});
    const joinPicker=nationalityPicker({document,url,value:nationality,disabled:busy,
      attributes:{'data-leaderboard-setting':'join-nationality'},onChange:value=>{
        nationality=value;root.querySelector('[data-leaderboard-setting=join]').disabled=busy||!nationality;
      }});
    const confirmation=h('div',{class:'leaderboard-settings-confirm',role:'group','aria-label':'Confirm leaderboard deletion'},
      h('strong',{},'Delete your online records?'),note('This removes your player, scores and flag, and opts you out. Your offline progress is kept.'),
      button(busy?'Deleting…':'Delete & opt out','confirm-delete',()=>run(async()=>{
        await client.removePlayer();confirmDelete=false;
      },'Online leaderboard records deleted.'),{kind:'is-danger'}),
      button('Keep my records','cancel-delete',()=>{confirmDelete=false;paint();}));
    root.replaceChildren(
      h('div',{class:'leaderboard-settings-overview'},
        h('div',{class:'leaderboard-settings-heading'},h('strong',{},enabled?(player?.name||'Leaderboards'):'Leaderboards'),
          h('span',{class:'leaderboard-settings-badge'},pending?'Deletion pending':enabled?'Joined':'Off')),
        note(pending?'You’re opted out. Retry to finish removing your online records.':enabled
          ?player?'Your verified ranked results are public.':'Connect a player key from a leaderboard to save ranked scores.'
          :'Compare scores and play ranked puzzles. Your offline progress stays private.')),
      pending?button('Retry deletion','retry-delete',()=>run(()=>client.retryDeletion(),'Online leaderboard records deleted.'),{kind:'is-primary'}):
        enabled?h('div',{class:'leaderboard-settings-profile'},picker,
          note(preferences.nationality?'Your chosen flag appears next to your name.':'Your nationality is hidden.'),
          preferences.pendingCountryRemoval&&h('div',{class:'leaderboard-settings-pending',role:'status'},note('Flag removal is pending.'),
            button('Retry removal','retry-country',()=>run(()=>syncLeaderboardCountry(client,player),'Nationality hidden.')))):
          choosing?h('div',{class:'leaderboard-settings-join'},joinPicker,
            note('By joining, you consent to Thomas Julsgaard publishing your generated name, ranked scores and any nationality you choose. You can withdraw in these settings.'),
            button(busy?'Joining…':'Join leaderboard','join',()=>run(async()=>{
              await client.optIn(nationality);choosing=false;await syncLeaderboardCountry(client,await client.credentials());
            },'You’ve joined the leaderboards.'),{kind:'is-primary',disabled:!nationality}),
            button('Cancel','cancel-join',()=>{choosing=false;paint();})):
            button('Join leaderboards','enabled',()=>{choosing=true;message='';paint();root.querySelector('select')?.focus();},{kind:'is-primary'}),
      !pending&&(enabled||player)&&(confirmDelete?confirmation:
        h('div',{class:'leaderboard-settings-leave'},button('Opt out & delete data','delete',()=>{
          confirmDelete=true;message='';paint();root.querySelector('[data-leaderboard-setting=confirm-delete]')?.focus();
        },{kind:'is-danger'}))),
      (message||busy)&&h('p',{role:failed?'alert':'status',class:'leaderboard-settings-message'},busy?'Saving…':message),
      h('div',{class:'leaderboard-settings-footer'},
        h('details',{},h('summary',{},'About your data'),
          h('p',{class:'set-note'},'Data controller: Thomas Julsgaard. Privacy contact: ',h('a',{href:'mailto:Thomas@Julsgaard.dev'},'Thomas@Julsgaard.dev'),'.'),
          note('Only ranked play sends results to our Cloudflare-hosted service. Your games, Chess.com username and offline puzzle history stay on your device.'),
          note('Opting out deletes online records. If the service is unavailable, deletion stays pending and can be retried. Keep your player key private; removing the extension alone cannot delete online records.')),
        h('a',{href:url('PRIVACY.md'),target:'_blank',rel:'noopener noreferrer'},'Privacy policy ↗')));
  };
  const refresh=async()=>{
    try {preferences=await client.preferences();player=await client.credentials();paint();}
    catch(error){root.replaceChildren(h('p',{role:'alert',class:'set-note'},error.message));}
  };
  paint();refresh();return root;
}
