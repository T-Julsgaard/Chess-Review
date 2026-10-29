import {COUNTRY_CODE_TO_FLAG,countryNameForId,flagCodeForCountryId} from '../../flags.js';

export const LEADERBOARD_NATIONALITIES=Object.freeze(Object.keys(COUNTRY_CODE_TO_FLAG)
  .filter(code=>countryNameForId(code)).map(code=>Object.freeze({code,name:countryNameForId(code)}))
  .sort((a,b)=>a.name.localeCompare(b.name,'en')));

export function leaderboardNationality(value) {
  if(value==null||value===false||value==='none')return null;
  if(typeof value!=='string'||!Object.hasOwn(COUNTRY_CODE_TO_FLAG,value.toUpperCase()))throw Error('Choose a nationality or “Don’t show nationality”.');
  return value.toUpperCase();
}

// A native select keeps keyboard navigation and type-to-find available. The
// selected flag uses the same bundled artwork as public leaderboard rows.
export function nationalityPicker({document,url=p=>p,value='',disabled=false,onChange=()=>{},attributes={}}) {
  const root=document.createElement('label');root.className='leaderboard-nationality-picker';
  const label=document.createElement('span');label.className='leaderboard-field-label';label.textContent='Nationality';
  const field=document.createElement('span');field.className='leaderboard-nationality-field';
  const avatar=document.createElement('span');avatar.className='leaderboard-nationality-preview';avatar.setAttribute('aria-hidden','true');
  const select=document.createElement('select');select.className='set-select';select.setAttribute('aria-label','Nationality');select.disabled=disabled;
  for(const [key,entry] of Object.entries(attributes))select.setAttribute(key,entry);
  const option=(code,name)=>{const node=document.createElement('option');node.value=code;node.textContent=name;return node;};
  const placeholder=option('','Choose nationality');placeholder.disabled=true;
  select.append(placeholder,option('none','Don’t show nationality'),...LEADERBOARD_NATIONALITIES.map(({code,name})=>option(code,name)));
  select.value=value;
  const paint=()=>{
    const code=select.value!=='none'&&select.value?flagCodeForCountryId(select.value):null;
    if(code){const img=document.createElement('img');img.src=url('flags/'+code+'.svg');img.alt='';avatar.replaceChildren(img);}
    else {const icon=document.createElement('span');icon.className='leaderboard-avatar leaderboard-placeholder';avatar.replaceChildren(icon);}
  };
  select.addEventListener('change',()=>{paint();onChange(select.value);});paint();
  field.append(avatar,select);root.append(label,field);return root;
}
