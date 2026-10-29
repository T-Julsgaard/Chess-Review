// Tab-local test data only. This module never writes browser storage or sends data.
import {LEADERBOARD_NAME_MAX} from './leaderboard-name.js';
export const PREVIEW_MAX_BYTES=1024*1024;
const MODES=['solve-puzzle','timeAttack','knockout'];
export const LEADERBOARD_PREVIEW_STATES=[
  ['rankings','Rankings'],['coming-soon','Coming soon'],['loading','Loading rankings'],['empty','Empty rankings'],
  ['saved','Score saved'],['syncing','Score syncing'],['sync-failed','Sync needs attention'],
  ['offline','Offline with saved rankings'],['unavailable','Rankings unavailable'],
  ['rate-limited','Too many requests'],['capacity','Service at capacity'],['connection-error','Player key rejected'],
  ['disconnected','Player disconnected'],['connecting','Player connecting'],['connected','Player connected'],
  ['confirm-delete','Confirm record deletion'],['deleted','Records deleted']
];
const SAMPLE_CSV='mode,player,solved,is_you,country\n'+MODES.flatMap(mode=>Array.from({length:30},(_,i)=>
  [mode,'Knight-preview'+String(i+1).padStart(2,'0'),mode==='solve-puzzle'?1800-i*35:mode==='timeAttack'?72-i:46-i,i===3?1:0,
    i%5===2?'':['DK','US','XE','DE','FR','CA'][i%6]].join(','))).join('\n');
export function parseLeaderboardCsv(text) {
  if(typeof text!=='string'||new TextEncoder().encode(text).length>PREVIEW_MAX_BYTES)throw Error('CSV must be smaller than 1 MB.');
  text=text.replace(/^\uFEFF/,'');
  const rows=[];let row=[],field='',quoted=false,closed=false;
  const cell=()=>{row.push(field);field='';closed=false;};
  const line=()=>{cell();if(row.some(value=>value.trim()))rows.push(row);row=[];if(rows.length>3001)throw Error('CSV supports up to 3,000 records.');};
  for(let i=0;i<text.length;i++) {
    const c=text[i];
    if(quoted){if(c==='"'){if(text[i+1]==='"'){field+='"';i++;}else {quoted=false;closed=true;}}else field+=c;continue;}
    if(c===','){cell();continue;}
    if(c==='\n'||c==='\r'){if(c==='\r'&&text[i+1]==='\n')i++;line();continue;}
    if(c==='"'){if(field||closed)throw Error('Invalid CSV quotes.');quoted=true;continue;}
    if(closed){if(c===' '||c==='\t')continue;throw Error('Invalid CSV quotes.');}
    field+=c;
  }
  if(quoted)throw Error('Invalid CSV quotes.');if(field||row.length||closed)line();
  const header=rows.shift()?.map(value=>value.trim().toLowerCase());
  if(!header||header.length<3||header.length>5||new Set(header).size!==header.length||
    !['mode','player','solved'].every(key=>header.includes(key))||header.some(key=>!['mode','player','solved','is_you','country'].includes(key)))throw Error('CSV columns: mode, player, solved, is_you (optional), country (optional).');
  if(!rows.length)throw Error('CSV has no records.');
  const boards=Object.fromEntries(MODES.map(mode=>[mode,[]])),seen=new Set(),own=new Set();
  rows.forEach((row,index)=>{
    const get=key=>(row[header.indexOf(key)]||'').trim(),mode=get('mode'),name=get('player'),raw=get('solved'),you=get('is_you').toLowerCase(),country=get('country');
    if(row.length!==header.length||!MODES.includes(mode)||!name||name.length>LEADERBOARD_NAME_MAX||/[\u0000-\u001f\u007f]/.test(name)||
      !/^\d+$/.test(raw)||!Number.isSafeInteger(Number(raw))||Number(raw)>1000000||!['','0','1','false','true'].includes(you)||
      country.length>12||!/^[a-zA-Z0-9_-]*$/.test(country))throw Error('Invalid CSV record on line '+(index+2)+'.');
    const key=mode+':'+name;if(seen.has(key))throw Error('Duplicate player in '+mode+'.');seen.add(key);
    const isYou=you==='1'||you==='true';if(isYou&&own.has(mode))throw Error('Only one is_you player is allowed per mode.');if(isYou)own.add(mode);
    boards[mode].push(Object.freeze({id:'preview-'+index,name,score:Number(raw),isYou,...(country?{country}:{})}));
  });
  for(const mode of MODES)Object.freeze(boards[mode].sort((a,b)=>b.score-a.score||a.name.localeCompare(b.name)));
  return Object.freeze({boards:Object.freeze(boards),count:rows.length});
}

