// Bind a Git archive's newline representation to recorded mixed-EOL checkout
// bytes. This accepts only newline representation changes, never source edits.
import {sha256} from './data-policy.mjs';
export function lineEndingBinding(recorded,archived){
  const text=recorded.toString('utf8'),lf=text.replaceAll('\r\n','\n');if(lf!==archived.toString('utf8').replaceAll('\r\n','\n'))throw Error('Archive source differs beyond newline representation');
  let line=0;const ranges=[];for(const match of text.matchAll(/\r?\n/g)){line++;if(match[0]==='\r\n'){const last=ranges.at(-1);if(last&&last[1]===line-1)last[1]=line;else ranges.push([line,line]);}}
  return{checkoutSha256:sha256(recorded),archiveSha256:sha256(archived),canonicalLfSha256:sha256(lf),crlfLineRanges:ranges};
}
export function recordSourceRepresentation(recorded){const canonical=Buffer.from(recorded.toString('utf8').replaceAll('\r\n','\n')),binding=lineEndingBinding(recorded,canonical);return{checkoutSha256:binding.checkoutSha256,canonicalLfSha256:binding.canonicalLfSha256,crlfLineRanges:binding.crlfLineRanges};}
export function verifySourceRepresentation(archived,expected,representation){return verifyArchivedSource(archived,expected,{...representation,archiveSha256:sha256(archived)});}
export function verifyArchivedSource(archived,expected,binding){
  const normalized=archived.toString('utf8').replaceAll('\r\n','\n');
  if(!binding||binding.checkoutSha256!==expected||sha256(archived)!==binding.archiveSha256||sha256(normalized)!==binding.canonicalLfSha256||!Array.isArray(binding.crlfLineRanges))throw Error('Unbound source newline equivalence');
  const lines=normalized.split('\n'),crlf=new Set();let last=0;
  for(const pair of binding.crlfLineRanges){if(!Array.isArray(pair)||pair.length!==2||pair.some(n=>!Number.isInteger(n))||pair[0]<=last||pair[1]<pair[0]||pair[1]>=lines.length)throw Error('Invalid recorded newline ranges');for(let i=pair[0];i<=pair[1];i++)crlf.add(i);last=pair[1];}
  const reconstructed=lines.map((text,i)=>i===lines.length-1?text:text+(crlf.has(i+1)?'\r\n':'\n')).join('');if(sha256(reconstructed)!==expected)throw Error('Recorded source bytes cannot be exactly reconstructed');
  return{archiveSha256:sha256(archived),recordedCheckoutSha256:expected,canonicalLfSha256:binding.canonicalLfSha256,exactRecordedBytesReconstructible:true};
}
