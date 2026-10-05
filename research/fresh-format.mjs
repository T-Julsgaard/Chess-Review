// E007's frozen format/selection mechanics. No network and no model fitting.
import {createHash} from 'node:crypto';
import {zstdDecompressSync} from 'node:zlib';
import {Chess} from '../lib/chess.js';
export const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const order=(a,b)=>a<b?-1:a>b?1:0;
export function firstFrame(bytes){
  let start=0;
  for(;;){
    if(start+5>bytes.length)return null;
    const magic=bytes.readUInt32LE(start);
    if(magic>=0x184d2a50&&magic<=0x184d2a5f){if(start+8>bytes.length)return null;start+=8+bytes.readUInt32LE(start+4);continue;}
    if(magic!==0xfd2fb528)throw Error('Unsupported Zstandard magic');break;
  }
  const descriptor=bytes[start+4],single=Boolean(descriptor&32),fcs=descriptor>>>6;
  if(descriptor&8)throw Error('Reserved Zstandard descriptor');
  let pos=start+5+(single?0:1)+[0,1,2,4][descriptor&3]+(fcs===0?(single?1:0):[0,2,4,8][fcs]);
  if(pos>bytes.length)return null;
  for(;;){
    if(pos+3>bytes.length)return null;
    const block=bytes.readUIntLE(pos,3),last=block&1,type=(block>>>1)&3,size=block>>>3;
    if(type===3||size>131072)throw Error('Invalid Zstandard block');
    pos+=3+(type===1?1:size);if(pos>bytes.length)return null;
    if(last){pos+=(descriptor&4)?4:0;if(pos>bytes.length)return null;break;}
  }
  const frame=bytes.subarray(start,pos),decoded=zstdDecompressSync(frame,{maxOutputLength:64*1024*1024});
  return{frame,decoded,start,end:pos};
}
export function recordsIn(decoded){
  const marker=Buffer.from('[Event "'),starts=[];let pos=0;
  while((pos=decoded.indexOf(marker,pos))!==-1){if(pos===0||decoded[pos-1]===10)starts.push(pos);pos+=marker.length;}
  // The last record may span the next frame; discard it conservatively.
  return starts.slice(0,-1).map((start,i)=>({start,end:starts[i+1]}));
}
export function tagsFor(bytes){
  const text=new TextDecoder('utf-8',{fatal:true}).decode(bytes),tags={};
  for(const m of text.matchAll(/^\[(\w+) "((?:\\.|[^"\\])*)"\]\r?$/gm)){
    if(Object.hasOwn(tags,m[1]))throw Error('Duplicate PGN tag');
    tags[m[1]]=m[2].replace(/\\(["\\])/g,'$1');
  }
  return{tags,text};
}
export function metadata(bytes,month){
  const {tags,text}=tagsFor(bytes),date=tags.UTCDate||tags.Date,id=tags.Site?.match(/^https:\/\/lichess\.org\/([A-Za-z0-9]{8})$/)?.[1];
  if(tags.Event!=='Rated Blitz game')throw Error('not-blitz');
  if(tags.FEN||tags.SetUp||(tags.Variant&&tags.Variant!=='Standard'))throw Error('nonstandard-setup');
  if(!id||!/^\d{4}\.\d{2}\.\d{2}$/.test(date||'')||date.slice(0,7).replace('.','-')!==month||!['1-0','0-1','1/2-1/2'].includes(tags.Result))throw Error('invalid-origin-result');
  if(!/^\d+\+\d+$/.test(tags.TimeControl||''))throw Error('unsupported-clock');
  const players=['White','Black'].map((side,i)=>{
    const rating=Number(tags[side+'Elo']),id=tags[side]?.toLowerCase();
    if(!/^\d+$/.test(tags[side+'Elo']||'')||rating<400||rating>3500||!/^[a-z0-9_-]{2,30}$/.test(id||''))throw Error('unknown-rating-identity');
    return{id,rating,color:i?'b':'w'};
  });
  if(players[0].id===players[1].id)throw Error('duplicate-identity');
  return{id,source:tags.Site,sourceMonth:month,date,result:tags.Result,timeControl:tags.TimeControl,category:'blitz',players,text};
}
export function normalize(bytes,month,locator){
  const {text,...meta}=metadata(bytes,month),chess=new Chess();chess.loadPgn(text,{strict:true});
  if(text.trim().match(/(?:^|\s)(1-0|0-1|1\/2-1\/2|\*)$/)?.[1]!==meta.result)throw Error('PGN termination/header mismatch');
  const moves=chess.history({verbose:true}).map(m=>m.from+m.to+(m.promotion||''));
  if(moves.length<20||moves.length>400)throw Error('length-outside-domain');
  const board=new Chess(),decisions={w:0,b:0};
  for(const move of moves){if(board._moves().length>1)decisions[board.turn()]++;board.move({from:move.slice(0,2),to:move.slice(2,4),promotion:move[4]});}
  if(decisions.w<10||decisions.b<10)throw Error('too-few-decisions');
  return{...meta,moves,decisionCounts:decisions,locator:{...locator,sha256:digest(bytes)}};
}
export function selectCohort(frames,excluded,perMonth=300){
  const excludedGames=new Set(excluded.gameIds),excludedPlayers=new Set(excluded.playerIds),usedGames=new Set(),usedPlayers=new Set(),selected=[],counts={};
  const reject=why=>{counts[why]=(counts[why]||0)+1;};
  for(const frame of frames){
    const pool=[];
    for(const locator of recordsIn(frame.decoded)){
      const bytes=frame.decoded.subarray(locator.start,locator.end);
      try{const meta=metadata(bytes,frame.month);pool.push({meta,locator,bytes,hash:digest('D002-select-v1:'+meta.id)});}catch(e){reject(e.message);}
    }
    pool.sort((a,b)=>order(a.hash,b.hash)||order(a.meta.id,b.meta.id));
    const month=[];
    for(const item of pool){
      if(month.length===perMonth)break;
      const m=item.meta;
      if(excludedGames.has(m.id)||m.players.some(p=>excludedPlayers.has(p.id))){reject('D001-overlap');continue;}
      if(usedGames.has(m.id)||m.players.some(p=>usedPlayers.has(p.id))){reject('repeated-player-game');continue;}
      try{
        const game=normalize(item.bytes,frame.month,{artifact:frame.name,...item.locator});
        month.push(game);usedGames.add(game.id);game.players.forEach(p=>usedPlayers.add(p.id));
      }catch{reject('ineligible-or-illegal-moves');}
    }
    if(month.length!==perMonth)throw Error('Insufficient unique eligible games in '+frame.month);
    month.sort((a,b)=>order(digest('D002-split-v1:'+a.id),digest('D002-split-v1:'+b.id)));
    const train=Math.floor(perMonth*.5),validation=Math.floor(perMonth/6);
    month.forEach((g,i)=>selected.push({...g,split:i<train?'train':i<train+validation?'validation':'test'}));
    counts[frame.month+':complete-records']=recordsIn(frame.decoded).length;
  }
  return{games:selected,exclusions:counts};
}
export function validateFresh(manifest,records,hashes){
  const provenance=manifest.provenance,sources=records.get(manifest.sourceRecord),excluded=records.get(provenance.exclusions),old=records.get(provenance.exclusionInput);
  if(!old||hashes[provenance.exclusionInput]!==excluded?.inputSha256)throw Error('D001 exclusion dependency missing or changed');
  if(sources.sources.map(s=>s.month).join()!=='2026-06,2026-07,2026-08'||sources.sources.some(s=>s.frames.length!==1))throw Error('Fresh cohort requires one prefix frame per registered month');
  const expected={inputSha256:hashes[provenance.exclusionInput],gameIds:old.map(g=>g.id).sort(),playerIds:old.flatMap(g=>g.players.map(p=>p.id)).sort()};
  if(JSON.stringify(expected)!==JSON.stringify(excluded))throw Error('Exclusion identities differ from D001');
  const frames=[];
  for(const source of sources.sources)for(const frame of source.frames){
    const decoded=records.get(frame.artifact),entry=manifest.artifacts[frame.artifact];
    if(!Buffer.isBuffer(decoded)||entry?.kind!=='raw-pgn-zstd'||frame.start!==Buffer.from(frame.leadingMetadataHex||'','hex').length||frame.start+frame.bytes>8*1024*1024||frame.bytes!==entry.bytes||frame.sha256!==entry.sha256||frame.decodedSha256!==entry.uncompressedSha256)throw Error('Unbound raw frame');
    frames.push({name:frame.artifact,month:source.month,decoded});
  }
  const rebuilt=selectCohort(frames,excluded),games=records.get(manifest.normalized);
  if(JSON.stringify(rebuilt.games)!==JSON.stringify(games)||JSON.stringify(rebuilt.exclusions)!==JSON.stringify(provenance.exclusionCounts))throw Error('Fresh normalization, selection or split differs');
  return true;
}