export function createLeaderboardPreview() {
  let data=null,controller=new AbortController(),version=0,scenario='rankings',mode='solve-puzzle',notice='';
  let pending={},bonuses={};
  const replace=value=>{controller.abort();controller=new AbortController();data=value;version++;};
  const validateMode=value=>{if(!MODES.includes(value))throw Error('Invalid preview mode.');};
  const ensureData=()=>{if(!data)data=parseLeaderboardCsv(SAMPLE_CSV);};
  const reset=()=>{scenario='rankings';notice='';pending={};bonuses={};};
  return {
    get active(){return !!data;},get count(){return data?.count||0;},get signal(){return controller.signal;},get version(){return version;},
    get scenario(){return scenario;},get mode(){return mode;},
    load(text){const parsed=parseLeaderboardCsv(text);reset();replace(parsed);return parsed.count;},
    sample(selectedMode=mode){validateMode(selectedMode);reset();mode=selectedMode;replace(parseLeaderboardCsv(SAMPLE_CSV));},
    clear(){reset();replace(null);},
    setScenario(value,selectedMode=mode){
      validateMode(selectedMode);if(!LEADERBOARD_PREVIEW_STATES.some(([key])=>key===value))throw Error('Invalid preview state.');
      ensureData();mode=selectedMode;scenario=value;notice='';pending[mode]=['syncing','sync-failed'].includes(value)?3:0;replace(data);
    },
    action(value,selectedMode=mode){
      validateMode(selectedMode);
      if(!['solve','start-sync','finish-sync','fail-sync','retry-sync','discard','refresh','connect','disconnect','confirm-delete','delete','cancel-delete','get-key','play'].includes(value))throw Error('Invalid preview action.');
      ensureData();mode=selectedMode;notice='';
      if(['syncing','sync-failed'].includes(scenario))pending[mode] ||= 3;
      if(value==='solve'){pending[mode]=(pending[mode]||0)+1;scenario='syncing';}
      else if(value==='start-sync'||value==='retry-sync'){pending[mode] ||= 3;scenario='syncing';}
      else if(value==='fail-sync'){pending[mode] ||= 3;scenario='sync-failed';}
      else if(value==='finish-sync'){bonuses[mode]=(bonuses[mode]||0)+(pending[mode]||0);pending[mode]=0;scenario='saved';}
      else if(value==='discard'){pending[mode]=0;scenario='saved';}
      else if(value==='refresh'&&['offline','unavailable','rate-limited','capacity'].includes(scenario))scenario='rankings';
      else if(value==='refresh'&&scenario==='connection-error')scenario='disconnected';
      else if(value==='connect'||value==='cancel-delete')scenario='connected';
      else if(value==='disconnect')scenario='disconnected';
      else if(value==='confirm-delete')scenario='confirm-delete';
      else if(value==='delete'){pending[mode]=0;bonuses[mode]=0;scenario='deleted';notice='Test records deleted.';}
      else if(value==='get-key')notice='Test player key ready. Select Connect to preview a connected player.';
      else if(value==='play')notice='Ranked-play button preview. Playing a real ranked run requires the online service.';
      replace(data);
    },
    view(selectedMode=mode){
      if(!data)return null;validateMode(selectedMode);
      const own=data.boards[selectedMode].find(row=>row.isYou),score=(own?.score||0)+(bonuses[selectedMode]||0);
      const waiting=['syncing','sync-failed'].includes(scenario)?pending[selectedMode]||3:0;
      const personal=['saved','syncing','sync-failed','connected','confirm-delete'].includes(scenario)
        ?{score:score+waiting,confirmed:score,syncing:waiting>0,blocked:scenario==='sync-failed'}:null;
      const account=['disconnected','connecting','connected','confirm-delete','deleted','connection-error'].includes(scenario);
      return {scenario,configured:scenario!=='coming-soon',loading:scenario==='loading',personal,account,notice,
        player:account&&['connected','confirm-delete'].includes(scenario)?{id:own?.id||'preview-player',name:own?.name||'Knight-preview'}:null,
        connecting:scenario==='connecting',confirmDelete:scenario==='confirm-delete'};
    },
    list(mode,page){if(!data||!MODES.includes(mode)||!Number.isInteger(page)||page<1)throw Error('Preview is unavailable.');
      const errors={unavailable:'Leaderboard unavailable. Try again shortly.','rate-limited':'Too many requests. Try again in a minute.',capacity:'Service capacity reached. Please try again later.','connection-error':'Reconnect your player key.'};
      if(errors[scenario])throw Error(errors[scenario]);
      const rows=['coming-soon','loading','empty','deleted'].includes(scenario)?[]:data.boards[mode]
        .map(row=>row.isYou?{...row,score:row.score+(bonuses[mode]||0)}:row).sort((a,b)=>b.score-a.score||a.name.localeCompare(b.name));
      return {rows:rows.slice((page-1)*10,page*10),hasNext:rows.length>page*10,
        ...(scenario==='offline'?{stale:true,message:'Connection lost. Try again shortly.'}:{})};}
  };
}
export const leaderboardPreview=createLeaderboardPreview();
let importSequence=0;
export function leaderboardPreviewControls({document,onChange=()=>{},onError=()=>{}}) {
  const root=document.createElement('div');root.className='set-leaderboard-preview';
  const input=document.createElement('input');input.type='file';input.accept='.csv,text/csv';input.hidden=true;input.dataset.debug='leaderboard-csv-file';
  const upload=document.createElement('button');upload.className='set-reset';upload.textContent='Import leaderboard CSV';upload.dataset.debug='leaderboard-csv';upload.type='button';upload.onclick=()=>input.click();
  const clear=document.createElement('button');clear.className='set-reset';clear.textContent='Clear test data';clear.dataset.debug='leaderboard-csv-clear';clear.type='button';clear.disabled=!leaderboardPreview.active;
  const status=document.createElement('span');status.className='set-note';status.dataset.debug='leaderboard-csv-status';status.textContent=leaderboardPreview.active?`${leaderboardPreview.count} records · temporary`:'Temporary test data';
  const notify=options=>Promise.resolve(onChange(options)).catch(error=>onError(error.message));
  clear.onclick=()=>{importSequence++;leaderboardPreview.clear();notify();};
  input.onchange=async()=>{
    const file=input.files?.[0];if(!file)return;
    const sequence=++importSequence;upload.disabled=true;
    try {
      if(!/\.csv$/i.test(file.name))throw Error('Choose a .csv file.');
      if(file.size>PREVIEW_MAX_BYTES)throw Error('CSV must be smaller than 1 MB.');
      const text=await file.text();if(sequence!==importSequence)return;
      leaderboardPreview.load(text);await notify();
    } catch(error){if(sequence===importSequence)onError(error.message);}
    finally {input.value='';upload.disabled=false;}
  };
  const mode=document.createElement('select');mode.dataset.debug='leaderboard-preview-mode';
  for(const [value,label] of [['solve-puzzle','Solve a puzzle'],['timeAttack','Time attack'],['knockout','Knockout']]){
    const option=document.createElement('option');option.value=value;option.textContent=label;mode.append(option);
  }
  mode.value=leaderboardPreview.mode;
  const state=document.createElement('select');state.dataset.debug='leaderboard-preview-state';
  for(const [value,label] of LEADERBOARD_PREVIEW_STATES){const option=document.createElement('option');option.value=value;option.textContent=label;state.append(option);}
  state.value=leaderboardPreview.scenario;
  const field=(label,select)=>{const node=document.createElement('label');node.className='set-leaderboard-field';node.append(document.createTextNode(label),select);return node;};
  const button=(label,key,fn)=>{const node=document.createElement('button');node.type='button';node.className='set-reset';node.textContent=label;node.dataset.debug='leaderboard-'+key;
    node.onclick=()=>{importSequence++;fn();notify({mode:mode.value,open:true});};return node;};
  const sample=button('Load sample rankings','sample',()=>leaderboardPreview.sample(mode.value));
  const show=button('Show preview','preview-show',()=>leaderboardPreview.setScenario(state.value,mode.value));
  const actions=document.createElement('div');actions.className='set-leaderboard-actions';
  for(const [key,label] of [['solve','Simulate solve'],['start-sync','Start sync'],['finish-sync','Finish sync'],['fail-sync','Fail sync'],['retry-sync','Retry sync']])
    actions.append(button(label,key,()=>leaderboardPreview.action(key,mode.value)));
  const help=document.createElement('span');help.className='set-note';help.textContent='Local previews only. Account actions and sync do not upload data or change saved progress.';
  root.append(upload,sample,clear,status,input,field('Puzzle mode',mode),field('Preview state',state),show,actions,help);return root;
}
