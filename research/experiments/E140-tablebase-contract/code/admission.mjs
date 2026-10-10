import {openResearchSource} from '../../../data-policy.mjs';
// Metadata admission only: no fetch, filesystem table reader, or position query.
export async function checkSourceRegistration(url){
 const parsed=new URL(url);if(parsed.protocol!=='https:'||parsed.username||parsed.password)throw Error('Expected public HTTPS source URL');
 try{const source=await openResearchSource(url,{purpose:'collect'});return {status:'format-admission-unavailable',reason:'Current shared loader has no tablebase format; an approved game source cannot authorize tablebase data.',receipt:source.receipt};}
 catch(e){if(!e.message.startsWith('Research data prohibited:'))throw e;return {status:'source-admission-unavailable',reason:e.message,receipt:null};}
}
