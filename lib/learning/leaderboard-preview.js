// Tab-local test data only. This module never writes browser storage or sends data.
export const PREVIEW_MAX_BYTES=1024*1024;
const MODES=['solve-puzzle','timeAttack','knockout'];
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
  if(!header||header.length<3||header.length>4||new Set(header).size!==header.length||
    !['mode','player','solved'].every(key=>header.includes(key))||header.some(key=>!['mode','player','solved','is_you'].includes(key)))throw Error('CSV columns: mode, player, solved, is_you (optional).');
  if(!rows.length)throw Error('CSV has no records.');
  const boards=Object.fromEntries(MODES.map(mode=>[mode,[]])),seen=new Set(),own=new Set();
  rows.forEach((row,index)=>{
    const get=key=>(row[header.indexOf(key)]||'').trim(),mode=get('mode'),name=get('player'),raw=get('solved'),you=get('is_you').toLowerCase();
    if(row.length!==header.length||!MODES.includes(mode)||!name||name.length>40||/[\u0000-\u001f\u007f]/.test(name)||
      !/^\d+$/.test(raw)||!Number.isSafeInteger(Number(raw))||Number(raw)>1000000||!['','0','1','false','true'].includes(you))throw Error('Invalid CSV record on line '+(index+2)+'.');
    const key=mode+':'+name;if(seen.has(key))throw Error('Duplicate player in '+mode+'.');seen.add(key);
    const isYou=you==='1'||you==='true';if(isYou&&own.has(mode))throw Error('Only one is_you player is allowed per mode.');if(isYou)own.add(mode);
    boards[mode].push(Object.freeze({id:'preview-'+index,name,score:Number(raw),isYou}));
  });
  for(const mode of MODES)Object.freeze(boards[mode].sort((a,b)=>b.score-a.score||a.name.localeCompare(b.name)));
  return Object.freeze({boards:Object.freeze(boards),count:rows.length});
}

export function createLeaderboardPreview() {
  let data=null,controller=new AbortController(),version=0;
  const replace=value=>{controller.abort();controller=new AbortController();data=value;version++;};
  return {
    get active(){return !!data;},get count(){return data?.count||0;},get signal(){return controller.signal;},get version(){return version;},
    load(text){const parsed=parseLeaderboardCsv(text);replace(parsed);return parsed.count;},
    clear(){replace(null);},
    list(mode,page){if(!data||!MODES.includes(mode)||!Number.isInteger(page)||page<1)throw Error('Preview is unavailable.');
      const rows=data.boards[mode];return {rows:rows.slice((page-1)*10,page*10),hasNext:rows.length>page*10};}
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
  clear.onclick=()=>{importSequence++;leaderboardPreview.clear();onChange();};
  input.onchange=async()=>{
    const file=input.files?.[0];if(!file)return;
    const sequence=++importSequence;upload.disabled=true;
    try {
      if(!/\.csv$/i.test(file.name))throw Error('Choose a .csv file.');
      if(file.size>PREVIEW_MAX_BYTES)throw Error('CSV must be smaller than 1 MB.');
      const text=await file.text();if(sequence!==importSequence)return;
      leaderboardPreview.load(text);onChange();
    } catch(error){if(sequence===importSequence)onError(error.message);}
    finally {input.value='';upload.disabled=false;}
  };
  root.append(upload,clear,status,input);return root;
}
